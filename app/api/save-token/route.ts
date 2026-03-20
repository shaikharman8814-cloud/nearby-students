import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
    try {
        const { token, uid } = await req.json();

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        if (uid) {
            // Store under specific user document if authenticated UID is provided
            await adminDb.collection('users').doc(uid).set({ fcmToken: token }, { merge: true });
        } else {
            // General token store
            await adminDb.collection('fcm_tokens').doc(token).set({
                token,
                createdAt: new Date().toISOString()
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.warn('FCM Token Save Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
