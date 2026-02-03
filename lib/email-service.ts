import { Resend } from 'resend';

// Initialize Resend with API key if available
// If not available, we'll log emails to console for development
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    from?: string; // e.g. "Sone App <noreply@yourdomain.com>"
}

export async function sendEmail({ to, subject, html, from }: SendEmailOptions) {
    const fromAddress = from || `NearbyStudents <${process.env.RESEND_FROM_EMAIL}>`;

    if (!resend) {
        console.warn('--- EMAIL SERVICE (MOCKED) ---');
        console.warn('Reason: No RESEND_API_KEY found.');
        return { success: true, id: 'mock-id' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: fromAddress,
            to,
            subject,
            html,
        });

        if (error) {
            console.error('Resend Production Error:', error);
            throw new Error(error.message);
        }

        return { success: true, id: data?.id };
    } catch (err: any) {
        console.error('Email Send Error:', err);
        throw err;
    }
}
