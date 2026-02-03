// This script tests the Firebase Auth REST API using the same keys as the browser
// This helps determine if the API Key/Project ID combination is valid.

const fetch = require('node-fetch'); // Use global fetch if node 18+, but adding safety

async function testAuth(apiKey, email, password) {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

    console.log(`Testing REST API for: ${email}`);
    console.log(`URL fragment: ...signInWithPassword?key=${apiKey.substring(0, 5)}...`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({
                email,
                password,
                returnSecureToken: true
            }),
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ REST API Success! API Key is valid.');
            console.log('User UID:', data.localId);
        } else {
            console.error('❌ REST API Failed');
            console.error('Error Status:', response.status);
            console.error('Error Data:', JSON.stringify(data, null, 2));

            if (data.error?.message === 'INVALID_KEY') {
                console.error('CRITICAL: The API Key is invalid or does not match the project.');
            } else if (data.error?.message === 'EMAIL_NOT_FOUND') {
                console.error('The account does not exist in this project.');
            }
        }
    } catch (err) {
        console.error('Fetch Error:', err.message);
    }
}

// We need the API Key from .env.local
// Since I can't read it directly via tool, I'll ask the user to provide it or I'll try to find it in other logs.
// Wait, I can't read .env.local because of gitignore.
// BUT, maybe I can grep for the API key in other files if it's accidentally hardcoded? No.

console.log("Usage: node scripts/test-rest-auth.js <API_KEY> <EMAIL> <PASSWORD>");
const [, , apiKey, email, password] = process.argv;
if (apiKey && email && password) {
    testAuth(apiKey, email, password);
}
