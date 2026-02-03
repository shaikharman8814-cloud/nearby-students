import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testSmartReply() {
    console.log("🧪 Testing Smart Reply Logic Standalone...");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ GEMINI_API_KEY is missing in .env.local");
        return;
    }
    console.log("✅ API Key found (starts with: " + apiKey.substring(0, 5) + "...)");

    const candidates = [
        "gemini-1.5-flash-001",
        "gemini-1.5-flash-002",
        "gemini-1.5-pro-001",
        "gemini-1.5-pro-002",
        "gemini-1.0-pro",
        "gemini-1.0-pro-001",
        "gemini-1.5-flash-latest"
    ];

    const genAI = new GoogleGenerativeAI(apiKey);

    const lastMessage = "lets meet somwhere else";
    const context = "Private Chat with j star";

    const prompt = `
            You are a smart reply system for a chat app.
            Generate 3 short, natural, and polite reply suggestions for the following message.
            
            Context: ${context}
            Incoming Message: "${lastMessage}"
            
            Rules:
            - Max 3 replies.
            - Max 5-6 words per reply.
            - Keep it casual but polite.
            - NO explanations, just the replies in a JSON array format like ["Reply 1", "Reply 2"].
            - If the message is offensive, nonsensical, or media-only, return [].
        `;

    for (const modelName of candidates) {
        console.log(`\n🔎 Testing model: ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            console.log(`✅ SUCCESS with ${modelName}!`);
            console.log("Response:", text.substring(0, 100) + "...");
            return; // Exit on first success
        } catch (error: any) {
            console.log(`❌ Failed with ${modelName}: ${error.message.split('\n')[0]}`);
        }
    }
    console.log("\n❌ All models failed.");
}

testSmartReply();
