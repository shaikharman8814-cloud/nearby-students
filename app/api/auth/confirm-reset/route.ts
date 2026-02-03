import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const { token, newPassword } = await req.json();

        if (!token || !newPassword) {
            return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        // 1. Find the token in Firestore
        const snapshot = await adminDb.collection('password_resets')
            .where('token', '==', token)
            .where('used', '==', false)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return NextResponse.json({ error: 'Invalid or used token' }, { status: 400 });
        }

        const doc = snapshot.docs[0];
        const data = doc.data();

        // 2. Check Expiry
        if (data.expiresAt < Date.now()) {
            return NextResponse.json({ error: 'Token has expired' }, { status: 400 });
        }

        const email = data.email;

        // 3. Get User ID
        let userRecord;
        try {
            userRecord = await adminAuth.getUserByEmail(email);
        } catch (e: any) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 4. Update Password
        await adminAuth.updateUser(userRecord.uid, {
            password: newPassword
        });

        // 5. Mark Token as Used
        await doc.ref.update({
            used: true,
            usedAt: new Date().toISOString()
        });

        return NextResponse.json({ message: 'Password updated successfully' });

    } catch (error: any) {
        console.error('Confirm Reset API Error:', error);
        return NextResponse.json({
            error: `Server Error: ${error.message}`
        }, { status: 500 });
    }
}
