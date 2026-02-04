import { getMessaging } from "firebase/messaging";

export const getMessagingInstance = () => {
    if (typeof window === "undefined") return null;
    try {
        return getMessaging();
    } catch {
        return null;
    }
};
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = typeof window !== "undefined" ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)) : null as any;
const auth = typeof window !== "undefined" ? getAuth(app) : null as any;
const db = typeof window !== "undefined" ? getFirestore(app) : null as any;
const storage = typeof window !== "undefined" ? getStorage(app) : null as any;

export { app, auth, db, storage };
