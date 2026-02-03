import dotenv from 'dotenv';
import { cert, initializeApp, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

// Load env vars
dotenv.config({ path: '.env.local' });

async function testFirebase() {
    console.log("-----------------------------------------");
    console.log("running Firebase Admin SDK Diagnostic ...");
    console.log("-----------------------------------------");

    // 1. Check Env Vars
    console.log(`[Env] NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}`);
    const keyStatus = process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? "Present" : "Missing";
    console.log(`[Env] FIREBASE_SERVICE_ACCOUNT_KEY: ${keyStatus}`);
    const geminiStatus = process.env.GEMINI_API_KEY ? "Present" : "Missing";
    console.log(`[Env] GEMINI_API_KEY: ${geminiStatus}`);


    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        console.error("❌ CRTICAL: FIREBASE_SERVICE_ACCOUNT_KEY is missing!");
        return;
    }

    // 2. Parse Service Account
    let serviceAccount: any;
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        console.log(`[Key] Project ID from key: ${serviceAccount.project_id}`);

        // FIX: Handle private key newlines
        if (serviceAccount.private_key) {
            if (serviceAccount.private_key.includes("\\n")) {
                console.log("[Key] Detected literal \\n in private key, replacing with real newlines...");
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }
        }

    } catch (e: any) {
        console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:", e.message);
        return;
    }

    // 3. Initialize Admin App
    try {
        if (getApps().length === 0) {
            initializeApp({
                credential: cert(serviceAccount),
            });
            console.log("✅ Firebase Admin App initialized successfully.");
        }
    } catch (e) {
        console.error("❌ Failed to initialize Firebase Admin:", e);
        return;
    }

    // 4. Test Storage Access
    const bucketNames = [
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, // The one from env
        `nearbystudents.firebasestorage.app`,            // New default format
        `nearbystudents.appspot.com`,                    // Old default format
        `${serviceAccount.project_id}.appspot.com`,      // Derived from project ID
        `${serviceAccount.project_id}.firebasestorage.app`
    ].filter(Boolean);

    // Deduplicate
    const uniqueNames = [...new Set(bucketNames)];

    console.log(`[Storage] Testing ${uniqueNames.length} potential bucket names...`);

    for (const name of uniqueNames) {
        if (!name) continue;
        try {
            // @ts-ignore
            const bucket = getStorage().bucket(name);
            console.log(`\nChecking bucket: '${name}'`);
            const [exists] = await bucket.exists();
            console.log(`   -> Exists: ${exists}`);

            if (exists) {
                console.log(`   ✅ FOUND VALID BUCKET: ${name}`);
                console.log(`   !!! Please update .env.local with NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${name} !!!`);
                // Try listing files to be sure
                try {
                    const [files] = await bucket.getFiles({ maxResults: 1 });
                    console.log(`   -> Can list files: Yes (Found ${files.length})`);
                } catch (err) {
                    console.log(`   -> Can list files: No (Permission issue?)`);
                }
            }
        } catch (e: any) {
            console.log(`   -> Error checking '${name}': ${e.message}`);
        }
    }
}

testFirebase();
