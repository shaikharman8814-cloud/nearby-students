const admin = require('firebase-admin');

const SERVICE_ACCOUNT_KEY = {
    "type": "service_account",
    "project_id": "nearbystudents",
    "private_key_id": "9c90cf0add86f5f808a0c107b377406d165ecd3f",
    "private_key": [
        "-----BEGIN PRIVATE KEY-----",
        "MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC66UGFRH+Q8WKa",
        "/wVjn2lHVesih7kv7kV/QP3bbCTweECjdYas11EtTdOTo/uvoavUea/+CqgayRdB",
        "rZ681NPZdD+mzYxhBEFbqSrimn5Gcv+JMup27RcEfVZ97WxDTbhwFX2eM93sln9z",
        "sxggp0UrKBe/7Ic+5dm2tobC0hlS84yLCCE93xPjTQfFhvvCvZTvKb1MhnoWcATK",
        "x0V21/dqnzkKpiqeqoym0bXAtYv0hZwex1qJv2JZ/Q9/IL2CLt4OVkfuusdiqTGX",
        "96/culgwuE60PGWma9Lpqz8UomNY6C30N1a/0TAI+Xf3k2c1Zuxoy+ryVIy6lK44",
        "Jjs1KFDrAgMBAAECggEAN8GpV/XtD/HR9mao1uUQ5MTOlchjB9dOR/29PJ1wD4Pv",
        "1FMUz66Teq5CtUIvrF7QAVwjkebf6s2d8Gu4dKAQakfxTPL4M2CvloZKUrq/fIiF",
        "jgnwQ3XKbf5ttLcEmrcuk9D1XiIey5rBfmQoiGUdjxgwrYIDflHWtliQrsE56LJX",
        "ZAqOh9m47zTMgRceTDdV8ArZCOxSswByICQx1L/DbM/HNu5AFM0Ud8Lc0Z/muHxK",
        "n0z+uUOYxkcvwF8LXg3H6xZuC6EWQMK8t0a1AKwv8I9vxhRkvpfHqi5CmMqP515Q",
        "iUilLmQw5h9OpbLxpNAxO4c2FbFtkE/YBY3nkP/NAQKBgQDv6jdgMLL2Oy0pgl54",
        "FF+GFiwi+fV8zziA7Qz+z9TQT7pg5c+BNznzT8ih2ZXURFHj+CBPUi3I1u0w7LrX",
        "IYZadri3GlYgX5nOV0ISk2ukgc1iq5dRXDHY8DMMm4MNGhWuagXmqDMwSHrHCZu1",
        "uwKFhjsIr5Mv7iBZ73oj1OthqwKBgQDHcU8OsoB2Dzwuvk4anlgp1Ki8SwGORVD0",
        "0A16yGivrKx8FFHykCYgVaf8j9NfDwvYQ6zbheWJJTNAL120wr+I5bURoK5FnbiN",
        "DPeOKDb+GnV8KNr9/W7FSD9vUr1urk6cP53oXa6B70Ql51+K03AU6pL1Nb7iXgWm",
        "KM0F0ToNwQKBgCUWTNcm0BN2VGXtTFM9uwKMXOhPQZ64neB4RKEDWb+WA5bFD83G",
        "zsOJGtfCPgIhSZN3IO+CIafBacs9XSiyewVzAtzzSksY3DrkjEc42NQGaMyPAAZI",
        "vT/u6cVSKPEWjjF3HFBqwfb9zVUFbDesoBgqBugx1Av9wKyGc5gkavqfAoGAT6Ag",
        "VRjVCs14VJ0r55qyTjkWCN7VRyzLboIl75BVo1WII52lPfdpEV3BTKdLV1dVfkk+",
        "mQIzKvcMKCMBAWsDNy+mg9wn16lphf7YUwwhMH/1ydUx4VeuQtteYB6jfK3guqb3",
        "b07/neadyZg/X9icle01MOr9Q7kP/k+p0xm+WMECgYBFg5+1j+RXANnLDW7Heor/",
        "XuEK8XefkSuglZSmJbU8plyWHzUY1kD12eATA74h9IR1eS45s26HFCT+UhtFpDpL",
        "EOhvOwGknczP+vfX4rFvNu9z4/nPiBYzP4jmW8zHx7K7WIgX3SKkc5WSQictChjw",
        "MeBe08bnBRfJr2WMXV5cew==",
        "-----END PRIVATE KEY-----"
    ].join("\n") + "\n",
    "client_email": "firebase-adminsdk-fbsvc@nearbystudents.iam.gserviceaccount.com",
    "client_id": "110436057432256390951",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40nearbystudents.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
};

// Initialize admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(SERVICE_ACCOUNT_KEY)
    });
}

const auth = admin.auth();

async function createUser(email, password) {
    try {
        const userRecord = await auth.createUser({
            email,
            password,
            emailVerified: true,
            displayName: "Test Student"
        });
        console.log('Successfully created new user:', userRecord.uid);
        return userRecord;
    } catch (error) {
        if (error.code === 'auth/email-already-exists') {
            console.log('User already exists, updating password instead...');
            const user = await auth.getUserByEmail(email);
            await auth.updateUser(user.uid, { password });
            console.log('Successfully updated password for:', email);
        } else {
            console.error('Error creating user:', error);
        }
    }
}

async function checkUser(email) {
    try {
        const user = await auth.getUserByEmail(email);
        console.log('User found:', {
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified,
            disabled: user.disabled
        });
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.log('User not found:', email);
        } else {
            console.error('Error checking user:', error);
        }
    }
}

// Simple CLI handling
const [, , command, email, password] = process.argv;

if (command === 'create' && email && password) {
    createUser(email, password);
} else if (command === 'check' && email) {
    checkUser(email);
} else {
    console.log('Usage:');
    console.log('  node scripts/manage-users.js create <email> <password>');
    console.log('  node scripts/manage-users.js check <email>');
}
