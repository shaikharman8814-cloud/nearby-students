import "server-only";
import { cert, getApps, initializeApp, App, ServiceAccount } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getMessaging } from "firebase-admin/messaging";


// Helper to get or init the admin app
import { SERVICE_ACCOUNT_KEY } from "./service-account";

export function getAdminApp(): App {

    // Use the hardcoded key to avoid env parsing issues
    const serviceAccount = SERVICE_ACCOUNT_KEY as any;

    // Check for existing named app to avoid HMR duplicates
    const existingApp = getApps().find(app => app.name === 'sone-admin');
    if (existingApp) {
        return existingApp;
    }

    console.log("[Admin SDK] Initializing new app instance: sone-admin");

    let credential;

    if (serviceAccount) {
        try {
            // FIX: Handle literal newlines in private key (common in Vercel/Env)
            const privateKey = serviceAccount.private_key?.replace(/\\n/g, '\n');

            // Remap snake_case to camelCase for cert()
            const accountForCert = {
                projectId: serviceAccount.project_id,
                clientEmail: serviceAccount.client_email,
                privateKey: privateKey,
            };

            // Debug logs
            console.log("[Admin SDK] ProjectId:", accountForCert.projectId);
            console.log("[Admin SDK] ClientEmail:", accountForCert.clientEmail);

            credential = cert(accountForCert);
        } catch (e) {
            console.error("❌ Failed to parse Service Account:", e);
        }
    }

    try {
        const options: any = {
            // projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID 
        };
        if (credential) {
            options.credential = credential;
        } else {
            options.projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        }

        // Initialize with unique name to bypass default app issues
        return initializeApp(options, 'sone-admin');

    } catch (e: any) {
        console.error("❌ Firebase Admin Init Failed:", e);
        throw e;
    }
}

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export const adminStorage = getStorage(getAdminApp());
export const adminAuth = getAuth(getAdminApp());
export const adminDb = getFirestore(getAdminApp());
export const adminMessaging = getMessaging(getAdminApp());

