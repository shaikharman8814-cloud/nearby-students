const admin = require('firebase-admin');

// 1. Reconstruct the key EXACTLY as we did in service-account.ts
const privateKeyParts = [
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
].join("\n") + "\n"; // The exact logic we used

const serviceAccount = {
    projectId: "nearbystudents",
    clientEmail: "firebase-adminsdk-fbsvc@nearbystudents.iam.gserviceaccount.com",
    privateKey: privateKeyParts
};

console.log("---------------------------------------------------");
console.log("Verifying Firebase Admin Credentials...");
console.log("Project ID:", serviceAccount.projectId);
console.log("Client Email:", serviceAccount.clientEmail);
console.log("Private Key Length:", serviceAccount.privateKey.length);
console.log("Private Key (First 50 chars):", JSON.stringify(serviceAccount.privateKey.substring(0, 50)));
console.log("---------------------------------------------------");

if (admin.apps.length === 0) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("✅ initializeApp success");
    } catch (e) {
        console.error("❌ initializeApp failed:", e.message);
        process.exit(1);
    }
}

async function verifyAuth() {
    try {
        console.log("Attempting to List Users (Basic Auth Check)...");
        const users = await admin.auth().listUsers(1);
        console.log(`✅ Success! Found ${users.users.length} users. Access granted.`);
        if (users.users.length > 0) {
            console.log("First User Email:", users.users[0].email);
        }
    } catch (e) {
        console.error("❌ List Users Failed:", e.code, e.message);
        console.error("This means the Service Account Key is Invalid, Revoked, or Permission Denied.");
        return; // Stop if basic auth fails
    }

    try {
        // Try to generate a link WITH settings
        console.log("Attempting to generate Password Reset Link with ActionCodeSettings...");
        const link = await admin.auth().generatePasswordResetLink("test@example.com", {
            url: 'http://localhost:3000/login'
        });
        console.log("✅ Success! Generated Link:", link);
    } catch (e) {
        console.error("❌ Link Generation Failed:", e.code, e.message);
        console.error("Full Error:", e);
    }
}

verifyAuth();
