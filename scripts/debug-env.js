require('dotenv').config({ path: '.env.local' });

const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
console.log("Checking FIREBASE_SERVICE_ACCOUNT_KEY...");
if (!key) {
    console.log("❌ Key is undefined or empty");
} else {
    console.log("Length:", key.length);
    console.log("First 10 chars:", key.substring(0, 10));
    console.log("Last 10 chars:", key.substring(key.length - 10));

    try {
        JSON.parse(key);
        console.log("✅ JSON.parse success");
    } catch (e) {
        console.log("❌ JSON.parse failed:", e.message);
        // Try stripping quotes
        if (key.startsWith("'") && key.endsWith("'")) {
            console.log("⚠️ Key is wrapped in single quotes. Trying to strip...");
            try {
                JSON.parse(key.slice(1, -1));
                console.log("✅ JSON.parse success after stripping quotes");
            } catch (e2) {
                console.log("❌ JSON.parse failed after stripping quotes:", e2.message);
            }
        }
    }
}
