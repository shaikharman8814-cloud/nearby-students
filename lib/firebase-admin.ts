import "server-only";
import { cert, getApps, initializeApp, App, ServiceAccount } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getMessaging } from "firebase-admin/messaging";


// Helper to get or init the admin app
import { SERVICE_ACCOUNT_KEY } from "./service-account";

export function getAdminApp(): App {
    // Check for existing named app to avoid HMR duplicates
    const existingApp = getApps().find(app => app.name === 'sone-admin');
    if (existingApp) return existingApp;

    let serviceAccount: any = null;

    // Priority 1: Environment Variable (Recommended for Production)
    const envServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (envServiceAccount) {
        let cleanedEnv = envServiceAccount.trim();
        // Fix actual newlines inserted into the middle of the string literal by Vercel
        cleanedEnv = cleanedEnv.replace(/("-----BEGIN PRIVATE KEY-----\n[\s\S]+?\n-----END PRIVATE KEY-----\\n"|"-----BEGIN PRIVATE KEY-----\n[\s\S]+?\n-----END PRIVATE KEY-----\n?")/g, (m) => m.replace(/\n/g, '\\n'));

        try {
            serviceAccount = JSON.parse(cleanedEnv);
        } catch (firstErr) {
            try {
                // If the user pasted it with surrounding quotes (e.g. from .env.local), strip them
                if ((cleanedEnv.startsWith("'") && cleanedEnv.endsWith("'")) || (cleanedEnv.startsWith('"') && cleanedEnv.endsWith('"'))) {
                    cleanedEnv = cleanedEnv.slice(1, -1);
                    cleanedEnv = cleanedEnv.replace(/\\"/g, '"');

                    // Re-run the newline fix just in case the outer quotes broke the previous regex 
                    cleanedEnv = cleanedEnv.replace(/("-----BEGIN PRIVATE KEY-----\n[\s\S]+?\n-----END PRIVATE KEY-----\\n"|"-----BEGIN PRIVATE KEY-----\n[\s\S]+?\n-----END PRIVATE KEY-----\n?")/g, (m) => m.replace(/\n/g, '\\n'));

                    serviceAccount = JSON.parse(cleanedEnv);
                } else {
                    throw firstErr;
                }
            } catch (e: any) {
                console.error("[Admin SDK] Failed to parse FIREBASE_SERVICE_ACCOUNT env variable. The JSON is severely malformed:", e.message);
                console.error("String started with:", cleanedEnv.substring(0, 15) + "...");
            }
        }
    }

    // Priority 2: Local File (Fallback for dev, now null by default)
    if (!serviceAccount && SERVICE_ACCOUNT_KEY) {
        serviceAccount = SERVICE_ACCOUNT_KEY;
    }

    console.log("[Admin SDK] Initializing instance: sone-admin");

    let credential;
    if (serviceAccount) {
        try {
            // Handle literal newlines in private key (critical for env vars)
            const privateKey = serviceAccount.private_key?.replace(/\\n/g, '\n');

            credential = cert({
                projectId: serviceAccount.project_id,
                clientEmail: serviceAccount.client_email,
                privateKey: privateKey,
            });

            console.log("[Admin SDK] Credential initialized for project:", serviceAccount.project_id);
        } catch (e) {
            console.warn("❌ Failed to initialize credential from Service Account.", e);
        }
    }

    try {
        const options: any = {
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        };

        if (credential) {
            options.credential = credential;
        } else {
            console.log("[Admin SDK] No service account found, falling back to default credentials.");
            // On Vercel, falling back to default credentials will ALWAYS throw "Unable to detect a Project Id" or "Could not load default credentials".
            // Since proxy-login and signup REQUIRE custom tokens, they require an absolute valid Service Account.
            if (!process.env.FIREBASE_SERVICE_ACCOUNT && !process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
                throw new Error("Missing FIREBASE_SERVICE_ACCOUNT Environment Variable in Vercel.");
            } else {
                throw new Error("The FIREBASE_SERVICE_ACCOUNT Environment Variable in Vercel is severely malformed. It must be a valid JSON string (no mangled newlines). Please copy the exact JSON from .env.local.");
            }
        }

        return initializeApp(options, 'sone-admin');
    } catch (e: any) {
        console.error("❌ Firebase Admin Init Failed:", e.message);
        throw e;
    }
}

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export const adminStorage = getStorage(getAdminApp());
export const adminAuth = getAuth(getAdminApp());
export const adminDb = getFirestore(getAdminApp());
export const adminMessaging = getMessaging(getAdminApp());

