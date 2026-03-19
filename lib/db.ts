import { db } from './firebase';
import { doc, setDoc, getDoc, getDocFromServer, updateDoc, collection, query, where, getDocs, addDoc, onSnapshot, orderBy, limit, arrayUnion, arrayRemove, increment, writeBatch, deleteField, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getSafeDisplayName } from './utils';

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    name?: string; // New field from auth schema
    college: string;
    course: string;
    year: string;
    city: string;
    photoURL?: string;
    interests?: string[];
    bio?: string;
    location?: { lat: number; lng: number };
    lastActive?: string;     // ISO Date string
    statusText?: string;     // e.g. "Studying at Library"
    statusEmoji?: string;    // e.g. "📚"
    createdAt: string;
    bioLinks?: BioLink[];
    birthday?: string; // ISO string YYYY-MM-DD
    notificationPreferences?: NotificationPreferences;
    xp?: number;
    xpAwarded_profile?: boolean; // Track if +50 XP was awarded for profile completion
    xpAwarded_verified?: boolean; // Track if +25 XP was awarded for verification
    level?: number; // Legacy, kept for compatibility if needed
    blockedUsers?: string[]; // Array of UIDs
    isVerified?: boolean; // [NEW] Verified Student Status
    distance?: number; // [NEW] Calculated distance for discovery
    profileCompleted?: boolean; // [NEW] Track if profile setup is done
    role?: 'admin' | 'solver' | 'user'; // [NEW] Role-based access
}

export const blockUser = async (currentUserId: string, targetUserId: string) => {
    try {
        const userRef = doc(db, 'users', currentUserId);
        await updateDoc(userRef, {
            blockedUsers: arrayUnion(targetUserId)
        });
    } catch (e) {
        console.warn("[DB] blockUser error:", e);
        throw e;
    }
};

export const unblockUser = async (currentUserId: string, targetUserId: string) => {
    try {
        const userRef = doc(db, 'users', currentUserId);
        await updateDoc(userRef, {
            blockedUsers: arrayRemove(targetUserId)
        });
    } catch (e) {
        console.warn("[DB] unblockUser error:", e);
        throw e;
    }
};

export interface NotificationPreferences {
    messages: boolean;
    calls: boolean;
    birthdays: boolean;
    mentions: boolean;
    likes: boolean;
    comments: boolean;
    follows: boolean;
    smartAlerts: boolean;
    anonymous: boolean;
    smartReplies?: boolean; // [NEW] Smart Reply Toggle
}

export interface BioLink {
    title: string;
    url: string;
    icon?: string;
}

export const createUserProfile = async (uid: string, data: Partial<UserProfile>) => {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
        uid,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        ...data
    }, { merge: true });
};

export const getUserProfile = async (uid: string, options?: { forceServer?: boolean }) => {
    const userRef = doc(db, 'users', uid);

    // Hard 3-second timeout as required to prevent infinite hangs
    const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
            console.warn(`[DB] getUserProfile timed out for ${uid}`);
            resolve(null);
        }, 3000);
    });

    const fetchPromise = (async () => {
        try {
            let docSnap;
            if (options?.forceServer) {
                docSnap = await getDocFromServer(userRef).catch(() => getDoc(userRef));
            } else {
                docSnap = await getDoc(userRef);
            }

            if (docSnap.exists()) {
                const data = docSnap.data();
                const profile = { uid: docSnap.id, ...data } as UserProfile;
                profile.displayName = getSafeDisplayName(profile);
                return profile;
            }
            return null;
        } catch (e) {
            console.warn("[DB] getUserProfile error:", e);
            return null;
        }
    })();

    return Promise.race([fetchPromise, timeoutPromise]);
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, data);
}

export const updateUserStatus = async (uid: string, statusText: string, statusEmoji: string) => {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
        statusText,
        statusEmoji,
        lastActive: new Date().toISOString()
    }, { merge: true });
};

export const updateLastActive = async (uid: string) => {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
        lastActive: new Date().toISOString()
    }, { merge: true });
};

/**
 * Derives user level name strictly from total XP.
 */
export function getUserLevel(xp: number = 0): string {
    if (xp <= 50) return "New Student";
    if (xp <= 200) return "Active Learner";
    if (xp <= 500) return "Campus Contributor";
    return "Trusted Senior";
}

/**
 * Safely increments user XP with anti-spam safeguards.
 * Refactored: Now calls the SECURE awardXp cloud function.
 */
export const addXp = async (uid: string, amount: number, actionId?: string) => {
    if (!uid || amount <= 0) return;

    try {
        // We use the httpsCallable from firebase/functions (imported below)
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions();
        const awardXpFn = httpsCallable(functions, 'awardXp');

        await awardXpFn({ amount, actionId });
        console.log(`[XP] Requested ${amount} XP award for ${uid} via Cloud Functions`);
    } catch (error) {
        console.warn("Error awarding XP via function:", error);
    }
};

export const getUsers = async (currentUserId?: string, filters: { college?: string; city?: string; limit?: number } = {}) => {
    try {
        const usersRef = collection(db, 'users');
        let q = query(usersRef);

        // We remove the strict Firestore 'where' filters for college/city 
        // to allow for case-insensitive matching in the JS loop below.
        // This ensures "MIT" and "mit" are matched correctly.

        if (filters.limit) {
            q = query(q, limit(filters.limit));
        } else {
            q = query(q, limit(500)); // Increased limit to prevent asymmetric visibility in discovery
        }

        const querySnapshot = await getDocs(q);
        const users: UserProfile[] = [];

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const u = {
                ...data,
                uid: data.uid || docSnap.id,
                displayName: decodeURIComponent(getSafeDisplayName({ ...data, uid: data.uid || docSnap.id } as any)),
                originalDisplayName: decodeURIComponent(data.displayName || ""),
                college: data.college || "",
                city: data.city || "",
                course: data.course || "",
                year: data.year || "",
                interests: data.interests || [],
                bio: data.bio || "",
                isVerified: data.isVerified || false,
                xp: data.xp ?? 0
            } as UserProfile & { originalDisplayName: string };

            if (u.uid === currentUserId) return;

            if (filters.college) {
                const userColl = (u.college || "").toLowerCase().trim();
                const targetColl = filters.college.toLowerCase().trim();
                if (userColl && userColl !== targetColl) return;
            }

            if (filters.city && !filters.college) {
                const userCity = (u.city || "").toLowerCase().trim();
                const targetCity = filters.city.toLowerCase().trim();
                if (userCity && userCity !== targetCity) return;
            }

            users.push(u);
        });

        return users;
    } catch (e) {
        console.warn("[DB] getUsers error:", e);
        return [];
    }
};

// --- Connections ---

export interface Connection {
    id: string;
    users: string[];
    requester: string;
    recipient: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
    lastMessage?: string;
    lastMessageTimestamp?: string;
    unreadCount?: { [key: string]: number };
    lastMessageSenderId?: string;
    lastMessageIsAnonymous?: boolean;
    streak?: number;
    lastStreakDate?: string; // YYYY-MM-DD
}

export const getConnection = async (currentUserId: string, targetUserId: string): Promise<Connection | null> => {
    // Try deterministic ID first for strong consistency
    const ids = [currentUserId, targetUserId].sort();
    const connectionId = ids.join('_');
    const connRef = doc(db, 'connections', connectionId);
    const docSnap = await getDoc(connRef);

    if (docSnap.exists()) {
        return { ...docSnap.data(), id: docSnap.id } as Connection;
    }

    // Fallback to query for backward compatibility or if deterministic method failed
    const connectionsRef = collection(db, 'connections');
    if (!currentUserId) return null;
    const q = query(connectionsRef, where('users', 'array-contains', currentUserId));
    const snapshot = await getDocs(q);

    // Client-side filter for the second user
    const querySnap = snapshot.docs.find(doc => {
        const data = doc.data();
        return data.users.includes(targetUserId);
    });

    if (!querySnap) return null;
    return { ...querySnap.data(), id: querySnap.id } as Connection;
};

export const getConnectionStatus = async (currentUserId: string, targetUserId: string): Promise<'none' | 'pending' | 'accepted' | 'rejected'> => {
    const conn = await getConnection(currentUserId, targetUserId);
    return conn ? conn.status : 'none';
};

export const getUserConnectionsMap = async (currentUserId: string): Promise<Record<string, 'pending' | 'accepted' | 'rejected'>> => {
    try {
        const connectionsRef = collection(db, 'connections');
        if (!currentUserId) return {};
        const q = query(connectionsRef, where('users', 'array-contains', currentUserId));
        const snapshot = await getDocs(q); // Fetch all connections for this user

        const map: Record<string, 'pending' | 'accepted' | 'rejected'> = {};
        snapshot.forEach(doc => {
            const data = doc.data() as Connection;
            const otherId = data.users.find(u => u !== currentUserId);
            if (otherId) {
                map[otherId] = data.status;
            }
        });
        return map;
    } catch (e) {
        console.warn("[DB] getUserConnectionsMap error:", e);
        return {};
    }
};

export const sendConnectionRequest = async (currentUserId: string, targetUserId: string) => {
    // Using deterministic ID prevents duplicates and ensures strong consistency
    const ids = [currentUserId, targetUserId].sort();
    const connectionId = ids.join('_');

    // Check if exists first to avoid overwriting existing status blindly
    // Check if exists first
    const existingConn = await getConnection(currentUserId, targetUserId);

    // If already accepted, do nothing
    if (existingConn && existingConn.status === 'accepted') return;

    // Otherwise (if none or pending), Upsert as Accepted directly (Instant Connection)
    const connRef = doc(db, 'connections', connectionId);
    await setDoc(connRef, {
        users: [currentUserId, targetUserId],
        requester: currentUserId,
        recipient: targetUserId,
        status: 'accepted',
        createdAt: existingConn ? existingConn.createdAt : new Date().toISOString()
    }, { merge: true });

    // Notify Recipient - MOVED TO CLOUD FUNCTIONS
    // try {
    //     const senderProfile = await getUserProfile(currentUserId);
    //     const name = senderProfile?.displayName || "Someone";
    //
    //     await createNotification(targetUserId, {
    //         type: 'follow',
    //         title: "New Connection",
    //         body: `${name} connected with you!`,
    //         link: `/profile/${currentUserId}`,
    //         senderId: currentUserId,
    //         isAnonymous: false
    //     });
    // } catch (e) {
    //     console.warn("Failed to notify connection", e);
    // }
};

export const getIncomingRequests = async (currentUserId: string) => {
    const connectionsRef = collection(db, 'connections');
    if (!currentUserId) return [];
    const q = query(
        connectionsRef,
        where('recipient', '==', currentUserId),
        where('status', '==', 'pending')
    );

    const snapshot = await getDocs(q);
    const requests: { connectionId: string; user: UserProfile }[] = [];

    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const userProfile = await getUserProfile(data.requester);
        if (userProfile) {
            requests.push({ connectionId: docSnap.id, user: userProfile });
        }
    }
    return requests;
};

export const respondToRequest = async (connectionId: string, status: 'accepted' | 'rejected') => {
    const connRef = doc(db, 'connections', connectionId);
    await updateDoc(connRef, { status });

    if (status === 'accepted') {
        try {
            // Fetch connection to get users
            const snap = await getDoc(connRef);
            if (snap.exists()) {
                const data = snap.data();
                // Notify the *requester* that the *recipient* accepted
                // requester is data.requester
                // recipient is data.recipient (who is calling this function usually)
                const requesterId = data.requester;
                const recipientId = data.recipient;

                // We need the recipient's name (the one who accepted) to show to requester
                const recipientProfile = await getUserProfile(recipientId);
                const name = recipientProfile?.displayName || "Someone";

                // MOVED TO CLOUD FUNCTIONS
                // await createNotification(requesterId, {
                //     type: 'follow',
                //     title: "Connection Accepted",
                //     body: `${name} accepted your connection request.`,
                //     link: `/profile/${recipientId}`,
                //     senderId: recipientId,
                //     isAnonymous: false
                // });
            }
        } catch (e) {
            console.warn("Failed to notify acceptance", e);
        }
    }
};

export const sendMessage = async (connectionId: string, senderId: string, text: string, attachment?: { type: 'image' | 'video' | 'file' | 'audio' | 'location' | 'shared_post' | 'story_mention', url?: string, name?: string, location?: { lat: number, lng: number }, postId?: string, postContent?: string, postAuthor?: string, postAuthorId?: string, storyId?: string }, isAnonymous: boolean = false) => {
    const messagesRef = collection(db, 'connections', connectionId, 'messages');
    const msgData: any = {
        senderId,
        text,
        createdAt: new Date().toISOString(),
        read: false,
        type: attachment ? attachment.type : 'text',
        isAnonymous
    };

    if (attachment) {
        if (attachment.url) msgData.fileUrl = attachment.url;
        if (attachment.name) msgData.fileName = attachment.name;
        if (attachment.location) msgData.location = attachment.location;
        if (attachment.postId) msgData.postId = attachment.postId;
        if (attachment.postContent) msgData.postContent = attachment.postContent;
        if (attachment.postAuthor) msgData.postAuthor = attachment.postAuthor;
        if (attachment.postAuthorId) msgData.postAuthorId = attachment.postAuthorId;
        if (attachment.storyId) msgData.storyId = attachment.storyId;
    }

    // Presentation Fields (Source of Truth)
    let displayName = 'Student';
    let displayBadge = '';
    let displayAvatar = null;

    if (isAnonymous) {
        displayName = 'Anonymous';
        try {
            const userProfile = await getUserProfile(senderId);
            if (userProfile) {
                const year = userProfile.year || '';
                const cleanYear = year.toLowerCase().endsWith('year') ? year.slice(0, -5) : year;
                displayBadge = `Verified ${cleanYear} Year`;
            }
        } catch (e) {
            console.warn("Failed to fetch profile for anonymous context", e);
        }
        // Strict: senderName/senderPhoto are undefined
    } else {
        // Fetch sender name if not provided? Usually ChatPage provides it via enrichment, 
        // but here we are in DB layer. We might need to fetch if we want it hardcoded.
        // BUT, existing system relies on client-side enrichment for non-anon.
        // Let's stick to storing what we know. 
        // If we want "displayName" to be robust, we should probably fetch it or cache it.
        // Or we can leave it undefined and let client fallback, BUT user requested "API response... must include presentation fields".
        // So we SHOULD fetch it.
        try {
            const userProfile = await getUserProfile(senderId);
            if (userProfile) {
                displayName = getSafeDisplayName(userProfile);
                displayAvatar = userProfile.photoURL || null;
            }
        } catch (e) { }
    }

    Object.assign(msgData, {
        displayName,
        displayBadge,
        displayAvatar,
        isAnonymous
    });
    // Remove explicit senderName/Photo from msgData if they were there (they weren't in previous step, but just to be sure)
    // postAuthor etc are kept.

    const docRef = await addDoc(messagesRef, msgData);

    // Trigger Notification for the Recipient - MOVED TO CLOUD FUNCTIONS
    // try {
    //     const [u1, u2] = connectionId.split('_');
    //     const recipientId = u1 === senderId ? u2 : u1;
    //
    //     if (recipientId) {
    //         let notificationTitle = isAnonymous ? 'New Anonymous Message' : `New Message from ${displayName}`;
    //         let notificationBody = text || 'Sent an attachment';
    //         if (attachment) {
    //             notificationBody = `Sent ${attachment.type === 'image' ? 'a photo' : 'an attachment'}`;
    //         }
    //
    //         await createNotification(recipientId, {
    //             type: 'message',
    //             title: notificationTitle,
    //             body: notificationBody,
    //             link: `/messages/${connectionId}`,
    //             senderId: senderId,
    //             isAnonymous: isAnonymous,
    //             metadata: {
    //                 connectionId,
    //                 messageId: docRef.id
    //             }
    //         });
    //     }
    // } catch (e) {
    //     console.warn("Error triggering notification in sendMessage:", e);
    // }

    const connRef = doc(db, 'connections', connectionId);

    // Streak Logic 🔥
    let newStreak = 1;
    let newStreakDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Fetch current data to calculate streak
    const connSnap = await getDoc(connRef);
    if (!connSnap.exists()) {
        const [u1, u2] = connectionId.split('_');
        await setDoc(connRef, {
            users: [u1, u2],
            requester: u1,
            recipient: u2,
            status: 'accepted',
            createdAt: new Date().toISOString(),
            lastMessage: isAnonymous ? 'Anonymous Message' : text,
            lastMessageTimestamp: new Date().toISOString(),
            [`unread_${u1 === senderId ? u2 : u1}`]: 1,
            lastMessageIsAnonymous: isAnonymous,
            lastMessageSenderId: senderId,
            streak: 1,
            lastStreakDate: newStreakDate
        });
        return; // Done for new doc
    }

    // Calculation for existing doc
    const data = connSnap.data() as Connection;
    const streak = data.streak || 0;
    const lastDate = data.lastStreakDate;
    const today = newStreakDate;

    if (lastDate) {
        const d1 = new Date(today);
        const d2 = new Date(lastDate);
        const diffTime = Math.abs(d1.getTime() - d2.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            newStreak = streak;
            if (newStreak === 0) newStreak = 1;
        } else if (diffDays === 1) {
            newStreak = streak + 1;
        } else {
            newStreak = 1;
        }
    }

    const otherUserId = data.users.find((u: string) => u !== senderId);
    const updates: any = {
        lastMessage: isAnonymous ? 'Anonymous Message' : text,
        lastMessageTimestamp: new Date().toISOString(),
        lastMessageIsAnonymous: isAnonymous,
        lastMessageSenderId: senderId,
        streak: newStreak,
        lastStreakDate: newStreakDate
    };

    if (otherUserId) {
        updates[`unread_${otherUserId}`] = true; // Or increment logic if you switch to counters
    }

    if (otherUserId) {
        updates[`unread_${otherUserId}`] = true; // Or increment logic if you switch to counters
    }

    await updateDoc(connRef, updates);
}

export const setTypingStatus = async (connectionId: string, userId: string, isTyping: boolean) => {
    try {
        const connRef = doc(db, 'connections', connectionId);
        // Use dot notation to update nested field without overwriting map
        await updateDoc(connRef, {
            [`typing.${userId}`]: isTyping
        });
    } catch (e) {
        // Silently fail typing status updates
    }
};


export const logCallHistory = async (connectionId: string, callerId: string, durationSeconds: number, wasMissed: boolean, isVideo: boolean) => {
    const messagesRef = collection(db, 'connections', connectionId, 'messages');

    // Format duration text
    let durationText = '';
    if (wasMissed) {
        durationText = 'Missed Call';
    } else {
        const mins = Math.floor(durationSeconds / 60);
        const secs = durationSeconds % 60;
        if (mins > 0) durationText = `${mins}m ${secs}s`;
        else durationText = `${secs}s`;
    }

    const msgData: any = {
        senderId: callerId,
        text: durationText, // We use 'text' property for the duration/status string
        createdAt: new Date().toISOString(),
        read: false,
        type: 'call_log',
        callInfo: {
            durationSeconds,
            wasMissed,
            isVideo
        }
    };

    const docRef = await addDoc(messagesRef, msgData);

    // Trigger Notification for the Recipient - MOVED TO CLOUD FUNCTIONS
    // if (recipientId) {
    //     let notificationTitle = 'New Call Log'; // Generic title for call logs
    //     let notificationBody = durationText; // Use the formatted duration text
    //
    //     await createNotification(recipientId, {
    //         type: 'call_log', // New type for call logs
    //         title: notificationTitle,
    //         body: notificationBody,
    //         link: `/messages/${connectionId}`,
    //         senderId: callerId,
    //         isAnonymous: false, // Call logs are not anonymous
    //         metadata: {
    //             connectionId,
    //             messageId: docRef.id,
    //             wasMissed,
    //             isVideo
    //         }
    //     });
    // }

    // Update last message in connection list safe upsert
    const connRef = doc(db, 'connections', connectionId);
    const icon = isVideo ? '📹' : '📞';
    const status = wasMissed ? 'Missed Call' : 'Call ended';
    const summary = `${icon} ${status}`;

    // We must ensure the users array exists if we are creating the doc
    const [u1, u2] = connectionId.split('_');
    // Basic validation to avoid writing garbage if id is malformed
    if (u1 && u2) {
        await setDoc(connRef, {
            users: [u1, u2], // Ensure users are set for queries
            lastMessage: summary,
            lastMessageTimestamp: new Date().toISOString(),
            // If it didn't exist, we should probably set other fields?
            // Existing logic assumes 'accepted' if we are calling?
            // If we just merge, we might miss 'status'. 
            // Better to harmlessly set status if missing? 
            // But we don't want to overwrite 'pending'.
            // setDoc merge won't overwrite status if it exists.
        }, { merge: true });
    } else {
        console.warn("Invalid connection ID for logCallHistory", connectionId);
    }
};

export const markConnectionAsRead = async (connectionId: string, userId: string) => {
    try {
        const connRef = doc(db, 'connections', connectionId);
        await updateDoc(connRef, {
            [`unread_${userId}`]: false
        });
    } catch (e) {
        // Silently fail as this is a background update
    }
};

export const subscribeToMessages = (connectionId: string, callback: (messages: { id: string;[key: string]: any }[]) => void) => {
    const messagesRef = collection(db, 'connections', connectionId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(messages);
    }, (err) => {
        console.warn("[DB] subscribeToMessages error:", err);
    });
};

export const getUserConversations = async (userId: string) => {
    if (!userId) return [];
    try {
        const connectionsRef = collection(db, 'connections');
        const q = query(
            connectionsRef,
            where('users', 'array-contains', userId),
            where('status', '==', 'accepted')
        );

        const snapshot = await getDocs(q);
        const conversations: (Connection & { otherUser: UserProfile | null })[] = [];

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const otherUserId = data.users.find((u: string) => u !== userId);
            const otherUser = await getUserProfile(otherUserId);

            conversations.push({
                id: docSnap.id,
                ...(data as Omit<Connection, 'id'>),
                otherUser
            });
        }

        // Client-side sort by lastMessageTimestamp (descending)
        return conversations.sort((a, b) => { // @ts-ignore
            return new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime();
        });
    } catch (e) {
        console.warn("[DB] getUserConversations error:", e);
        return [];
    }
};

// --- Groups ---

export interface Group {
    id: string; // "College_Course_Year" e.g., "MIT_CS_2nd" or Random ID for custom
    name: string;
    type: 'module' | 'custom' | 'channel';
    privacy?: 'open' | 'private'; // 'open' = discoverable, 'private' = invite only
    description?: string;
    admins?: string[]; // UIDs of admins
    icon?: string;     // Emoji or URL

    college?: string; // Optional for custom
    course?: string; // Optional for custom
    year?: string;   // Optional for custom

    members: string[]; // Array of UIDs
    createdAt: string;
    lastMessage?: string;
    lastMessageTimestamp?: string;
    channels?: Channel[]; // List of available channels
    projectId?: string; // Optional link to project
}

export interface Channel {
    id: string;
    name: string;
    type: 'text' | 'announcement';
    icon?: string;
}

export const getUserGroups = async (userId: string): Promise<Group[]> => {
    if (!userId) return [];
    try {
        const groupsRef = collection(db, 'groups');
        const q = query(groupsRef, where('members', 'array-contains', userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Group));
    } catch (e) {
        console.warn("[DB] getUserGroups error:", e);
        return [];
    }
};

export const getDiscoverableGroups = async (userId: string, college?: string): Promise<Group[]> => {
    try {
        const groupsRef = collection(db, 'groups');
        // Simple query for open groups
        // In production, you'd want composite indexes for college + privacy
        let q = query(groupsRef, where('privacy', '==', 'open'), limit(50));

        const snapshot = await getDocs(q);
        const groups = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Group));

        // Filter out groups I'm already in
        // Filter by college if provided (client side for simplicity mostly)
        return groups.filter(g => !g.members.includes(userId) && (!college || !g.college || g.college === college));
    } catch (e) {
        console.warn("[DB] getDiscoverableGroups error:", e);
        return [];
    }
};

export const createCustomGroup = async (name: string, creatorId: string, type: 'custom' | 'channel' = 'custom', privacy: 'open' | 'private' = 'private', description: string = '') => {
    const groupsRef = collection(db, 'groups');
    const newGroup: Omit<Group, 'id'> = {
        name,
        type,
        privacy,
        description,
        admins: [creatorId],
        members: [creatorId], // Ensure creator is memeber
        createdAt: new Date().toISOString(),
        icon: type === 'channel' ? '📢' : '👥'
    };
    const docRef = await addDoc(groupsRef, newGroup);
    return { ...newGroup, id: docRef.id };
};

export const requestToJoinGroup = async (groupId: string, userId: string) => {
    const requestRef = doc(db, 'groups', groupId, 'requests', userId);
    await setDoc(requestRef, {
        userId,
        createdAt: new Date().toISOString(),
        status: 'pending'
    });
};

export const getGroupRequests = async (groupId: string) => {
    try {
        const requestsRef = collection(db, 'groups', groupId, 'requests');
        const snap = await getDocs(requestsRef);
        const requests: { id: string, userId: string, user?: UserProfile }[] = [];

        for (const d of snap.docs) {
            const data = d.data();
            const user = await getUserProfile(data.userId);
            if (user) requests.push({ id: d.id, userId: data.userId, user });
        }
        return requests;
    } catch (e) {
        console.warn("[DB] getGroupRequests error:", e);
        return [];
    }
};

export const approveJoinRequest = async (groupId: string, userId: string) => {
    const batch = writeBatch(db);

    // Add to members
    const groupRef = doc(db, 'groups', groupId);
    batch.update(groupRef, { members: arrayUnion(userId) });

    // Delete request
    const requestRef = doc(db, 'groups', groupId, 'requests', userId);
    batch.delete(requestRef);

    await batch.commit();
};

export const rejectJoinRequest = async (groupId: string, userId: string) => {
    const requestRef = doc(db, 'groups', groupId, 'requests', userId);
    await deleteDoc(requestRef);
};

export const promoteToAdmin = async (groupId: string, userId: string) => {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, { admins: arrayUnion(userId) });
};

export const demoteAdmin = async (groupId: string, userId: string) => {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, { admins: arrayRemove(userId) });
};

export const addGroupMember = async (groupId: string, userId: string) => {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
        members: arrayUnion(userId)
    });
};

export const removeGroupMember = async (groupId: string, userId: string) => {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
        members: arrayRemove(userId),
        admins: arrayRemove(userId) // Also remove admin if they leave
    });
};

export const getGroupMembers = async (groupId: string): Promise<string[]> => {
    try {
        const groupRef = doc(db, 'groups', groupId);
        const snap = await getDoc(groupRef);
        if (snap.exists()) {
            return snap.data().members || [];
        }
    } catch (e) {
        console.warn("[DB] getGroupMembers error:", e);
    }
    return [];
};

export const getOrJoinModuleGroup = async (userId: string, college: string, course: string, year: string): Promise<Group | null> => {
    if (!college || !course || !year) return null;

    try {
        // Create deterministic Group ID
        const groupId = `${college}_${course}_${year}`.replace(/\s+/g, '_').toUpperCase();
        const groupRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupRef);

        if (groupSnap.exists()) {
            const groupData = groupSnap.data() as Group;
            const updates: any = {};

            // Auto-join if not already a member
            if (!groupData.members.includes(userId)) {
                updates.members = arrayUnion(userId);
                // Update local object to reflect change
                groupData.members.push(userId);
            }

            // Auto-Admin: If no admins exist, make this user an admin
            if (!groupData.admins || groupData.admins.length === 0) {
                updates.admins = [userId];
                groupData.admins = [userId];
            }

            if (Object.keys(updates).length > 0) {
                await updateDoc(groupRef, updates);
            }

            return { ...groupData, id: groupId };
        } else {
            // Create new group
            const newGroup: Group = {
                id: groupId,
                name: `${course} - ${year} Year`,
                type: 'module',
                college,
                course,
                year,
                members: [userId],
                admins: [userId], // First member is admin
                createdAt: new Date().toISOString(),
                icon: '🎓'
            };
            await setDoc(groupRef, newGroup);
            return newGroup;
        }
    } catch (e) {
        console.warn("[DB] getOrJoinModuleGroup error:", e);
        return null;
    }
};

export const createChannel = async (groupId: string, name: string, type: 'text' | 'announcement' = 'text') => {
    const groupRef = doc(db, 'groups', groupId);
    const newChannel: Channel = {
        id: name.toLowerCase().replace(/\s+/g, '-'), // Simple ID generation
        name,
        type
    };
    await updateDoc(groupRef, {
        channels: arrayUnion(newChannel)
    });
    return newChannel;
};

export const getUserConnections = async (userId: string): Promise<UserProfile[]> => {
    if (!userId) return [];
    try {
        const connectionsRef = collection(db, 'connections');
        // Simplified query to avoid composite index requirement
        const q = query(
            connectionsRef,
            where('users', 'array-contains', userId)
        );

        const snapshot = await getDocs(q);
        const friends: UserProfile[] = [];

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            // Client-side filtering for status
            if (data.status !== 'accepted') continue;

            const otherUserId = data.users.find((u: string) => u !== userId);
            if (otherUserId) {
                const profile = await getUserProfile(otherUserId);
                if (profile) friends.push(profile);
            }
        }
        return friends;
    } catch (e) {
        console.warn("[DB] getUserConnections error:", e);
        return [];
    }
};

// --- Group Messaging ---

export interface GroupMessage {
    id?: string;
    senderId: string;
    text: string;
    createdAt: string;
    type: 'text' | 'image' | 'file' | 'audio';
    fileUrl?: string;
    fileName?: string;
    channelId?: string; // New Field
    isAnonymous?: boolean; // New Field
}

export const sendGroupMessage = async (groupId: string, senderId: string, text: string, attachment?: { type: 'image' | 'video' | 'file' | 'audio' | 'location', url?: string, name?: string, location?: { lat: number, lng: number } }, channelId: string = 'general', isAnonymous: boolean = false) => {
    try {
        const messagesRef = collection(db, 'groups', groupId, 'messages');
        const msgData: any = {
            senderId,
            text,
            createdAt: new Date().toISOString(),
            type: attachment ? attachment.type : 'text',
            channelId, // Store channel ID
            isAnonymous
        };

        if (attachment) {
            if (attachment.url) msgData.fileUrl = attachment.url;
            if (attachment.name) msgData.fileName = attachment.name;
            if (attachment.location) msgData.location = attachment.location;
        }

        await addDoc(messagesRef, msgData);

        const groupRef = doc(db, 'groups', groupId);
        /*
         * Construct summary text based on attachment type
         */
        let summaryText = text;
        if (attachment) {
            switch (attachment.type) {
                case 'image': summaryText = '📷 Sent a photo'; break;
                case 'video': summaryText = '🎥 Sent a video'; break;
                case 'file': summaryText = '📄 Sent a file'; break;
                case 'location': summaryText = '📍 Shared location'; break;
                case 'audio': summaryText = '🎤 Sent an audio clip'; break;
            }
        }

        await updateDoc(groupRef, {
            lastMessage: summaryText,
            lastMessageTimestamp: new Date().toISOString()
        });
    } catch (e) {
        console.warn("[DB] sendGroupMessage error:", e);
        throw e;
    }
};

export const subscribeToGroupMessages = (groupId: string, callback: (messages: GroupMessage[]) => void, channelId: string = 'general') => {
    const messagesRef = collection(db, 'groups', groupId, 'messages');

    // Note: To strictly filter server-side, we need a composite index on channelId + createdAt.
    // To avoid blocking development with index creation, we will filter client-side for now.
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as GroupMessage))
            .filter(msg => {
                // If message has no channelId, treat as 'general'
                // If channelId is 'general', include empty ones too
                const msgChannel = msg.channelId || 'general';
                return msgChannel === channelId;
            });

        callback(messages);
    }, (err) => {
        console.warn("[DB] subscribeToGroupMessages error:", err);
    });
};

// Helper: Haversine Formula for distance in km
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return Math.round(d * 10) / 10; // Round to 1 decimal place
};

// Smart Suggestions Logic
export const getSmartSuggestions = async (currentUserId: string): Promise<UserProfile[]> => {
    try {
        // 1. Get current user profile to know their city/skills
        const currentUser = await getUserProfile(currentUserId);
        if (!currentUser) return [];

        // 2. Get all users (optimize in prod to query by city directly)
        const usersRef = collection(db, 'users');
        const q = query(usersRef, limit(50));
        const snapshot = await getDocs(q);

        const suggestions: UserProfile[] = [];

        // 3. Filter and Rank
        snapshot.docs.forEach(doc => {
            if (doc.id === currentUserId) return;
            const data = doc.data();
            const user = { ...data, uid: doc.id } as UserProfile;

            // Calculate Score
            let score = 0;

            // Distance Calculation
            let distance: number | string = 'Unknown';
            if (currentUser.location && user.location) {
                distance = calculateDistance(
                    currentUser.location.lat,
                    currentUser.location.lng,
                    user.location.lat,
                    user.location.lng
                );

                // Boost score for nearby users
                if (typeof distance === 'number') {
                    if (distance < 5) score += 20;
                    else if (distance < 20) score += 10;
                    else if (distance < 50) score += 5;
                }
            }

            // Fallback to City Match if no exact location
            const userCity = user.city?.toLowerCase().trim() || '';
            const myCity = currentUser.city?.toLowerCase().trim() || '';
            const sameCity = userCity && myCity && userCity === myCity;

            if (sameCity) {
                score += 10;
            }

            // College Match (Very High Weight for Students)
            const userCollege = user.college?.toLowerCase().trim() || '';
            const myCollege = currentUser.college?.toLowerCase().trim() || '';
            const sameCollege = userCollege && myCollege && userCollege === myCollege;
            if (sameCollege) {
                score += 15;
            }

            // Course Match
            const userCourse = user.course?.toLowerCase().trim() || '';
            const myCourse = currentUser.course?.toLowerCase().trim() || '';
            if (userCourse && myCourse && userCourse === myCourse) {
                score += 5;
            }

            // Interest Match (Medium Weight)
            const userInterests = user.interests || [];
            const myInterests = currentUser.interests || [];
            const commonInterests = userInterests.filter(i =>
                myInterests.some(mi => mi.toLowerCase() === i.toLowerCase())
            );
            score += commonInterests.length * 2;

            // @ts-ignore - Improved fallback: if same city/college, estimate 2km, else 50km
            user.distance = typeof distance === 'number' ? distance : (sameCity || sameCollege ? 2.5 : undefined);
            // @ts-ignore
            user.distanceVal = typeof distance === 'number' ? distance : (sameCity || sameCollege ? 2.5 : 999999);

            if (score > 0 || typeof distance === 'number') {
                // @ts-ignore
                user.score = score;
                suggestions.push(user);
            }
        });

        // Sort by Distance ASC, then by Score DESC
        return suggestions.sort((a, b) => {
            // @ts-ignore
            const distA = a.distanceVal;
            // @ts-ignore
            const distB = b.distanceVal;

            if (distA !== distB) {
                return distA - distB; // Closer first
            }
            // @ts-ignore
            return (b.score || 0) - (a.score || 0); // High match second
        });
    } catch (e) {
        console.warn("[DB] getSmartSuggestions error:", e);
        return [];
    }
};

// --- Feed / Posts ---

export interface Post {
    id: string;
    authorId: string;
    authorName: string;
    authorCollege: string; // To show "from XYZ College"
    content: string;
    imageUrl?: string;
    videoUrl?: string; // [Planned]
    likes: number;
    likedBy: string[]; // Array of UIDs
    commentCount: number;
    createdAt: string;
    scope: 'college' | 'city' | 'global';
    city?: string; // For city-wide posts
    isAnonymous?: boolean;
    category?: 'Notes' | 'PYQ' | 'Doubts' | 'Coding' | 'Placement' | 'Projects' | 'General' | 'UI';
    xpAwarded?: boolean; // Track if +10 XP was awarded to author
    authorPhotoURL?: string;
}

export interface Comment {
    id: string;
    authorId: string;
    authorName: string;
    content: string;
    imageUrl?: string;
    createdAt: string;
    isAnonymous?: boolean;
    authorPhotoURL?: string;
}

export const createPost = async (postData: Omit<Post, 'id' | 'likes' | 'likedBy' | 'commentCount' | 'createdAt'>) => {
    const postsRef = collection(db, 'posts');
    const newPost = {
        ...postData,
        category: postData.category || 'General',
        likes: 0,
        likedBy: [],
        commentCount: 0,
        createdAt: new Date().toISOString()
    };

    // Clean undefined
    Object.keys(newPost).forEach(key => (newPost as any)[key] === undefined && delete (newPost as any)[key]);

    const docRef = await addDoc(postsRef, newPost);
    return { ...newPost, id: docRef.id };
};

export const getPosts = async (user: UserProfile, scope: 'college' | 'city' | 'global' = 'college', category?: string, sortBy: 'latest' | 'foryou' = 'latest') => {
    const postsRef = collection(db, 'posts');
    let q;

    // 1. Scope Filtering
    if (scope === 'college') {
        if (!user.college) return []; // Cannot search college posts if user has no college set
        q = query(postsRef, where('scope', '==', 'college'), where('authorCollege', '==', user.college));
    } else if (scope === 'city') {
        if (!user.city) return []; // Cannot search city posts if user has no city set
        q = query(postsRef, where('scope', '==', 'city'), where('city', '==', user.city));
    } else {
        q = query(postsRef, where('scope', '==', 'global'));
    }

    try {
        const snapshot = await getDocs(q);

        // Fetch Hidden Posts for this user
        const hiddenRef = collection(db, 'users', user.uid, 'hidden_posts');
        const hiddenSnap = await getDocs(hiddenRef);
        const hiddenIds = new Set(hiddenSnap.docs.map(d => d.id));

        let posts = snapshot.docs
            .map(doc => {
                const data = doc.data() as Post;
                // MASKING LOGIC 🎭
                if (data.isAnonymous) {
                    return {
                        ...data,
                        id: doc.id,
                        authorId: 'anonymous',
                        authorName: 'Anonymous Student',
                        authorCollege: data.authorCollege || 'University',
                    };
                }
                return { ...data, id: doc.id };
            })
            .filter(post => !hiddenIds.has(post.id)); // Exclude hidden posts

        // 2. Category Filtering (Client-side to avoid complex composite indexes for now)
        if (category && category !== 'All') {
            posts = posts.filter(p => p.category === category);
        }

        // 3. Sorting
        if (sortBy === 'foryou') {
            // Simple Recommendation Score
            posts = posts.sort((a, b) => {
                let scoreA = 0;
                let scoreB = 0;

                // College Match (High Priority)
                if (a.authorCollege === user.college) scoreA += 10;
                if (b.authorCollege === user.college) scoreB += 10;

                // Recent Boost (< 24h)
                const now = Date.now();
                const freshA = (now - new Date(a.createdAt).getTime()) < 86400000;
                const freshB = (now - new Date(b.createdAt).getTime()) < 86400000;
                if (freshA) scoreA += 5;
                if (freshB) scoreB += 5;

                // Sort DESC by score, then by time
                if (scoreA !== scoreB) return scoreB - scoreA;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
        } else {
            // Latest
            posts = posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        return posts;
    } catch (e) {
        console.warn("Error fetching posts:", e);
        return [];
    }
};

// --- Feed Actions ---

export const savePost = async (userId: string, post: Post) => {
    const savedRef = doc(db, 'users', userId, 'saved_posts', post.id);
    await setDoc(savedRef, {
        postId: post.id,
        savedAt: new Date().toISOString(),
        preview: {
            authorName: post.authorName,
            content: post.content.substring(0, 100),
            imageUrl: post.imageUrl || null,
            category: post.category || 'General'
        }
    });

    // --- XP: Post Saved (+10 XP) ---
    try {
        if (userId !== post.authorId) {
            const postRef = doc(db, 'posts', post.id);
            const postSnap = await getDoc(postRef);
            if (postSnap.exists()) {
                const postData = postSnap.data() as Post;
                if (!postData.xpAwarded) {
                    await updateDoc(postRef, { xpAwarded: true });
                    await addXp(post.authorId, 10, `save_${post.id}`);
                }
            }
        }
    } catch (e) {
        console.warn("XP Feed Save Award Failed", e);
    }
};

export const unsavePost = async (userId: string, postId: string) => {
    await deleteDoc(doc(db, 'users', userId, 'saved_posts', postId));
};

export const getSavedPosts = async (userId: string) => {
    try {
        const savedRef = collection(db, 'users', userId, 'saved_posts');
        const snapshot = await getDocs(savedRef);
        // We basically need to re-fetch full posts or rely on preview?
        // User requested "Saved posts appear in a new tab".
        // Better to fetch fresh data in case it was deleted/edited.

        const postIds = snapshot.docs.map(d => d.id);
        if (postIds.length === 0) return [];

        // Parallel fetch (max 10 for demo, ideally batched)
        // Firestore "in" query allows up to 10
        // We'll just fetch individual docs
        const posts: Post[] = [];
        for (const pid of postIds) {
            const pDoc = await getDoc(doc(db, 'posts', pid));
            if (pDoc.exists()) {
                posts.push({ id: pDoc.id, ...pDoc.data() } as Post);
            }
        }
        return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
        console.warn("[DB] getSavedPosts error:", e);
        return [];
    }
};

export const checkIsSaved = async (userId: string, postId: string) => {
    try {
        const docSnap = await getDoc(doc(db, 'users', userId, 'saved_posts', postId));
        return docSnap.exists();
    } catch (e) {
        console.warn("[DB] checkIsSaved error:", e);
        return false;
    }
}

export const hidePost = async (userId: string, postId: string) => {
    await setDoc(doc(db, 'users', userId, 'hidden_posts', postId), {
        hiddenAt: new Date().toISOString()
    });
};

export const reportPost = async (postId: string, reporterId: string, reason: string) => {
    await addDoc(collection(db, 'reports'), {
        targetType: 'post',
        targetId: postId,
        reporterId,
        reason,
        status: 'pending',
        createdAt: new Date().toISOString()
    });
};

export const toggleLikePost = async (postId: string, userId: string) => {
    try {
        const postRef = doc(db, 'posts', postId);
        const postSnap = await getDoc(postRef);
        if (!postSnap.exists()) return;

        const data = postSnap.data();
        const likedBy = data.likedBy || [];
        const isLiked = likedBy.includes(userId);

        if (isLiked) {
            await updateDoc(postRef, {
                likes: increment(-1),
                likedBy: arrayRemove(userId)
            });
        } else {
            await updateDoc(postRef, {
                likes: increment(1),
                likedBy: arrayUnion(userId)
            });
            // --- XP: Post Liked (+2 XP) ---
            addXp(data.authorId, 2, `like_${postId}`);
        }
    } catch (e) {
        console.warn("[DB] toggleLikePost error:", e);
    }
};

export const addComment = async (postId: string, commentData: { authorId: string, authorName: string, content: string, imageUrl?: string, isAnonymous?: boolean, authorPhotoURL?: string }) => {
    const commentsRef = collection(db, 'posts', postId, 'comments');
    const data = {
        ...commentData,
        createdAt: new Date().toISOString()
    };
    Object.keys(data).forEach(key => (data as any)[key] === undefined && delete (data as any)[key]);

    await addDoc(commentsRef, data);

    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
        commentCount: increment(1)
    });
};

export const getComments = async (postId: string) => {
    try {
        const commentsRef = collection(db, 'posts', postId, 'comments');
        const q = query(commentsRef, orderBy('createdAt', 'asc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data() as Comment;
            if (data.isAnonymous) {
                return {
                    ...data,
                    id: doc.id,
                    authorId: 'anonymous',
                    authorName: 'Anonymous Student',
                    // Masking profile pic logic handled in UI by checking isAnonymous
                };
            }
            return { ...data, id: doc.id };
        });
    } catch (e) {
        console.warn("[DB] getComments error:", e);
        return [];
    }
};



export interface Resource {
    id: string;
    title: string;
    description: string;
    type: 'note' | 'paper' | 'syllabus';
    fileUrl: string;
    fileName: string;
    uploaderId: string;
    uploaderName: string;
    college: string;
    course: string;
    year: string;
    downloads: number;
    upvotes: number;
    upvotedBy: string[];
    commentCount?: number;
    createdAt: string;
    isAnonymous?: boolean;
    uploaderPhotoURL?: string;
}

export const createResource = async (resourceData: Omit<Resource, 'id' | 'downloads' | 'upvotes' | 'upvotedBy' | 'createdAt'>) => {
    const resourcesRef = collection(db, 'resources');
    const newResource = {
        ...resourceData,
        downloads: 0,
        upvotes: 0,
        upvotedBy: [],
        createdAt: new Date().toISOString()
    };
    const docRef = await addDoc(resourcesRef, newResource);
    return { ...newResource, id: docRef.id };
};

export const getResources = async (filters: { college?: string; course?: string; year?: string; type?: string }) => {
    try {
        const resourcesRef = collection(db, 'resources');
        let q = query(resourcesRef);

        if (filters.college) {
            q = query(q, where('college', '==', filters.college));
        }

        const snapshot = await getDocs(q);
        let resources = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resource));

        // Client-side filtering for flexibility
        if (filters.college) {
            resources = resources.filter(r => !r.college || r.college.toLowerCase().includes(filters.college!.toLowerCase()) || filters.college!.toLowerCase().includes(r.college.toLowerCase()));
        }

        // Client-side filtering for flexibility
        if (filters.course) {
            resources = resources.filter(r => r.course.toLowerCase().includes(filters.course!.toLowerCase()));
        }
        if (filters.year) {
            resources = resources.filter(r => r.year === filters.year);
        }
        if (filters.type && filters.type !== 'all') {
            resources = resources.filter(r => r.type === filters.type);
        }

        // Client-side sort
        return resources.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
        console.warn("[DB] getResources error:", e);
        return [];
    }
};

export const toggleUpvoteResource = async (resourceId: string, userId: string) => {
    const resRef = doc(db, 'resources', resourceId);
    const resSnap = await getDoc(resRef);
    if (!resSnap.exists()) return;

    const data = resSnap.data();
    const upvotedBy = data.upvotedBy || [];
    const isUpvoted = upvotedBy.includes(userId);

    if (isUpvoted) {
        await updateDoc(resRef, {
            upvotes: increment(-1),
            upvotedBy: arrayRemove(userId)
        });
    } else {
        await updateDoc(resRef, {
            upvotes: increment(1),
            upvotedBy: arrayUnion(userId)
        });
    }
};

export const incrementDownloadCount = async (resourceId: string) => {
    const resRef = doc(db, 'resources', resourceId);
    await updateDoc(resRef, {
        downloads: increment(1)
    });
};

export const addResourceComment = async (resourceId: string, commentData: { authorId: string, authorName: string, content: string }) => {
    const commentsRef = collection(db, 'resources', resourceId, 'comments');
    const data = {
        ...commentData,
        createdAt: new Date().toISOString()
    };
    await addDoc(commentsRef, data);

    const resRef = doc(db, 'resources', resourceId);
    await updateDoc(resRef, {
        commentCount: increment(1)
    });
};

export const getResourceComments = async (resourceId: string) => {
    try {
        const commentsRef = collection(db, 'resources', resourceId, 'comments');
        const q = query(commentsRef, orderBy('createdAt', 'asc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
    } catch (e) {
        console.warn("[DB] getResourceComments error:", e);
        return [];
    }
};

// --- Message Features ---

// Mark all unread messages in a chat as read for a specific user
export const markMessagesAsRead = async (chatId: string, userId: string) => {
    const messagesRef = collection(db, 'connections', chatId, 'messages');
    // Query unread messages where sender is NOT the current user
    if (!userId) return;
    const q = query(messagesRef, where('read', '==', false), where('senderId', '!=', userId));
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { read: true });
    });

    // Also reset the connection-level unread counter
    const connRef = doc(db, 'connections', chatId);
    batch.update(connRef, { [`unread_${userId}`]: false });

    await batch.commit();
};

// Delete a message
export const deleteMessage = async (chatId: string, messageId: string, forEveryone: boolean, userId: string) => {
    const msgRef = doc(db, 'connections', chatId, 'messages', messageId);

    if (forEveryone) {
        // "Delete for Everyone" - Update content to show deleted state
        await updateDoc(msgRef, {
            type: 'deleted',
            text: '', // Clear content
            fileUrl: deleteField(),
            fileName: deleteField(),
            location: deleteField(),
            postId: deleteField(),
            postContent: deleteField(),
            postAuthor: deleteField(),
            deletedAt: new Date().toISOString()
        });
    } else {
        // "Delete for Me" - Add user to deletedFor array
        await updateDoc(msgRef, {
            deletedFor: arrayUnion(userId)
        });
    }
};

// --- Profile Content ---

export const getUserPosts = async (userId: string) => {
    if (!userId) return [];
    try {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, where('authorId', '==', userId));
        const snapshot = await getDocs(q);
        const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Client-side sort
        return posts.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
        console.warn("[DB] getUserPosts error:", e);
        return [];
    }
};

export const getUserResources = async (userId: string) => {
    if (!userId) return [];
    try {
        const resRef = collection(db, 'resources');
        // Note: Field is 'uploaderId' in Resource interface, checking consistency
        const q = query(resRef, where('uploaderId', '==', userId));
        const snapshot = await getDocs(q);
        const resources = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Client-side sort
        return resources.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
        console.warn("[DB] getUserResources error:", e);
        return [];
    }
};

// --- Stories & Highlights ---

export interface Story {
    id: string;
    authorId: string;
    authorName: string;
    authorPhotoURL?: string;
    mediaUrl: string;
    type: 'image' | 'video';
    createdAt: string;
    expiresAt: string;
    viewers: string[];
    likedBy?: string[]; // New: List of UIDs who liked the story
    scope: 'college' | 'city' | 'global';
    college?: string;
    city?: string;
    overlays?: StoryOverlay[];
}

export interface StoryOverlay {
    id: string;
    type: 'text' | 'mention' | 'music' | 'location' | 'sticker' | 'emoji';
    content: string; // text, userId, songUrl, locationName, emoji
    style?: {
        x: number; // percentage 0-100
        y: number; // percentage 0-100
        scale?: number;
        rotation?: number;
        color?: string;
        fontSize?: number;
    };
    meta?: any; // e.g. songTitle, artist, fullUserName
}

export interface Highlight {
    id: string;
    title: string;
    coverUrl: string;       // URL of the first story's media usually
    stories: Story[];        // Copied story data
    createdAt: string;
}

export const createStory = async (storyData: Omit<Story, 'id' | 'createdAt' | 'expiresAt' | 'viewers'>) => {
    const storiesRef = collection(db, 'stories');
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const newStory: any = {
        ...storyData,
        createdAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        viewers: [],
        likedBy: [],
    };

    // Recursively remove undefined fields
    const cleanUndefined = (obj: any): any => {
        if (Array.isArray(obj)) {
            return obj.map(v => cleanUndefined(v));
        } else if (obj !== null && typeof obj === 'object') {
            return Object.keys(obj).reduce((acc, key) => {
                if (obj[key] !== undefined) {
                    acc[key] = cleanUndefined(obj[key]);
                }
                return acc;
            }, {} as any);
        }
        return obj;
    };

    const cleanedStory = cleanUndefined(newStory);

    const docRef = await addDoc(storiesRef, cleanedStory);
    return { ...cleanedStory, id: docRef.id };
};

export const deleteStory = async (storyId: string) => {
    await deleteDoc(doc(db, 'stories', storyId));
};

export const getStories = async (user: UserProfile, scope: 'college' | 'city' | 'global' = 'college') => {
    const storiesRef = collection(db, 'stories');
    const now = new Date().toISOString();

    // Filter Active Stories
    const q = query(storiesRef, where('expiresAt', '>', now));

    try {
        const snapshot = await getDocs(q);
        let stories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));

        // Client-side scope filtering to avoid composite index issues
        if (scope === 'college' && user.college) {
            stories = stories.filter(s => s.scope === 'college' && s.college === user.college);
        } else if (scope === 'city' && user.city) {
            stories = stories.filter(s => s.scope === 'city' && s.city === user.city);
        } else if (scope === 'global') {
            stories = stories.filter(s => s.scope === 'global');
        }

        return stories.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } catch (e) {
        console.warn("Error fetching stories:", e);
        return [];
    }
};

export const viewStory = async (storyId: string, viewerId: string) => {
    const storyRef = doc(db, 'stories', storyId);
    await updateDoc(storyRef, {
        viewers: arrayUnion(viewerId)
    });
};

export const likeStory = async (storyId: string, userId: string, isLiked: boolean) => {
    const storyRef = doc(db, 'stories', storyId);
    if (isLiked) {
        await updateDoc(storyRef, {
            likedBy: arrayUnion(userId)
        });
    } else {
        await updateDoc(storyRef, {
            likedBy: arrayRemove(userId)
        });
    }
};

export const createHighlight = async (userId: string, title: string, coverUrl: string, stories: Story[]) => {
    const highlightsRef = collection(db, 'users', userId, 'highlights');
    const newHighlight = {
        title,
        coverUrl,
        stories,
        createdAt: new Date().toISOString()
    };
    const docRef = await addDoc(highlightsRef, newHighlight);
    return { ...newHighlight, id: docRef.id };
};

export const getHighlights = async (userId: string) => {
    try {
        const highlightsRef = collection(db, 'users', userId, 'highlights');
        const q = query(highlightsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Highlight));
    } catch (e) {
        console.warn("[DB] getHighlights error:", e);
        return [];
    }
};

export const deleteHighlight = async (userId: string, highlightId: string) => {
    const highlightRef = doc(db, 'users', userId, 'highlights', highlightId);
    await deleteDoc(highlightRef);
};

// --- Notifications ---

export type NotificationType = 'message' | 'call' | 'call_log' | 'like' | 'comment' | 'follow' | 'birthday' | 'system' | 'smart_alert' | 'project_alert' | 'feedback_reply';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    link: string;
    seen: boolean;
    createdAt: string;
    senderId?: string;
    isAnonymous?: boolean;
    metadata?: any;
    senderPhotoURL?: string;
}

export const createNotification = async (userId: string, notification: Omit<Notification, 'id' | 'createdAt' | 'seen'>) => {
    if (!userId) return;
    try {
        // Check Preferences first
        const userProfile = await getUserProfile(userId);
        if (userProfile && userProfile.notificationPreferences) {
            const prefs = userProfile.notificationPreferences;
            // Map notification types to preference keys
            const typeToKey: Record<string, keyof NotificationPreferences> = {
                'message': 'messages',
                'call': 'calls',
                'call_log': 'calls', // Map call_log to calls preference
                'birthday': 'birthdays',
                'like': 'likes',
                'comment': 'comments',
                'follow': 'follows',
                'system': 'smartAlerts' // System usually acts as smart alert or critical
            };

            const prefKey = typeToKey[notification.type];
            // If explicit preference is false, block it. undefined means true (default).
            if (prefKey && prefs[prefKey] === false) {
                console.log(`🚫 Blocked notification ${notification.type} for ${userId} due to preferences.`);
                return;
            }

            // Special check for Anonymous
            if (notification.isAnonymous && prefs.anonymous === false) {
                console.log(`🚫 Blocked anonymous notification for ${userId} due to preferences.`);
                return;
            }
        }

        const notificationsRef = collection(db, 'users', userId, 'notifications');
        await addDoc(notificationsRef, {
            ...notification,
            createdAt: new Date().toISOString(),
            seen: false
        });
    } catch (e) {
        console.warn("Error creating notification:", e);
    }
};

export const updateNotificationPreferences = async (userId: string, preferences: Partial<NotificationPreferences>) => {
    const userRef = doc(db, 'users', userId);
    // Merge deeply? No, just replace the map keys provided
    // We need to use dot notation for nested updates to avoid wiping other fields if we use setDoc merge, 
    // but here we are updating a map field. 
    // Actually, Firestore update with dot notation is best: "notificationPreferences.messages": true

    // Construct dot notation update
    const updates: any = {};
    Object.keys(preferences).forEach(key => {
        updates[`notificationPreferences.${key}`] = preferences[key as keyof NotificationPreferences];
    });

    await updateDoc(userRef, updates);
};

export const markNotificationAsRead = async (userId: string, notificationId: string) => {
    try {
        const notifRef = doc(db, 'users', userId, 'notifications', notificationId);
        await updateDoc(notifRef, { seen: true });
    } catch (e) {
        console.warn("Error marking notification as read:", e);
    }
};

export const subscribeToNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    // Limit to latest 20
    const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(20));

    return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        callback(notifications);
    }, (err) => {
        console.warn("[DB] subscribeToNotifications error:", err);
    });
};

// --- Call Stats ---

export async function updateUserCallStats(uid: string, durationSeconds: number, rating?: 'helpful' | 'not_helpful') {
    if (!uid) return;
    try {
        const userRef = doc(db, 'users', uid);
        const updates: any = {
            totalCallMinutes: increment(Math.ceil(durationSeconds / 60)),
            callsCount: increment(1),
            lastActive: serverTimestamp()
        };

        if (rating === 'helpful') {
            updates.helpfulCount = increment(1);
        }

        await updateDoc(userRef, updates);
    } catch (error) {
        console.warn("Error updating call stats:", error);
    }
}
// --- Global Call Logs (Schema Matching) ---
// Based on user request:
/*
{
  "callId": "uuid",
  "fromUser": "userA",
  "toUser": "userB",
  "type": "video | voice",
  "direction": "incoming | outgoing",
  "status": "completed | missed | rejected | failed",
  "startedAt": "...",
  "endedAt": "...",
  "duration": 792
}
*/
export async function logCallEvent(data: {
    callId: string;
    fromUser: string;
    toUser: string;
    type: 'video' | 'voice';
    direction: 'incoming' | 'outgoing';
    status: 'completed' | 'missed' | 'rejected' | 'failed' | 'ended';
    startedAt: string;
    endedAt?: string;
    duration?: number;
}) {
    if (!data.callId) return;
    try {
        const logRef = doc(db, 'call_logs', data.callId);
        // Clean up undefined
        const payload = JSON.parse(JSON.stringify(data));
        await setDoc(logRef, payload, { merge: true });
    } catch (error) {
        console.warn("Error logging call event:", error);
    }
}

export const checkFriendsBirthdays = async (userId: string) => {
    console.log(`🎂 Checking birthdays for user: ${userId}`);
    try {
        // 1. Get accepted connections
        const connectionsRef = collection(db, 'connections');
        if (!userId) return;
        const q = query(
            connectionsRef,
            where('users', 'array-contains', userId),
            where('status', '==', 'accepted')
        );
        const snapshot = await getDocs(q);
        const friendIds: string[] = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const otherId = data.users.find((u: string) => u !== userId);
            if (otherId) friendIds.push(otherId);
        });

        console.log(`🎂 Found ${friendIds.length} friends:`, friendIds);

        if (friendIds.length === 0) return;

        // 2. Fetch profiles (batch) - standard method
        // Using Promise.all for simplicity
        const profiles = await Promise.all(friendIds.map(fid => getUserProfile(fid)));

        const today = new Date();
        const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        console.log(`🎂 Today is: ${mmdd}`);

        for (const profile of profiles) {
            if (!profile) continue;
            console.log(`🎂 Checking friend ${profile.displayName} (${profile.uid}). Birthday: ${profile.birthday}`);

            if (!profile.birthday) continue;

            // Assuming birthday is YYYY-MM-DD
            const bdayMMDD = profile.birthday.slice(5); // "MM-DD"

            if (bdayMMDD === mmdd) {
                console.log(`🎂 BIRTHDAY MATCH! ${profile.displayName} has birthday today!`);

                // 3. Check duplicate
                // Simplify query to avoid complex index requirements:
                // Just get all notifications from today, then filter in memory.
                const notifsRef = collection(db, 'users', userId, 'notifications');
                const todayISO = new Date(today.setHours(0, 0, 0, 0)).toISOString();
                const dupQ = query(
                    notifsRef,
                    where('createdAt', '>=', todayISO)
                );
                const dupSnap = await getDocs(dupQ);

                const alreadySent = dupSnap.docs.some(doc => {
                    const data = doc.data();
                    return data.type === 'birthday' && data.metadata?.friendId === profile.uid;
                });

                if (!alreadySent) {
                    console.log(`🎂 Creating notification for ${userId}`);
                    await createNotification(userId, {
                        type: 'birthday',
                        title: `It's ${profile.displayName}'s Birthday! 🎉`,
                        body: 'Send them a wish!',
                        link: `/profile/${profile.uid}`,
                        isAnonymous: false,
                        // @ts-ignore
                        senderId: profile.uid,
                        metadata: {
                            friendId: profile.uid
                        }
                    });
                } else {
                    console.log(`🎂 Notification already sent today for ${profile.displayName}`);
                }
            }
        }
    } catch (e) {
        console.warn("Error checking birthdays:", e);
    }
};

// --- Anonymous Q&A ---

export interface Question {
    id: string;
    title: string;
    content: string;
    authorId: string;
    isAnonymous: boolean;
    upvotes: number;
    answerCount: number;
    createdAt: string;
    upvotedBy: string[];
    category?: string; // 'General', 'Academic', 'Social', 'Career'
    hasAiAnswer?: boolean;
}

export interface Answer {
    id: string;
    questionId: string;
    content: string;
    authorId: string;
    isAnonymous: boolean;
    isAiGenerated: boolean;
    upvotes: number;
    createdAt: string;
    upvotedBy: string[];
    authorName?: string;
    authorBadge?: string;
    authorAvatar?: string;
    xpAwarded?: boolean; // Track if +20 XP was awarded to author
}

export const createQuestion = async (authorId: string, title: string, content: string, category: string = 'General') => {
    const questionsRef = collection(db, 'questions');
    const newQuestion: Omit<Question, 'id'> = {
        title,
        content,
        authorId,
        isAnonymous: true, // Always true for this feed
        upvotes: 0,
        answerCount: 0,
        createdAt: new Date().toISOString(),
        upvotedBy: [],
        category,
        hasAiAnswer: false
    };
    const docRef = await addDoc(questionsRef, newQuestion);
    return { ...newQuestion, id: docRef.id };
};

export const getQuestions = async (category?: string) => {
    try {
        const questionsRef = collection(db, 'questions');
        let q = query(questionsRef, orderBy('createdAt', 'desc'), limit(50));

        // Note: Filtering by category + Sorting by Time requires composite index
        // For now we will do client side filtering if category is present to avoid index block
        // Or we rely on the fact that we might just have one 'questions' feed for now.

        // If we really want category filter on server:
        // if (category && category !== 'All') {
        //    q = query(q, where('category', '==', category)); 
        // }

        const snapshot = await getDocs(q);
        const questions = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Question));

        if (category && category !== 'All') {
            return questions.filter(q => q.category === category);
        }
        return questions;
    } catch (e) {
        console.warn("[DB] getQuestions error:", e);
        return [];
    }
};

export const getQuestion = async (questionId: string) => {
    try {
        const docRef = doc(db, 'questions', questionId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            return { ...snap.data(), id: snap.id } as Question;
        }
    } catch (e) {
        console.warn("[DB] getQuestion error:", e);
    }
    return null;
};

export const voteQuestion = async (questionId: string, userId: string, type: 'up' | 'down' | 'remove') => {
    try {
        const qRef = doc(db, 'questions', questionId);

        // We only support 'toggle upvote' effectively (Reddit style usually 1 or 0 for MVP)
        // If type is 'up', and user not in array, add and inc.
        // If type is 'remove', remove and dec.

        // Simplification: Toggle Logic
        const snap = await getDoc(qRef);
        if (!snap.exists()) return;
        const data = snap.data() as Question;
        const hasUpvoted = data.upvotedBy?.includes(userId);

        if (hasUpvoted) {
            await updateDoc(qRef, {
                upvotes: increment(-1),
                upvotedBy: arrayRemove(userId)
            });
        } else {
            await updateDoc(qRef, {
                upvotes: increment(1),
                upvotedBy: arrayUnion(userId)
            });
        }
    } catch (e) {
        console.warn("[DB] voteQuestion error:", e);
    }
};

export const addAnswer = async (questionId: string, authorId: string, content: string, isAnonymous: boolean, isAi: boolean = false) => {
    const answersRef = collection(db, 'questions', questionId, 'answers');

    // Fetch author details if not anonymous/AI
    let authorName = 'Anonymous';
    let authorBadge = '';
    let authorAvatar = '';

    if (!isAnonymous && !isAi) {
        const profile = await getUserProfile(authorId);
        if (profile) {
            authorName = profile.displayName;
            authorAvatar = profile.photoURL || '';
        }
    } else if (isAnonymous && !isAi) {
        const profile = await getUserProfile(authorId);
        if (profile) {
            const year = profile.year || '';
            const cleanYear = year.toLowerCase().endsWith('year') ? year.slice(0, -5) : year;
            authorBadge = `Student • ${cleanYear} Year`;
        }
    } else if (isAi) {
        authorName = 'AI Study Buddy 🤖';
        authorBadge = 'Verified Bot';
    }

    const newAnswer: Omit<Answer, 'id'> = {
        questionId,
        content,
        authorId,
        isAnonymous,
        isAiGenerated: isAi,
        upvotes: 0,
        createdAt: new Date().toISOString(),
        upvotedBy: [],
        authorName,
        authorBadge,
        authorAvatar
    };

    await addDoc(answersRef, newAnswer);

    // Update Question Answer Count
    const qRef = doc(db, 'questions', questionId);
    const updates: any = {
        answerCount: increment(1)
    };
    if (isAi) {
        updates.hasAiAnswer = true;
    }
    await updateDoc(qRef, updates);
};

export const getAnswers = async (questionId: string) => {
    try {
        const answersRef = collection(db, 'questions', questionId, 'answers');
        // Sort by upvotes desc, then time? Or just time?
        // Usually best answers first.
        // Requires index. Let's do client sort for MVP.
        const q = query(answersRef);
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Answer))
            .sort((a, b) => {
                // AI answers first? Or highest upvotes?
                if (a.isAiGenerated && !b.isAiGenerated) return -1;
                if (!a.isAiGenerated && b.isAiGenerated) return 1;
                return b.upvotes - a.upvotes;
            });
    } catch (e) {
        console.warn("[DB] getAnswers error:", e);
        return [];
    }
};

export const voteAnswer = async (questionId: string, answerId: string, userId: string) => {
    const aRef = doc(db, 'questions', questionId, 'answers', answerId);
    const snap = await getDoc(aRef);
    if (!snap.exists()) return;
    const data = snap.data() as Answer; // Cast to Answer

    const hasUpvoted = data.upvotedBy?.includes(userId);

    if (hasUpvoted) {
        await updateDoc(aRef, {
            upvotes: increment(-1),
            upvotedBy: arrayRemove(userId)
        });
    } else {
        await updateDoc(aRef, {
            upvotes: increment(1),
            upvotedBy: arrayUnion(userId)
        });

        // --- XP: Answer Helpful (+20 XP) ---
        try {
            if (!data.xpAwarded && data.authorId !== userId) {
                await updateDoc(aRef, { xpAwarded: true });
                await addXp(data.authorId, 20, `answer_${answerId}`);
            }
        } catch (e) {
            console.warn("XP Q&A Award Failed", e);
        }
    }
};

export const submitFeedback = async (message: string, userId?: string, email?: string) => {
    try {
        const feedbackRef = collection(db, 'Feedback');
        await addDoc(feedbackRef, {
            message,
            userId: userId || 'anonymous',
            email: email || null,
            createdAt: serverTimestamp(),
            appVersion: '1.0.0' // Standard versioning
        });
        console.log("Feedback submitted successfully!");
    } catch (error) {
        console.warn("Error submitting feedback:", error);
    }
};

export const awardProfileXP = async (uid: string) => {
    try {
        const userRef = doc(db, 'users', uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            if (!data.xpAwarded_profile) {
                await updateDoc(userRef, {
                    xp: increment(50),
                    xpAwarded_profile: true
                });
                return true; // Awarded
            }
        }
    } catch (e) {
        console.warn("[DB] awardProfileXP error:", e);
    }
    return false; // Already awarded or error
};
