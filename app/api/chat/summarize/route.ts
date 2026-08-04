import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Initialize Gemini
// Note: In a real prod app, use process.env.GEMINI_API_KEY
// Assuming the user has set this up or we use a placeholder if missing.
// The user previously mentioned .env.local is open, implies keys might be there.
export async function POST(req: Request) {
    try {
        const { messages, context } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.warn("GEMINI_API_KEY is missing. Returning mock summary for development.");
            return NextResponse.json({
                summary: "Only you can see this message: \n\n**Warning: GEMINI_API_KEY is missing.** \n\nThis is a mock summary because the API key is not configured in `.env.local`. \n\n*   Please add `GEMINI_API_KEY=your_key` to your environment variables.\n*   This mock data simulates a successful response."
            });
        }

        // Initialize here to pick up env changes and catch auth errors
        const genAI = new GoogleGenerativeAI(apiKey);
        // Standard models (gemini-pro, gemini-1.5-flash) are returning 404 for this key.
        // gemini-2.0-flash-exp was found (but might be rate limited). Using it as fallback.
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        // Format messages for prompt
        const conversationText = messages.slice(-50).map((m: any) => {
            const sender = m.senderName || m.senderId || "Unknown";
            const text = m.text || (m.attachment ? "[Attachment]" : "");
            return `${sender}: ${text}`;
        }).join("\n");

        const prompt = `
            You are a helpful assistant summarising a group chat or conversation.
            Context: ${context || "General Chat"}
            
            Here are the last ${messages.length} messages:
            ---
            ${conversationText}
            ---
            
            Please provide a concise, bulleted summary of what was discussed. 
            Highlight key points, decisions made, or open questions. 
            Keep it casual but clear.
        `;

        // Retry Logic for Rate Limits (429)
        let result;
        let lastError;

        for (let i = 0; i < 3; i++) {
            try {
                if (i > 0) {
                    // Exponential backoff: 1000ms, 2000ms, 4000ms
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i - 1)));
                    console.log(`[Summarize] Retrying... Attempt ${i + 1}`);
                }

                result = await model.generateContent(prompt);
                break; // Success
            } catch (err: any) {
                console.warn(`[Summarize] Attempt ${i + 1} failed:`, err.message);
                lastError = err;
                // Only retry on 429 or 503 (Overloaded)
                if (!err.message.includes("429") && !err.message.includes("503")){
                    throw err; // Fatal error, don't retry
                }
            }
        }

        if (!result && lastError) throw lastError;

        if (!result) throw new Error("Failed to generate content after retries.");

        const response = result.response;
        const summary = response.text();

        console.log(`[Summarize] Success!`);
        return NextResponse.json({ summary });
    } catch (error: any) {
        console.warn("[Summarize] Error:", error);

        let errorMessage = error.message || String(error);
        if (errorMessage.includes("429") || errorMessage.includes("Quota")) {
            errorMessage = "AI is busy (Rate Limit Exceeded). Please try again later.";
        } else if (errorMessage.includes("404")) {
            errorMessage = "AI Model not found for this API Key.";
        }

        // Return detailed error for debugging
        return NextResponse.json({
            error: "Failed to generate summary",
            details: errorMessage
        }, { status: 500 });
    }
}
