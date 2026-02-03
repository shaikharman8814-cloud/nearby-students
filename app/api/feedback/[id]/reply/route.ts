import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, adminMessaging } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

async function verifyAdmin(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        const uid = decodedToken.uid;

        if (decodedToken.admin || decodedToken.role === 'admin') {
            return decodedToken;
        }

        // Fallback: Check DB for role
        const userDoc = await adminDb.collection('users').doc(uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            const role = userData?.role?.toLowerCase();
            if (role === 'admin' || role === 'solver' || role === 'owner' || role === 'support') {
                return { ...decodedToken, admin: true };
            }
        }

        return null; // Not an admin
    } catch (error) {
        console.error("[Feedback Reply API] Token verification failed:", error);
        return null;
    }
}

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const { id } = params;
    const decodedToken = await verifyAdmin(req);

    if (!decodedToken) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { adminReply } = await req.json();

    if (!adminReply || typeof adminReply !== 'string' || adminReply.trim().length === 0) {
        return NextResponse.json({ error: 'Reply is required' }, { status: 400 });
    }

    try {
        const feedbackRef = adminDb.collection('feedback').doc(id);
        const feedbackDoc = await feedbackRef.get();

        if (!feedbackDoc.exists) {
            return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
        }

        const feedbackData = feedbackDoc.data();
        const userId = feedbackData?.userId;
        const oldReply = feedbackData?.adminReply;

        // Requirement 3: Do NOT create duplicate notifications for the same reply.
        if (oldReply === adminReply.trim()) {
            return NextResponse.json({ success: true, message: 'Reply is identical, no notification sent.' });
        }

        // Requirement: Update SAME feedback document
        await feedbackRef.update({
            adminReply: adminReply.trim(),
            repliedAt: new Date(),
            status: 'replied' // Requirement: "replied"
        });

        // Send Notifications (Requirement: Mandatory)
        // Trigger: Status changes to "replied" (which we just did)

        const storedFcmToken = feedbackData?.fcmToken;

        if (storedFcmToken) {
            // Notification: Title: "Support replied to your feedback", Body: "Tap to view the reply"
            const message = {
                notification: {
                    title: 'Support replied to your feedback',
                    body: 'Tap to view the reply',
                },
                data: {
                    feedbackId: id,
                    type: 'feedback_reply',
                    click_action: '/support' // Action: Open Support & Feedback screen
                },
                token: storedFcmToken, // Use specific token
            };

            try {
                // Use adminMessaging.send (singular) as we target one token
                await adminMessaging.send(message);
                console.log(`[Feedback Reply] Notification sent to token: ${storedFcmToken.substring(0, 10)}...`);
            } catch (fcmError) {
                console.error("[Feedback Reply] FCM error:", fcmError);
                // "If fcmToken missing: Skip notification silently" - implies simple error logging is fine, don't fail request
            }
        } else {
            // "If fcmToken missing: Skip notification silently"
            console.log("[Feedback Reply] No fcmToken found in feedback doc. Skipping notification.");
        }

        return NextResponse.json({ success: true, status: 'replied' });
    } catch (error: any) {
        console.error("[Feedback Reply API] Error:", error);
        return NextResponse.json({
            error: error.message || 'Internal server error',
            stack: error.stack
        }, { status: 500 });
    }
}
