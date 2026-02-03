import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { rateLimit, sanitizeString } from '@/lib/security-utils';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(req: Request) {
    try {
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        if (!rateLimit(ip, 5, 60000)) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        // Auth Check (Objective 2)
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        try {
            await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
        } catch (e) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const bio = sanitizeString(body.bio);
        const interests = sanitizeString(body.interests);
        const college = sanitizeString(body.college);
        const course = sanitizeString(body.course);

        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

        // --- Smart Template Engine (Fallback or Primary if no Key) ---
        // This ensures variety and quality even without AI
        if (!apiKey) {
            console.log("Using Smart Template Engine");

            const cleanInterests = interests ? interests.split(',').map((i: string) => i.trim()) : [];
            const interest = cleanInterests[0] || 'Learning';
            const interest2 = cleanInterests[1] || 'Growth';
            const col = college || 'University';
            const cour = course || 'Student';

            const templates = [
                // 1. Professional / Student Focused (Subtle Emojis)
                `🎓 Student at ${col}. Aspiring ${cour} professional. Passionate about ${interest}. 💼📈`,
                `📚 ${cour} Major @ ${col}. Focused on ${interest} & ${interest2}. 🎯💡`,
                `Building my future in ${cour} at ${col}. 🏗️✨🚀`,
                `Professional ${cour} student @ ${col}. 🔬 Ready to innovate. 🌟`,

                // 2. Casual / Friendly (Fun Emojis)
                `🎓 ${cour} student @ ${col}. Loves ${interest}. ✌️😊`,
                `Just a ${cour} student trying to build cool things. 🚀⚡💡`,
                `Vibing at ${col} 🏫. Into ${interest} and ${interest2}. ✨🎧🎶`,
                `Living the ${cour} life at ${col}. ☕📚 & ${interest}.`,

                // 3. Minimalist (Clean Emojis)
                `${col} '26 | ${cour} | ${interest} 💻✨`,
                `${cour} • ${col} • ${interest} ⚡🚀`,
                `📍 ${col} | ${cour} | ${interest} 🌟🧠`,
                `${interest} enthusiast 🧠💡. ${col} student.`,

                // 4. Creative / Story (Expressive Emojis)
                `Exploring the world of ${interest} at ${col}. 🌍💡🗺️`,
                `Turning coffee ☕ into code 💻. ${cour} undergrad @ ${col}. 🚀`,
                `On a journey to master ${interest}. Studying at ${col}. 🚀🌈✨`,
                `Dreaming big in ${cour} @ ${col}. ✨🎨🌟`
            ];

            // Filter templates based on what data we actually have
            const validTemplates = templates.filter(t => {
                if (!college && t.includes('${col}')) return false;
                if (!course && t.includes('${cour}')) return false;
                return true;
            });

            // If we filtered everything out (rare), use a generic fallback
            const pool = validTemplates.length > 0 ? validTemplates : [
                `Student passionate about ${interest}.`,
                `Learning and growing every day. ✨`,
                `${interest} enthusiast.`
            ];

            // Pick a RANDOM template
            const randomTemplate = pool[Math.floor(Math.random() * pool.length)];

            return NextResponse.json({ bio: randomTemplate });
        }

        // --- Real AI Generation (If Key Exists) ---
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
        console.error("Enhance Bio Error:", error);
        return NextResponse.json(
            { error: 'Failed to generate bio' },
            { status: 500 }
        );
    }
}
