const fs = require('fs');
const path = require('path');

const key = {
    "type": "service_account",
    "project_id": "nearbystudents",
    "private_key_id": "9c90cf0add86f5f808a0c107b377406d165ecd3f",
    "private_key": "-----BEGIN PRIVATE KEY-----\\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC66UGFRH+Q8WKa\\n/wVjn2lHVesih7kv7kV/QP3bbCTweECjdYas11EtTdOTo/uvoavUea/+CqgayRdB\\nrZ681NPZdD+mzYxhBEFbqSrimn5Gcv+JMup27RcEfVZ97WxDTbhwFX2eM93sln9z\\nsxggp0UrKBe/7Ic+5dm2tobC0hlS84yLCCE93xPjTQfFhvvCvZTvKb1MhnoWcATK\\nx0V21/dqnzkKpiqeqoym0bXAtYv0hZwex1qJv2JZ/Q9/IL2CLt4OVkfuusdiqTGX\\n96/culgwuE60PGWma9Lpqz8UomNY6C30N1a/0TAI+Xf3k2c1Zuxoy+ryVIy6lK44\\nJjs1KFDrAgMBAAECggEAN8GpV/XtD/HR9mao1uUQ5MTOlchjB9dOR/29PJ1wD4Pv\\n1FMUz66Teq5CtUIvrF7QAVwjkebf6s2d8Gu4dKAQakfxTPL4M2CvloZKUrq/fIiF\\njgnwQ3XKbf5ttLcEmrcuk9D1XiIey5rBfmQoiGUdjxgwrYIDflHWtliQrsE56LJX\\nZAqOh9m47zTMgRceTDdV8ArZCOxSswByICQx1L/DbM/HNu5AFM0Ud8Lc0Z/muHxK\\nn0z+uUOYxkcvwF8LXg3H6xZuC6EWQMK8t0a1AKwv8I9vxhRkvpfHqi5CmMqP515Q\\niUilLmQw5h9OpbLxpNAxO4c2FbFtkE/YBY3nkP/NAQKBgQDv6jdgMLL2Oy0pgl54\\nFF+GFiwi+fV8zziA7Qz+z9TQT7pg5c+BNznzT8ih2ZXURFHj+CBPUi3I1u0w7LrX\\nIYZadri3GlYgX5nOV0ISk2ukgc1iq5dRXDHY8DMMm4MNGhWuagXmqDMwSHrHCZu1\\nuwKFhjsIr5Mv7iBZ73oj1OthqwKBgQDHcU8OsoB2Dzwuvk4anlgp1Ki8SwGORVD0\\n0A16yGivrKx8FFHykCYgVaf8j9NfDwvYQ6zbheWJJTNAL120wr+I5bURoK5FnbiN\\nDPeOKDb+GnV8KNr9/W7FSD9vUr1urk6cP53oXa6B70Ql51+K03AU6pL1Nb7iXgWm\\nKM0F0ToNwQKBgCUWTNcm0BN2VGXtTFM9uwKMXOhPQZ64neB4RKEDWb+WA5bFD83G\\nzsOJGtfCPgIhSZN3IO+CIafBacs9XSiyewVzAtzzSksY3DrkjEc42NQGaMyPAAZI\\nvT/u6cVSKPEWjjF3HFBqwfb9zVUFbDesoBgqBugx1Av9wKyGc5gkavqfAoGAT6Ag\\nVRjVCs14VJ0r55qyTjkWCN7VRyzLboIl75BVo1WII52lPfdpEV3BTKdLV1dVfkk+\\nmQIzKvcMKCMBAWsDNy+mg9wn16lphf7YUwwhMH/1ydUx4VeuQtteYB6jfK3guqb3\\nb07/neadyZg/X9icle01MOr9Q7kP/k+p0xm+WMECgYBFg5+1j+RXANnLDW7Heor/\\nXuEK8XefkSuglZSmJbU8plyWHzUY1kD12eATA74h9IR1eS45s26HFCT+UhtFpDpL\\nEOhvOwGknczP+vfX4rFvNu9z4/nPiBYzP4jmW8zHx7K7WIgX3SKkc5WSQictChjw\\nMeBe08bnBRfJr2WMXV5cew==\\n-----END PRIVATE KEY-----\\n",
    "client_email": "firebase-adminsdk-fbsvc@nearbystudents.iam.gserviceaccount.com",
    "client_id": "110436057432256390951",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40nearbystudents.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
};

const envPath = path.join(process.cwd(), '.env.local');
const envVar = `FIREBASE_SERVICE_ACCOUNT_KEY='${JSON.stringify(key)}'\n`;

fs.appendFileSync(envPath, envVar);
console.log('Successfully appended FIREBASE_SERVICE_ACCOUNT_KEY to .env.local');
