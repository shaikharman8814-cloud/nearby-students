import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/email-service';
import { OTP_TEMPLATE, compileEmailTemplate } from '@/lib/email-templates';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        const { rateLimit } = await import('@/lib/security-utils');
        if (!rateLimit(ip, 3, 300000)) { // 3 OTPs per 5 mins
            return NextResponse.json({ error: 'Please wait before requesting another OTP' }, { status: 429 });
        }

        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // 1. Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        // 2. Store in Firestore
        // Use set() with merge: true or just add() depending on if we want to overwrite existing OTPs for this email
        // A collection 'otp_codes' seems appropriate.
        await adminDb.collection('otp_codes').doc(email).set({
            email,
            otp,
            expiresAt,
            createdAt: new Date().toISOString()
        });

        // 3. Compile Email
        const html = compileEmailTemplate(OTP_TEMPLATE, {
            OTP_CODE: otp,
            APP_NAME: 'Nearby Students',
            TAGLINE: 'Verify your login',
            SUPPORT_EMAIL: 'support@social-net.online',
            EXPIRY_MINUTES: '10',
            YEAR: new Date().getFullYear().toString()
        });

        // 4. Send Email
        await sendEmail({
            to: email,
            subject: 'Your Verification Code',
            html: html
        });

        return NextResponse.json({ message: 'OTP sent successfully' });

    } catch (error: any) {
        console.error('Send OTP Error:', error);
        return NextResponse.json({
            error: `Server Error: ${error.message}`
        }, { status: 500 });
    }
}
