
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function debugGemini() {
    console.log("🔍 Debugging Gemini API...");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ GEMINI_API_KEY is missing from .env.local");
        return;
    }
    console.log("✅ API Key found (starts with):", apiKey.substring(0, 5) + "...");

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // Method 1: List Models (if supported by SDK helper, otherwise generic fetch)
        // Note: The SDK doesn't always expose listModels directly easily, so we try a direct fetch if SDK fails,
        // but let's try to verify model existence by running a dummy prompt on multiple candidates.

        const candidates = [
            "gemini-1.5-flash-001",
            "gemini-1.5-flash-002",
            "gemini-1.5-pro-001",
            "gemini-1.5-pro-002",
            "gemini-1.0-pro-001",
            "gemini-1.5-flash-8b",
            "gemini-1.5-flash-latest",
            "gemini-1.5-pro-latest",
            "gemini-1.0-pro",
            "gemini-1.0-pro-001"
        ];

        console.log("\n🧪 Testing Models:");

        for (const modelName of candidates) {
            process.stdout.write(`   - Testing ${modelName}... `);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello, are you there?");
                const response = result.response.text();
                console.log(`✅ SUCCESS! Response: "${response.substring(0, 20)}..."`);
            } catch (error: any) {
                if (error.message.includes("404")) {
                    console.log(`❌ 404 Not Found (Not available for this key/region)`);
                } else {
                    console.log(`❌ Error: ${error.message.split('\n')[0]}`);
                }
            }
        }

    } catch (error) {
        console.error("❌ Critical Error:", error);
    }
}

debugGemini();
