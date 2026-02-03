const { Resend } = require('resend');

// Manually load env if not running via Next.js
require('dotenv').config({ path: '.env.local' });

async function verifyResend() {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
        console.error("❌ RESEND_API_KEY is missing from .env.local");
        return;
    }

    if (key.startsWith("re_12345")) {
        console.error("❌ RESEND_API_KEY is still the placeholder value.");
        return;
    }

    console.log(`✅ Found API Key: ${key.substring(0, 5)}...`);

    const resend = new Resend(key);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const fromName = process.env.RESEND_FROM_NAME || 'NearbyStudents';
    const fromAddress = `${fromName} <${fromEmail}>`;

    console.log(`Using sender: ${fromAddress}`);
    console.log("Attempting to send test email to 'delivered@resend.dev'...");

    try {
        const { data, error } = await resend.emails.send({
            from: fromAddress,
            to: ['delivered@resend.dev'], // Infinite sink for testing
            subject: 'Domain Verification Test',
            html: '<p>If this sends, your configuration is working!</p>'
        });

        if (error) {
            console.error("❌ Send Failed:", error.name, error.message);
            if (error.message.includes("domain")) {
                console.log("👉 Tip: This usually means the DNS records haven't propagated yet or aren't verified in Resend dashboard.");
            }
        } else {
            console.log("✅ Email Sent Successfully!", data);
            console.log("🎉 Domain Verification passed.");
        }
    } catch (e) {
        console.error("❌ Critical Error:", e.message);
    }
}

verifyResend();
