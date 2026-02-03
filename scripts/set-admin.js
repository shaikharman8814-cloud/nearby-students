const admin = require('firebase-admin');

// Load service account from environment or file
// Since I saw lib/service-account.ts having the key, but this is a node script
// I'll grab the key from scripts/manage-users.js template or assume env
// For simplicity, I'll use the same structure as manage-users.js

// Hardcoded service account to ensure script works without env complexity
const SERVICE_ACCOUNT_KEY = {
    "type": "service_account",
    "project_id": "nearbystudents",
    "private_key_id": "9c90cf0add86f5f808a0c107b377406d165ecd3f",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC66UGFRH+Q8WKa\n/wVjn2lHVesih7kv7kV/QP3bbCTweECjdYas11EtTdOTo/uvoavUea/+CqgayRdB\nrZ681NPZdD+mzYxhBEFbqSrimn5Gcv+JMup27RcEfVZ97WxDTbhwFX2eM93sln9z\nsxggp0UrKBe/7Ic+5dm2tobC0hlS84yLCCE93xPjTQfFhvvCvZTvKb1MhnoWcATK\nx0V21/dqnzkKpiqeqoym0bXAtYv0hZwex1qJv2JZ/Q9/IL2CLt4OVkfuusdiqTGX\n96/culgwuE60PGWma9Lpqz8UomNY6C30N1a/0TAI+Xf3k2c1Zuxoy+ryVIy6lK44\nJjs1KFDrAgMBAAECggEAN8GpV/XtD/HR9mao1uUQ5MTOlchjB9dOR/29PJ1wD4Pv\n1FMUz66Teq5CtUIvrF7QAVwjkebf6s2d8Gu4dKAQakfxTPL4M2CvloZKUrq/fIiF\njgnwQ3XKbf5ttLcEmrcuk9D1XiIey5rBfmQoiGUdjxgwrYIDflHWtliQrsE56LJX\nZAqOh9m47zTMgRceTDdV8ArZCOxSswByICQx1L/DbM/HNu5AFM0Ud8Lc0Z/muHxK\nn0z+uUOYxkcvwF8LXg3H6xZuC6EWQMK8t0a1AKwv8I9vxhRkvpfHqi5CmMqP515Q\niUilLmQw5h9OpbLxpNAxO4c2FbFtkE/YBY3nkP/NAQKBgQDv6jdgMLL2Oy0pgl54\nFF+GFiwi+fV8zziA7Qz+z9TQT7pg5c+BNznzT8ih2ZXURFHj+CBPUi3I1u0w7LrX\nIYZadri3GlYgX5nOV0ISk2ukgc1iq5dRXDHY8DMMm4MNGhWuagXmqDMwSHrHCZu1\nuwKFhjsIr5Mv7iBZ73oj1OthqwKBgQDHcU8OsoB2Dzwuvk4anlgp1Ki8SwGORVD0\n0A16yGivrKx8FFHykCYgVaf8j9NfDwvYQ6zbheWJJTNAL120wr+I5bURoK5FnbiN\nDPeOKDb+GnV8KNr9/W7FSD9vUr1urk6cP53oXa6B70Ql51+K03AU6pL1Nb7iXgWm\nKM0F0ToNwQKBgCUWTNcm0BN2VGXtTFM9uwKMXOhPQZ64neB4RKEDWb+WA5bFD83G\nzsOJGtfCPgIhSZN3IO+CIafBacs9XSiyewVzAtzzSksY3DrkjEc42NQGaMyPAAZI\nvT/u6cVSKPEWjjF3HFBqwfb9zVUFbDesoBgqBugx1Av9wKyGc5gkavqfAoGAT6Ag\nVRjVCs14VJ0r55qyTjkWCN7VRyzLboIl75BVo1WII52lPfdpEV3BTKdLV1dVfkk+\nmQIzKvcMKCMBAWsDNy+mg9wn16lphf7YUwwhMH/1ydUx4VeuQtteYB6jfK3guqb3\nb07/neadyZg/X9icle01MOr9Q7kP/k+p0xm+WMECgYBFg5+1j+RXANnLDW7Heor/\nXuEK8XefkSuglZSmJbU8plyWHzUY1kD12eATA74h9IR1eS45s26HFCT+UhtFpDpL\nEOhvOwGknczP+vfX4rFvNu9z4/nPiBYzP4jmW8zHx7K7WIgX3SKkc5WSQictChjw\nMeBe08bnBRfJr2WMXV5cew==\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-fbsvc@nearbystudents.iam.gserviceaccount.com"
};
if (!SERVICE_ACCOUNT_KEY.private_key) {
    console.error("Please set FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL env variables.");
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(SERVICE_ACCOUNT_KEY)
    });
}

const auth = admin.auth();

async function setAdmin(email) {
    try {
        const user = await auth.getUserByEmail(email);
        await auth.setCustomUserClaims(user.uid, { admin: true });
        console.log(`Successfully set admin claim for user: ${email} (${user.uid})`);

        // Also set DB role for immediate access without token refresh logic if API checks DB
        const db = admin.firestore();
        await db.collection('users').doc(user.uid).set({
            role: 'admin'
        }, { merge: true });
        console.log(`Successfully set DB role 'admin' for user: ${email}`);

        console.log("Note: User needs to re-login or refresh their token for claims to take effect.");
    } catch (error) {
        console.error('Error setting admin claim:', error);
    }
}

const email = process.argv[2];
if (email) {
    setAdmin(email);
} else {
    console.log('Usage: node scripts/set-admin.js <email>');
}
