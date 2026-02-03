import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(reqRequest: Request) {
    try {
        const ip = reqRequest.headers.get('x-forwarded-for') || '127.0.0.1';
        const { rateLimit } = await import('@/lib/security-utils');
        if (!rateLimit(ip, 3, 3600000)) { // 3 signups per hour
            return NextResponse.json({ error: 'Sign up limit reached' }, { status: 429 });
        }

        const { email, password, displayName } = await reqRequest.json();

        if (!email || !password || !displayName) {
            return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
        }

        // 1. Create user with Firebase Auth REST API (Server-side)
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
        const signupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;

        const signupResponse = await fetch(signupUrl, {
            method: 'POST',
            body: JSON.stringify({
                email,
                password,
                returnSecureToken: true
            }),
            headers: { 'Content-Type': 'application/json' }
        });

        const signupData = await signupResponse.json();

        if (!signupResponse.ok) {
            let message = 'Failed to create account';
            const errorCode = signupData.error?.message;

            if (errorCode === 'EMAIL_EXISTS') {
                message = 'Email is already registered. Please sign in.';
            } else if (errorCode === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
                message = 'Too many attempts. Please try again later.';
            } else if (errorCode === 'INVALID_EMAIL') {
                message = 'Please enter a valid email address.';
            }

            return NextResponse.json({
                error: message,
                code: errorCode
            }, { status: 400 });
        }

        const uid = signupData.localId;

        // 2. Update display name in Auth via Admin SDK
        await adminAuth.updateUser(uid, {
            displayName: displayName
        });

        // 3. Create initial user doc in Firestore via Admin SDK
        // Using { merge: true } prevents "ID taken" errors if a doc somehow exists
        await adminDb.collection('users').doc(uid).set({
            uid,
            email,
            displayName,
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
        }, { merge: true });

        // 4. Generate a Custom Token for client-side login
        const customToken = await adminAuth.createCustomToken(uid);

        return NextResponse.json({
            customToken,
            user: {
                uid: uid,
                email: email,
                displayName: displayName
            }
        });

    } catch (error: any) {
        console.error('Proxy Signup Error:', error);
        return NextResponse.json({
            error: 'Server error during signup',
            details: error.message
        }, { status: 500 });
    }
}
