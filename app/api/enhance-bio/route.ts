import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { rateLimit, sanitizeString } from '@/lib/security-utils';
import { adminAuth } from '@/lib/firebase-admin';

// Helper to provide a high-quality human-written template if AI fails
function getFallbackBio(interests: string, college: string, course: string) {
    const cleanInterests = interests ? interests.split(',').map((i: string) => i.trim()) : [];
    const interest = cleanInterests[0] || 'Learning';
    const interest2 = cleanInterests[1] || 'Growth';
    const col = college || 'University';
    const cour = course || 'Student';

    const templates = [
        `🎓 Student at ${col}. Aspiring ${cour} professional. Passionate about ${interest}. 💼📈`,
        `📚 ${cour} Major @ ${col}. Focused on ${interest} & ${interest2}. 🎯💡`,
        `Building my future in ${cour} at ${col}. 🏗️✨🚀`,
        `Professional ${cour} student @ ${col}. 🔬 Ready to innovate. 🌟`,
        `🎓 ${cour} student @ ${col}. Loves ${interest}. ✌️😊`,
        `Just a ${cour} student trying to build cool things. 🚀⚡💡`,
        `Vibing at ${col} 🏫. Into ${interest} and ${interest2}. ✨🎧🎶`,
        `${col} '26 | ${cour} | ${interest} 💻✨`,
        `${cour} • ${col} • ${interest} ⚡🚀`,
        `📍 ${col} | ${cour} | ${interest} 🌟🧠`,
        `Exploring the world of ${interest} at ${col}. 🌍💡🗺️`,
        `Turning coffee ☕ into code 💻. ${cour} undergrad @ ${col}. 🚀`
    ];

    // Filter templates based on what data we actually have
    const validTemplates = templates.filter(t => {
        if (!college && t.includes('${col}')) return false;
        if (!course && t.includes('${cour}')) return false;
        return true;
    });

    const pool = validTemplates.length > 0 ? validTemplates : [
        `Student passionate about ${interest}.`,
        `Learning and growing every day. ✨`,
        `${interest} enthusiast.`
    ];

    return pool[Math.floor(Math.random() * pool.length)];
}

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    const bio = sanitizeString(body.bio);
    const interests = sanitizeString(body.interests);
    const college = sanitizeString(body.college);
    const course = sanitizeString(body.course);

    try {
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        if (!rateLimit(ip, 10, 60000)) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        // Auth Check
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        try {
            await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
        } catch (e) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

        // If no API key, use fallback immediately
        if (!apiKey) {
            return NextResponse.json({ bio: getFallbackBio(interests, college, course) });
        }

        // --- Real AI Generation ---
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
            You are a professional profile bio generator for a student networking app.
            Rewrite or enhance the following bio to make it sound professional yet approachable, optimized for connecting with other students.
            
            Context:
            - Current Bio: "${bio || ''}"
            - Interests: "${interests || ''}"
            - College: "${college || ''}"
            - Course: "${course || ''}"

            Requirements:
            - If the current bio is empty, create a new one based on the context.
            - If the current bio exists, improve it and incorporate the interests/college context naturally.
            - Keep it concise (under 50 words).
            - Use 1-2 relevant emojis.
            - Do NOT add quotation marks.
            - Return ONLY the bio text.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ bio: text.trim() });

    } catch (error: any) {
        console.warn("Enhance AI failed, using fallback:", error.message);
        // CRITICAL FOR "WORKING FOREVER": 
        // If anything goes wrong (API down, invalid key, rate limits), 
        // we return a high-quality fallback instead of an error.
        return NextResponse.json({
            bio: getFallbackBio(interests, college, course),
            isFallback: true
        });
    }
}
