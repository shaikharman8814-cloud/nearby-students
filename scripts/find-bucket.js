const fetch = require('node-fetch'); // Assuming node-fetch is available or using built-in in Node 18+

const candidates = [
    "nearbystudents",
    "nearby-students",
    "students-network",
    "sone",
    "sone-app",
    "sone-project",
    "sone-network"
];

const domains = [
    "appspot.com",
    "firebasestorage.app"
];

async function check(name, domain) {
    const bucket = `${name}.${domain}`;
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o`;
    try {
        const res = await fetch(url, { method: 'HEAD' });
        // 404 = Not Found (Bucket doesn't exist)
        // 403 = Forbidden (Bucket exists but is private - GOOD!)
        // 200 = OK (Bucket exists and is public)
        if (res.status !== 404) {
            console.log(`[FOUND] ${bucket} (Status: ${res.status})`);
            return bucket;
        }
    } catch (e) {
        // Ignore network errors
    }
    return null;
}

async function run() {
    console.log("Probing buckets...");
    for (const name of candidates) {
        for (const domain of domains) {
            await check(name, domain);
        }
    }
    console.log("Done.");
}

// Polyfill for Node versions < 18 if needed, but safe to assume 18+ for Next 16 users
if (!global.fetch) {
    console.error("This script requires Node.js 18+");
} else {
    run();
}
