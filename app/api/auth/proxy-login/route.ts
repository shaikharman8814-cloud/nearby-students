import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(reqRequest: Request) {
    try {
        const ip = reqRequest.headers.get('x-forwarded-for') || '127.0.0.1';
        const { rateLimit } = await import('@/lib/security-utils');
        if (!rateLimit(ip, 5, 300000)) { // 5 attempts per 5 mins
            return NextResponse.json({ error: 'Too many login attempts' }, { status: 429 });
        }

        const { email, password } = await reqRequest.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        // 1. Authenticate with Firebase Auth REST API (Server-side)
        // This bypasses the browser's authorized domain check.
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
        console.log(`[Proxy Auth Debug] Using API Key Fragment: ${apiKey?.substring(0, 5)}...`);
        const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

        const authResponse = await fetch(authUrl, {
            method: 'POST',
            body: JSON.stringify({
                email,
                password,
                returnSecureToken: true
            }),
            headers: { 'Content-Type': 'application/json' }
        });

        const authData = await authResponse.json();

        if (!authResponse.ok) {
            let message = 'Invalid email or password';
            const errorCode = authData.error?.message;

            if (errorCode === 'EMAIL_NOT_FOUND' || errorCode === 'INVALID_PASSWORD') {
                message = 'Invalid email or password';
            } else if (errorCode === 'USER_DISABLED') {
                message = 'This account has been disabled';
            } else if (errorCode === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
                message = 'Too many failed login attempts. Please try again later.';
            }

            return NextResponse.json({
                error: message,
                code: errorCode
            }, { status: 401 });
        }

        // 2. Auth successful! Generate a Custom Token using Admin SDK
        // This token can be used by the client to sign in.
        const uid = authData.localId;
        const customToken = await adminAuth.createCustomToken(uid);

        return NextResponse.json({
            customToken,
            user: {
                uid: uid,
                email: authData.email,
                displayName: authData.displayName
            }
        });

    } catch (error: any) {
        console.warn('Proxy Login Error:', error);
        return NextResponse.json({
            error: 'Server error during login',
            details: error.message
        }, { status: 500 });
    }
}
