const fetch = require('node-fetch');

async function testReset() {
    console.log("Testing POST /api/auth/forgot-password...");
    try {
        const res = await fetch('http://localhost:3000/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'fpnewcpn@gmail.com' })
        });

        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log('Body:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}

testReset();
