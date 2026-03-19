import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, adminMessaging } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

async function verifyAuth(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        const uid = decodedToken.uid;

        // Requirement: Admin identification enforced via custom claims (role='admin' or admin=true)
        // We also check DB as a robust fallback which is a common "admin check" method
        let isAdmin = !!decodedToken.admin || decodedToken.role === 'admin';

        if (!isAdmin) {
            const userDoc = await adminDb.collection('users').doc(uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const role = userData?.role?.toLowerCase();
                if (role === 'admin' || role === 'solver' || role === 'owner' || role === 'support') {
                    isAdmin = true;
                }
            }
        }

        console.log(`[Feedback API] Auth verified for ${uid}. Is Admin: ${isAdmin}`);
        return {
            uid,
            admin: isAdmin,
            email: decodedToken.email,
            name: decodedToken.name || decodedToken.displayName
        };
    } catch (error) {
        console.warn("[Feedback API] Token verification failed:", error);
        return null;
    }
}

export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const { rateLimit, sanitizeString } = await import('@/lib/security-utils');
    if (!rateLimit(ip, 5, 60000)) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const decodedToken = await verifyAuth(req);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = decodedToken;
    const body = await req.json();
    const message = sanitizeString(body.message);

    if (!message || message.trim().length === 0) {
        return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    try {
        // Rate limiting re-enabled as per Security Hardening Mandate (Objective 2)


        // Fetch user profile first to get FCM token
        const userDoc = await adminDb.collection('users').doc(uid).get();
        const userData = userDoc.data();
        const storedFcmToken = userData?.fcmTokens && Array.isArray(userData.fcmTokens) && userData.fcmTokens.length > 0
            ? userData.fcmTokens[userData.fcmTokens.length - 1] // Get latest
            : null;

        const feedbackData = {
            userId: uid,
            userName: decodedToken.name || 'Anonymous Student',
            userEmail: decodedToken.email || 'No Email',
            message: message.trim(),
            status: 'open',
            createdAt: new Date(),
            fcmToken: storedFcmToken // Requirement: Store fcmToken
        };

        console.log(`[Feedback API] Adding feedback for uid: ${uid}`);
        const docRef = await adminDb.collection('feedback').add(feedbackData);
        console.log(`[Feedback API] Successfully added feedback: ${docRef.id}`);

        // Requirement 5: Notify Admins
        try {
            const adminQuery = await adminDb.collection('users').where('role', '==', 'admin').get();
            const adminTokens: string[] = [];

            adminQuery.docs.forEach(doc => {
                const data = doc.data();
                if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
                    adminTokens.push(...data.fcmTokens);
                }
            });

            if (adminTokens.length > 0) {
                const adminMsg = {
                    notification: {
                        title: 'New Feedback',
                        body: `${feedbackData.userName}: ${feedbackData.message.substring(0, 50)}...`,
                    },
                    data: {
                        type: 'admin_feedback',
                        feedbackId: docRef.id,
                        click_action: '/admin/feedback'
                    },
                    tokens: adminTokens
                };

                // Use adminMessaging from firebase-admin (imported at top)
                await adminMessaging.sendEachForMulticast(adminMsg);
                console.log(`[Feedback API] Notified ${adminTokens.length} admin devices.`);
            }
        } catch (notifErr) {
            console.warn("[Feedback API] Failed to notify admins:", notifErr);
        }

        return NextResponse.json({ id: docRef.id, ...feedbackData });
    } catch (error: any) {
        console.warn("[Feedback API] Error in POST:", error);
        if (error.code === 9) {
            return NextResponse.json({
                error: 'Database index required. Please contact admin.',
                details: error.message
            }, { status: 500 });
        }
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message,
            code: error.code
        }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const decodedToken = await verifyAuth(req);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid, admin } = decodedToken;

    try {
        let query;
        if (admin) {
            // Admin can see everything
            query = adminDb.collection('feedback').orderBy('createdAt', 'desc');
        } else {
            // User can only see their own
            query = adminDb.collection('feedback')
                .where('userId', '==', uid);
        }

        const snapshot = await query.get();
        let feedback = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate()?.toISOString(),
            repliedAt: doc.data().repliedAt?.toDate()?.toISOString(),
        }));

        // Enhancement: Fetch latest user details (Name, Email) for Admin view
        // to replace UIDs with actual names.
        if (admin && feedback.length > 0) {
            const userIds = Array.from(new Set(feedback.map((f: any) => f.userId).filter(Boolean)));

            // Fetch users in batches (avoiding 'in' limit of 10 if too many, but usually fine for now)
            // For simplicity/robustness, we'll use Promise.all for individual fetches or groups.
            // Given the scale, fetching all users might be heavy, but let's try a bulk approach if possible
            // or just map the few visible ones. 
            // Better: just fetch the profiles we need.

            try {
                const userDocs = await Promise.all(
                    userIds.map(uid => adminDb.collection('users').doc(uid as string).get())
                );

                const userMap = new Map();
                userDocs.forEach(doc => {
                    if (doc.exists) {
                        userMap.set(doc.id, doc.data());
                    }
                });

                feedback = feedback.map((item: any) => {
                    const latestUser = userMap.get(item.userId);
                    if (latestUser) {
                        return {
                            ...item,
                            userName: latestUser.name || latestUser.displayName || latestUser.username || item.userName,
                            userEmail: latestUser.email || item.userEmail,
                            // NOTE: Passwords are hashed and NOT retrievable via admin SDK. 
                            // We cannot display passwords.
                        };
                    }
                    return item;
                });
            } catch (userFetchErr) {
                console.warn("Failed to enrich feedback with user details", userFetchErr);
            }
        }

        // Sort in memory to avoid index requirements
        feedback = feedback.sort((a, b) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );

        return NextResponse.json(feedback);
    } catch (error: any) {
        console.warn("[Feedback API] Error fetching feedback:", error);
        // If it's a failed precondition (missing index), return clear error
        if (error.code === 9) {
            return NextResponse.json({ error: 'Database index required. Please contact admin.' }, { status: 500 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
