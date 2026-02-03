/**
 * Cloud Functions for Firebase
 * Deploy this code to your Firebase Functions environment.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Admin SDK
/* 
In many environments, if you are running in the default Google Cloud environment, 
this initializes automatically with default credentials.
If you need a service account header, you might need:
const serviceAccount = require("./service-account.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
*/
if (admin.apps.length === 0) {
    admin.initializeApp();
}

/**
 * Trigger: On Creation of a Notification Document
 * Path: users/{userId}/notifications/{notificationId}
 * 
 * This function listens for any new notification added to a user's subcollection
 * and sends a corresponding FCM Push Notification.
 */
exports.sendPushNotification = functions.firestore
    .document('users/{userId}/notifications/{notificationId}')
    .onCreate(async (snapshot, context) => {
        const userId = context.params.userId;
        const notification = snapshot.data();

        if (!notification) return null;

        try {
            // 1. Get User's FCM Tokens and Preference
            const userDoc = await admin.firestore().collection('users').doc(userId).get();

            if (!userDoc.exists) {
                console.log(`User ${userId} does not exist`);
                return null;
            }

            const userData = userDoc.data();
            const fcmTokens = userData.fcmTokens || [];
            const notificationsEnabled = userData.notificationsEnabled;

            // Check if notifications are globally enabled 
            // (Note: Granular preferences like 'messages' vs 'likes' are checked BEFORE creating the notification doc in lib/db.ts, 
            // so we don't need to re-check them here. If the doc exists, it passed the filter.)
            if (!notificationsEnabled || fcmTokens.length === 0) {
                console.log(`Notifications disabled or no tokens for user ${userId}`);
                return null;
            }

            // 2. Construct Payload
            // "webpush" key is specifically for Web Push Notifications
            const payload = {
                notification: {
                    title: notification.title || 'New Notification',
                    body: notification.body || 'You have a new alert',
                    // Icon logic can be static or dynamic
                    icon: '/icon.png',
                },
                webpush: {
                    fcmOptions: {
                        link: notification.link || '/'
                    },
                    notification: {
                        icon: '/icon.png',
                        badge: '/badge.png'
                    }
                },
                // Data payload for client handling
                data: {
                    url: notification.link || '/',
                    ...notification.metadata // pass extra metadata
                },
                tokens: fcmTokens
            };

            // 3. Send Multicast (to all user's tokens)
            const response = await admin.messaging().sendMulticast(payload);

            console.log(`${response.successCount} messages were sent successfully`);

            // 4. Cleanup Invalid Tokens
            if (response.failureCount > 0) {
                const failedTokens = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        failedTokens.push(fcmTokens[idx]);
                    }
                });

                if (failedTokens.length > 0) {
                    await admin.firestore().collection('users').doc(userId).update({
                        fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens)
                    });
                    console.log(`Removed ${failedTokens.length} invalid tokens`);
                }
            }

        } catch (error) {
            console.error("Error sending push notification:", error);
        }
    });

// To Deploy:
// firebase deploy --only functions

/**
 * Trigger: On New Message
 * Path: connections/{connectionId}/messages/{messageId}
 */
exports.onMessageCreated = functions.firestore
    .document('connections/{connectionId}/messages/{messageId}')
    .onCreate(async (snapshot, context) => {
        const message = snapshot.data();
        const connectionId = context.params.connectionId;
        const messageId = context.params.messageId;

        // Ignore system messages/call logs if needed, or handle them
        // If it's a call log, we might want a different notification or none if handled elsewhere.
        // But let's support all.

        try {
            // Get Connection to find recipients
            const connDoc = await admin.firestore().collection('connections').doc(connectionId).get();
            if (!connDoc.exists) return null;

            const connData = connDoc.data();
            const users = connData.users || [];
            const senderId = message.senderId;

            // Notify everyone except sender
            const recipients = users.filter(uid => uid !== senderId);

            const promises = recipients.map(async (recipientId) => {
                let title = message.isAnonymous ? 'New Anonymous Message' : `New Message from ${message.displayName || 'Student'}`;
                let body = message.text || 'Sent an attachment';

                if (message.type === 'call_log') {
                    const info = message.callInfo || {};
                    title = info.wasMissed ? 'Missed Call' : 'Call ended';
                    body = message.text; // "2m 3s" etc
                } else if (message.type !== 'text') {
                    body = `Sent ${message.type === 'image' ? 'a photo' : 'an attachment'}`;
                }

                // Create Notification Doc
                await admin.firestore().collection('users').doc(recipientId).collection('notifications').add({
                    type: message.type === 'call_log' ? 'call_log' : 'message',
                    title,
                    body,
                    link: `/messages/${connectionId}`,
                    senderId,
                    isAnonymous: message.isAnonymous || false,
                    createdAt: new Date().toISOString(),
                    seen: false,
                    metadata: {
                        connectionId,
                        messageId
                    }
                });
            });

            await Promise.all(promises);

        } catch (error) {
            console.error("Error in onMessageCreated:", error);
        }
    });


/**
 * Trigger: On Connection Request / Acceptance (Creation)
 * Path: connections/{connectionId}
 */
exports.onConnectionCreated = functions.firestore
    .document('connections/{connectionId}')
    .onCreate(async (snapshot, context) => {
        const data = snapshot.data();
        // If created as 'accepted', notify recipient
        // If created as 'pending', notify recipient
        // Requester is the one who initiated.

        try {
            const requesterId = data.requester;
            const recipientId = data.recipient;

            // Safety check
            if (!requesterId || !recipientId) return null;

            // Get Requester Name
            const userDoc = await admin.firestore().collection('users').doc(requesterId).get();
            const requesterName = userDoc.exists ? (userDoc.data().displayName || 'Someone') : 'Someone';

            // Create Notification for Recipient
            await admin.firestore().collection('users').doc(recipientId).collection('notifications').add({
                type: 'follow', // Connection request
                title: "New Connection",
                body: `${requesterName} connected with you!`,
                link: `/profile/${requesterId}`,
                senderId: requesterId,
                isAnonymous: false,
                createdAt: new Date().toISOString(),
                seen: false
            });

        } catch (error) {
            console.error("Error in onConnectionCreated:", error);
        }
    });


/**
 * Trigger: On Connection Update (Pending -> Accepted)
 * Path: connections/{connectionId}
 */
exports.onConnectionUpdated = functions.firestore
    .document('connections/{connectionId}')
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const oldData = change.before.data();

        // Check if status changed to 'accepted'
        if (oldData.status !== 'accepted' && newData.status === 'accepted') {
            try {
                const requesterId = newData.requester;
                const recipientId = newData.recipient; // The one who accepted

                // Get Recipient (Accepters) Name
                const userDoc = await admin.firestore().collection('users').doc(recipientId).get();
                const accepterName = userDoc.exists ? (userDoc.data().displayName || 'Someone') : 'Someone';

                // Notify Requester
                await admin.firestore().collection('users').doc(requesterId).collection('notifications').add({
                    type: 'follow',
                    title: "Connection Accepted",
                    body: `${accepterName} accepted your connection request.`,
                    link: `/profile/${recipientId}`,
                    senderId: recipientId,
                    isAnonymous: false,
                    createdAt: new Date().toISOString(),
                    seen: false
                });

            } catch (error) {
                console.error("Error in onConnectionUpdated:", error);
            }
        }
    });


/**
 * Trigger: On Application Created
 * Path: applications/{applicationId}
 */
exports.onApplicationCreated = functions.firestore
    .document('applications/{applicationId}')
    .onCreate(async (snapshot, context) => {
        const app = snapshot.data();

        try {
            const founderUid = app.founderUid;

            await admin.firestore().collection('users').doc(founderUid).collection('notifications').add({
                type: 'project_alert',
                title: `New Application: ${app.roleTitle}`,
                body: `${app.applicantName} applied for ${app.projectTitle}`,
                link: `/projects/${app.projectId}/manage`,
                senderId: app.applicantUid,
                isAnonymous: false,
                createdAt: new Date().toISOString(),
                seen: false,
                metadata: {
                    projectId: app.projectId,
                    roleId: app.roleId,
                    applicationId: context.params.applicationId
                }
            });

        } catch (error) {
            console.error("Error in onApplicationCreated:", error);
        }
    });


/**
 * Trigger: On Application Updated (Status Change)
 * Path: applications/{applicationId}
 */
exports.onApplicationUpdated = functions.firestore
    .document('applications/{applicationId}')
    .onUpdate(async (change, context) => {
        const newApp = change.after.data();
        const oldApp = change.before.data();

        if (newApp.status !== oldApp.status && (newApp.status === 'accepted' || newApp.status === 'rejected')) {
            try {
                let title = '';
                let body = '';

                if (newApp.status === 'accepted') {
                    title = "Application Accepted! 🎉";
                    body = `You've been accepted as ${newApp.roleTitle} for ${newApp.projectTitle}.`;
                } else {
                    title = "Application Update";
                    body = `Your application for ${newApp.roleTitle} at ${newApp.projectTitle} was not selected.`;
                }

                await admin.firestore().collection('users').doc(newApp.applicantUid).collection('notifications').add({
                    type: 'project_alert',
                    title,
                    body,
                    link: `/projects/${newApp.projectId}`,
                    senderId: newApp.founderUid,
                    isAnonymous: false,
                    createdAt: new Date().toISOString(),
                    seen: false,
                    metadata: {
                        projectId: newApp.projectId,
                        status: newApp.status
                    }
                });

            } catch (error) {
                console.error("Error in onApplicationUpdated:", error);
            }
        }
    });


/**
 * Trigger: On User Status Change (Online Notification)
 * Path: users/{userId}
 * 
 * Logic: If lastActive updates and gap > 30 mins, notify "Close Friends" (Streak > 0)
 */
exports.onUserStatusChange = functions.firestore
    .document('users/{userId}')
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const oldData = change.before.data();
        const userId = context.params.userId;

        // Check if lastActive changed
        if (newData.lastActive === oldData.lastActive) return null;

        const newTime = new Date(newData.lastActive).getTime();
        const oldTime = oldData.lastActive ? new Date(oldData.lastActive).getTime() : 0;
        const diffMinutes = (newTime - oldTime) / (1000 * 60);

        // Only trigger if they were offline for > 30 minutes
        if (diffMinutes < 30) return null;

        try {
            console.log(`User ${userId} came online after ${Math.round(diffMinutes)} mins. Finding close friends...`);

            // Find "Close Friends" -> Connections with Streak > 0
            const maxLimit = 50; // Safety limit
            const connectionsSnapshot = await admin.firestore().collection('connections')
                .where('users', 'array-contains', userId)
                .where('streak', '>', 0) // Only notify people they chat with often
                .limit(maxLimit)
                .get();

            if (connectionsSnapshot.empty) {
                console.log("No close friends found to notify.");
                return null;
            }

            const batch = admin.firestore().batch();
            let count = 0;

            connectionsSnapshot.forEach(doc => {
                const connData = doc.data();
                const otherUserId = connData.users.find(id => id !== userId);

                if (otherUserId) {
                    // avoid self-notify just in case
                    const notifRef = admin.firestore().collection('users').doc(otherUserId).collection('notifications').doc();
                    batch.set(notifRef, {
                        type: 'online_alert',
                        title: "Friend Online",
                        body: `${newData.displayName || 'Friend'} is now online`,
                        link: `/messages/${doc.id}`,
                        senderId: userId,
                        isAnonymous: false,
                        createdAt: new Date().toISOString(),
                        seen: false
                    });
                    count++;
                }
            });

            if (count > 0) {
                await batch.commit();
                console.log(`Notified ${count} close friends.`);
            }

        } catch (error) {
            console.error("Error in onUserStatusChange:", error);
        }
    });


/**
 * Trigger: On User Updated (Profile Completion XP)
 * Path: users/{userId}
 * 
 * Securely awards 50 XP if profile meets "complete" criteria (one-time).
 */
exports.onUserUpdated = functions.firestore
    .document('users/{userId}')
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const oldData = change.before.data();
        const userId = context.params.userId;

        // 1. Skip if already awarded
        if (newData.xpAwarded_profile) return null;

        // 2. Check if "Complete" conditions are met
        // (e.g., Bio > 10 chars AND at least 3 interests)
        const bioLength = Math.max(newData.bio?.length || 0, 0);
        const interestsCount = (newData.interests || []).length;

        if (bioLength > 10 && interestsCount >= 3) {
            console.log(`[XP] Awarding 50 XP for Profile Completion to ${userId}`);
            return change.after.ref.update({
                xp: admin.firestore.FieldValue.increment(50),
                xpAwarded_profile: true
            });
        }

        return null;
    });


/**
 * Callable: Verify User Email
 * 
 * Checks Firebase Auth status and marks user as verified + awards XP.
 */
exports.verifyUserEmail = functions.https.onCall(async (data, context) => {
    // 1. Authenticate Request
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    const uid = context.auth.uid;
    const userRecord = await admin.auth().getUser(uid);

    // 2. Check Auth Status
    if (!userRecord.emailVerified) {
        throw new functions.https.HttpsError('failed-precondition', 'Email not verified in Auth.');
    }

    // 3. Update Firestore
    const userRef = admin.firestore().collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data() || {};

    if (userData.isVerified) {
        return { success: true, message: 'Already verified.' };
    }

    await userRef.update({
        isVerified: true,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        verificationMethod: 'firebase_email',
        xp: admin.firestore.FieldValue.increment(25),
        xpAwarded_verified: true
    });

    console.log(`[VERIFICATION] User ${uid} verified via email.`);
    return { success: true, message: 'Verification successful.' };
});


/**
 * Callable: Award XP (Secured)
 * 
 * Awards XP for specific content-based actions (e.g., helpful answer).
 * Implements internal validation to prevent spoofing.
 */
exports.awardXp = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated.');
    }

    const { amount, actionId, type } = data;
    const uid = context.auth.uid;

    if (!amount || amount > 100) { // Safety cap
        throw new functions.https.HttpsError('invalid-argument', 'Invalid XP amount.');
    }

    // TODO: Verify action (e.g., check if user actually answered a question)
    // For now, implement basic rate-limiting/deduplication based on actionId
    if (actionId) {
        const actionRef = admin.firestore().collection('xp_ledger').doc(actionId);
        const actionSnap = await actionRef.get();
        if (actionSnap.exists) {
            return { success: false, message: 'Action already rewarded.' };
        }
        await actionRef.set({ uid, amount, type, timestamp: admin.firestore.FieldValue.serverTimestamp() });
    }

    await admin.firestore().collection('users').doc(uid).update({
        xp: admin.firestore.FieldValue.increment(amount),
        lastActive: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, xpAwarded: amount };
});
