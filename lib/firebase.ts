import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Debug logs
if (typeof window !== 'undefined') {
    const isMock = !firebaseConfig.apiKey || firebaseConfig.apiKey === "mock_key";
    console.log("Firebase Config Status:", isMock ? "❌ MOCK VALUES DETECTED" : "✅ Values Loaded");
    console.log("Firebase Project ID:", firebaseConfig.projectId || "MISSING");
    if (isMock) {
        console.warn("CRITICAL: Firebase is running with mock/missing environment variables. Authentication will fail.");
    }
}


// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Enable Offline Persistence (Web)
if (typeof window !== 'undefined') {
    import('firebase/firestore').then(({ enableIndexedDbPersistence }) => {
        enableIndexedDbPersistence(db).catch((err) => {
            if (err.code == 'failed-precondition') {
                // Multiple tabs open, persistence can only be enabled in one tab at a a time.
            } else if (err.code == 'unimplemented') {
                // The current browser does not support all of the features required to enable persistence
            }
        });
    });
}

let analytics = null;
if (typeof window !== 'undefined') {
    isSupported().then(yes => yes && (analytics = getAnalytics(app)));
}

export { app, auth, db, storage, analytics };

export const getMessagingInstance = async () => {
    if (typeof window !== 'undefined') {
        const { getMessaging } = await import('firebase/messaging');
        return getMessaging(app);
    }
    return null;
};
