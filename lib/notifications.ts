import { getMessagingInstance } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { createNotification } from './db';

/**
 * Triggers a push notification by creating a document in the user's notification subcollection.
 * The 'sendPushNotification' Cloud Function will handle the actual FCM delivery.
 */
export const sendPushNotification = async (userId: string, title: string, body: string, link: string = '/') => {
    return createNotification(userId, {
        title,
        body,
        link,
        type: 'system',
        senderId: 'system',
        isAnonymous: false
    });
};

export const requestNotificationPermission = async (uid: string) => {
    try {
        const messaging = await getMessagingInstance();
        if (!messaging) return;

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            // Explicitly register service worker to handle scope/path issues better
            let swRegistration;
            try {
                if (
                    typeof window !== "undefined" &&
                    "serviceWorker" in navigator &&
                    window.location.protocol === "https:" &&
                    !window.location.hostname.startsWith("192.168.") &&
                    window.location.hostname !== "localhost"
                ) {
                    swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
                }
            } catch (swError: any) {
                console.warn("Service Worker Registration Failed:", swError);
                // Alert the user to the specific error
                alert(`Error: ${swError.message}\n\nTry opening the app in Incognito or checking the console.`);
                return null;
            }

            const token = await getToken(messaging, {
                vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
                serviceWorkerRegistration: swRegistration
            });

            console.log("FCM Token:", token);
            await saveFcmToken(uid, token);
            return token;
        } else {
            console.warn("Notification permission denied");
            return null;
        }
    } catch (e) {
        console.warn("Error requesting notification permission", e);
        return null;
    }
};

export const saveFcmToken = async (uid: string, token: string) => {
    if (!db) return;
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
        fcmTokens: arrayUnion(token),
        notificationsEnabled: true
    }).catch(async (e) => {
        // If doc doesn't exist (edge case), create it? No, user always exists.
        // Maybe field doesn't exist? UpdateDoc creates fields.
        console.warn("Error saving FCM token", e);
    });
};

export const onMessageListener = async () => {
    const messaging = await getMessagingInstance();
    if (!messaging) return;

    return onMessage(messaging, (payload) => {
        console.log("Foreground Message:", payload);
        // You can show a toast here if configured
        // const { title, body } = payload.notification || {};
    });
};

export const toggleNotifications = async (uid: string, enabled: boolean) => {
    if (!db) return;
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
        notificationsEnabled: enabled
    });
};

export const getNotificationSettings = async (uid: string) => {
    if (!db) return { enabled: false };
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
        const data = snap.data();
        return {
            enabled: data.notificationsEnabled ?? false, // Default to false until enabled
            // We can check if token exists too, but simple boolean is robust enough for toggle UI
        };
    }
    return { enabled: false };
};
