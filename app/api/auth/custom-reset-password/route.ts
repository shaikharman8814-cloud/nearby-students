import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/email-service';
import { RESET_PASSWORD_TEMPLATE, compileEmailTemplate } from '@/lib/email-templates';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const cleanEmail = email.trim();

        // 1. Generate password reset link using Admin SDK
        // This avoids the client-side Firebase Auth email and gives us the link directly
        const origin = req.headers.get('origin') || 'https://social-net.online';
        const actionCodeSettings = {
            url: `${origin}/login`,
            handleCodeInApp: true,
        };

        const firebaseResetLink = await adminAuth.generatePasswordResetLink(cleanEmail, actionCodeSettings);

        // 1.5. Convert Firebase link to internal app link to keep it "invisible"
        const resetUrl = new URL(firebaseResetLink);
        const oobCode = resetUrl.searchParams.get('oobCode');

        // 1.7. Store token in Firestore for verification by our confirm-reset API
        await adminDb.collection('password_resets').doc(oobCode!).set({
            token: oobCode,
            email: cleanEmail,
            used: false,
            createdAt: new Date().toISOString(),
            expiresAt: Date.now() + 3600000, // 1 hour expiry
        });

        const internalResetLink = `${origin}/reset-password?token=${oobCode}`;

        // 2. Compile Email Template
        const html = compileEmailTemplate(RESET_PASSWORD_TEMPLATE, {
            RESET_URL: internalResetLink,
            APP_NAME: 'NearbyStudents',
            TAGLINE: 'Connect with students around you',
            SUPPORT_EMAIL: 'support@social-net.online',
            YEAR: new Date().getFullYear().toString()
        });

        // 3. Send Email via Resend
        await sendEmail({
            to: cleanEmail,
            subject: 'Reset your password for NearbyStudents',
            html: html,
        });

        return NextResponse.json({ message: 'Password reset email sent successfully' });

    } catch (error: any) {
        console.error('Custom Password Reset Error:', error);

        // Security: Don't reveal if user exists or not, but handle specific errors for logging
        if (error.code === 'auth/user-not-found') {
            // Still return success to prevent email enumeration
            return NextResponse.json({ message: 'Password reset email sent successfully' });
        }

        return NextResponse.json({
            error: `Failed to send reset email: ${error.message}`
        }, { status: 500 });
    }
}
