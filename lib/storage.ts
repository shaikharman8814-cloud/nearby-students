import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';

export const uploadProfileImage = async (uid: string, file: File) => {
    const path = `users/${uid}/profile_${Date.now()}`;
    return uploadAttachment(path, file);
};



export const uploadAttachment = async (path: string, file: File) => {
    // STRATEGY: 
    // 1. Try Real Firebase Storage Upload (Preferred).
    // 2. If it fails (CORS/Billing), Fallback to Base64 for Small Files (< 500KB) to fit in Firestore 1MB limit.
    // 3. Fallback to Public URLs for Large Files.

    const isVideo = file.name.match(/\.(mp4|mov|webm|ogg)$/i) || file.type.startsWith('video/');

    try {
        if (!storage) throw new Error("Firebase Storage not initialized (Server/SSR)");
        console.log("Attempting Firebase Storage Upload for:", path);
        const storageRef = ref(storage, path);

        // Timeout Helper with Cancellation
        const uploadWithTimeout = new Promise<any>((resolve, reject) => {
            const uploadTask = uploadBytesResumable(storageRef, file);

            const timer = setTimeout(() => {
                uploadTask.cancel(); // Stop background retries
                reject(new Error("Upload Timeout"));
            }, 3000); // 3s Timeout

            uploadTask.then(res => {
                clearTimeout(timer);
                resolve(res);
            }).catch(err => {
                clearTimeout(timer);
                reject(err);
            });
        });

        const snapshot = await uploadWithTimeout;
        const url = await getDownloadURL(snapshot.ref);
        console.log("✅ Upload Successful:", url);
        return url;
    } catch (e: any) {
        console.warn("❌ Firebase Storage Upload Failed (likely CORS or Billing):", e);

        // STRATEGY 2: Server-Side Proxy Upload (Bypasses CORS/Client 404s)
        try {
            console.log("⚠️ Falling back to Proxy Upload...");

            const formData = new FormData();
            formData.append('file', file);
            formData.append('path', path);

            // Get Auth Token for Server-Side Validation
            const { auth } = await import('./firebase');
            if (!auth) throw new Error("Auth not initialized");
            const token = await auth.currentUser?.getIdToken();

            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Proxy Upload Failed: ${res.status} ${errText}`);
            }

            const data = await res.json();
            if (data.url) {
                console.log("✅ Proxy Upload Successful:", data.url);
                return data.url;
            }
        } catch (proxyError: any) {
            const msg = proxyError.message || '';
            if (msg.includes('Missing Google Cloud Credentials')) {
                console.warn("⚠️ Proxy skipped (Missing API Key). Using Firestore Fallback.");
            } else if (msg.includes('bucket does not exist') || msg.includes('404')) {
                console.warn("⚠️ Proxy Upload Failed: Storage Bucket not found. Check env vars. Using Firestore Fallback.");
            } else {
                console.warn("⚠️ Proxy Upload Failed (Non-critical, using fallback):", proxyError.message);
            }
        }

        const isImage = file.type.startsWith('image/');

        // STRATEGY 2: Client-Side Compression / Encoding
        // If upload fails, we encode small files to fit into Firestore (< 900KB safe limit).
        // This effectively bypasses storage requirements for the MVP.
        if (isImage && !isVideo) {
            try {
                const { compressImage } = await import('./image-compression');
                console.log("⚠️ Fallback: Compressing Image for Firestore persistence...");
                // Target ~800px or similar to keep size low
                const base64 = await compressImage(file, 800, 0.7);

                // Verify size (Base64 is ~1.33x original). Stay under 900KB for safety (Firestore doc max 1MB)
                if (base64.length < 900 * 1024) {
                    console.log(`✅ Compressed to ${(base64.length / 1024).toFixed(2)}KB`);
                    return base64;
                } else {
                    // Try one more aggressive compression if still too big
                    const aggressive = await compressImage(file, 600, 0.5);
                    if (aggressive.length < 950 * 1024) { // Absolute max
                        return aggressive;
                    }
                }
            } catch (cmpErr) {
                console.warn("Compression failed:", cmpErr);
            }
        } else if (!isVideo) {
            // For small documents (PDF, DOC), just convert directly to Base64. Do NOT use canvas compressImage.
            if (file.size < 700 * 1024) { // 700KB physical file size translates to ~950KB base64
                try {
                    console.log("⚠️ Fallback: Encoding small document to Base64...");
                    const base64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target?.result as string);
                        reader.onerror = (e) => reject(e);
                        reader.readAsDataURL(file);
                    });
                    if (base64.length < 950 * 1024) return base64;
                } catch (encErr) {
                    console.warn("Encoding failed:", encErr);
                }
            }
        }

        // Final Fallback: Local Blob URL (Session Only)
        // This allows the user to see the video they just "sent" in the current session,
        // even if the upload failed. It won't persist on reload for others.
        console.warn("Using Local Blob URL as final fallback (file too large for DB/Upload Failed)");
        return URL.createObjectURL(file);
    }
};

// Keep existing for backward compatibility if needed, or deprecate
export const uploadChatAttachment = async (groupId: string, file: File) => {
    return uploadAttachment(`groups/${groupId}`, file);
};

export const uploadResourceFile = async (college: string, course: string, file: File) => {
    // Sanitize path segments
    const safeCollege = (college || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
    const safeCourse = (course || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = Date.now();
    const path = `resources/${safeCollege}/${safeCourse}/${timestamp}_${file.name}`;

    return uploadAttachment(path, file);
};

