import { NextRequest, NextResponse } from 'next/server';
import { adminStorage } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        // 1. AUTHENTICATION & SESSION SECURITY (Objective 1 & 2)
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            const { adminAuth } = await import('@/lib/firebase-admin');
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (authError) {
            console.warn("[Upload] Auth Verification Failed:", authError);
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const path = formData.get('path') as string;

        if (!file || !path) {
            return NextResponse.json({ error: 'File and path are required' }, { status: 400 });
        }

        // 2. FILE TYPE & CONTENT VALIDATION (Objective 7)
        const allowedMimeTypes = [
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            'application/pdf',
            'video/mp4', 'video/webm', 'video/quicktime',
            'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (!allowedMimeTypes.includes(file.type)) {
            return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
        }

        // 3. FILE SIZE LIMITS (Objective 7)
        const MAX_SIZE = 20 * 1024 * 1024; // 20MB Limit
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large. Maximum size is 20MB.' }, { status: 400 });
        }

        // 4. PATH TRAVERSAL PROTECTION (Objective 5)
        // Ensure the path starts with a safe directory and doesn't contain '..'
        const safePath = path.replace(/\.\./g, '').replace(/^\/+/, '');
        if (!safePath.startsWith('users/') && !safePath.startsWith('resources/') && !safePath.startsWith('groups/')) {
            return NextResponse.json({ error: 'Invalid upload path' }, { status: 403 });
        }

        // Fast Fail for Missing Config
        if (!process.env.FIREBASE_SERVICE_ACCOUNT && !process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            console.warn("[Upload] Critical: FIREBASE_SERVICE_ACCOUNT is missing.");
            return NextResponse.json({
                error: 'Server Configuration Error: Storage credentials not configured.'
            }, { status: 500 });
        }

        console.log(`[Upload] Starting Admin SDK upload for: ${safePath}`);

        // Convert File to Buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Get Bucket
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'nearbystudents.appspot.com';
        const bucket = adminStorage.bucket(bucketName);

        const fileRef = bucket.file(safePath);

        await fileRef.save(buffer, {
            metadata: {
                contentType: file.type,
            },
            public: true,
        });

        // Use a slightly smarter public URL generation
        const url = `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(safePath)}`;

        return NextResponse.json({ url });

    } catch (error: any) {
        console.error("[Upload] Server Error:", error.message);

        // Production-ready error: Hide internal details from the client
        return NextResponse.json({
            error: 'Failed to upload file. Please try again later.'
        }, { status: 500 });
    }
}
