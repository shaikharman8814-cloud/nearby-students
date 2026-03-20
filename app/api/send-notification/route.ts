import { NextResponse } from 'next/server';
import { adminMessaging } from '@/lib/firebase-admin';

export async function POST(req: Request) {
    try {
        const { token, title, body, data } = await req.json();

        if (!token || !title || !body) {
            return NextResponse.json({ error: 'Token, title, and body are required' }, { status: 400 });
        }

        // Send the notification using the globally initialized admin SDK
        await adminMessaging.send({
            token,
            notification: {
                title,
                body,
            },
            data: data || {} // Optional data payload for deep-linking info
        });

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error: any) {
        console.error('Failed to send push notification:', error);
        return NextResponse.json({ error: 'Failed to send notification', details: error.message }, { status: 500 });
    }
}
