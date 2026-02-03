'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createPost, getUserProfile } from '@/lib/db';
import { Loader2, Image as ImageIcon, Send, Ghost } from 'lucide-react';

interface CreatePostProps {
    onPostCreated: () => void;
    currentScope: 'college' | 'city' | 'global';
}

export function CreatePost({ onPostCreated, currentScope }: CreatePostProps) {
    const { user } = useAuth();
    const [content, setContent] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [loading, setLoading] = useState(false);
    const [image, setImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [category, setCategory] = useState<'Notes' | 'PYQ' | 'Doubts' | 'Coding' | 'Placement' | 'Projects' | 'General' | 'UI'>('General');

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!content.trim() && !image) || !user) return; // Allow image-only posts if supported, else assume content needed

        setLoading(true);
        try {
            // Re-fetch profile metadata
            const profile = await getUserProfile(user.uid);
            if (!profile) throw new Error("Profile not found");

            let uploadedImageUrl = undefined;
            if (image) {
                // Determine path based on scope or generic
                const path = `posts/${user.uid}/${Date.now()}_${image.name}`;
                // Dynamically import to avoid circular dep issues if any, or just import at top
                const { uploadAttachment } = await import('@/lib/storage');
                uploadedImageUrl = await uploadAttachment(path, image);
            }

            await createPost({
                authorId: user.uid,
                authorName: profile.displayName || 'Unknown',
                authorCollege: profile.college || 'Unknown College',
                content: content,
                isAnonymous: isAnonymous,
                scope: currentScope,
                city: profile.city || undefined,
                imageUrl: uploadedImageUrl,
                category: category,
                authorPhotoURL: profile.photoURL || undefined
            });

            setContent('');
            setIsAnonymous(false);
            setCategory('General');
            setImage(null);
            setPreviewUrl(null);
            onPostCreated();
        } catch (error) {
            console.error("Failed to post:", error);
            alert("Failed to post. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const categories = ['General', 'Doubts', 'Notes', 'PYQ', 'Coding', 'Placement', 'Projects', 'UI'] as const;

    return (
        <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-sm">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
                Create Post
                <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                    in {currentScope === 'global' ? 'Global Feed' : currentScope === 'college' ? 'My College' : 'My City'}
                </span>
            </h3>

            <form onSubmit={handleSubmit}>
                <div className="flex gap-3">
                    <div className="flex-shrink-0">
                        {user?.photoURL ? (
                            <img
                                src={user.photoURL}
                                alt="User"
                                className="w-9 h-9 rounded-full object-cover border border-border"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center border border-border">
                                <span className="text-xs font-bold text-muted-foreground">{user?.displayName?.charAt(0) || 'U'}</span>
                            </div>
                        )}
                    </div>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={isAnonymous ? "What's on your mind? (Anonymous)" : "Share something with your peers..."}
                        className="w-full min-h-[80px] p-3 rounded-lg bg-secondary/30 border border-input focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
                    />
                </div>

                {previewUrl && (
                    <div className="mt-3 relative inline-block">
                        <img src={previewUrl} alt="Preview" className="h-20 w-auto rounded-lg border border-border object-cover" />
                        <button
                            type="button"
                            onClick={() => { setImage(null); setPreviewUrl(null); }}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-sm hover:bg-destructive/90"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                    </div>
                )}

                <div className="flex flex-wrap gap-2 mt-3 mb-2">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setCategory(cat)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${category === cat
                                ? 'bg-primary/20 text-primary border-primary/50'
                                : 'bg-background text-muted-foreground border-border hover:bg-secondary'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="flex justify-between items-center mt-3">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setIsAnonymous(!isAnonymous)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${isAnonymous
                                ? 'bg-zinc-800 text-white'
                                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                                }`}
                        >
                            <Ghost className="w-3.5 h-3.5" />
                            {isAnonymous ? 'Anonymous ON' : 'Post Anonymously'}
                        </button>

                        <label className="cursor-pointer p-2 text-muted-foreground hover:text-primary transition-colors hover:bg-secondary rounded-full">
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                            <ImageIcon className="w-4 h-4" />
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={(!content.trim() && !image) || loading}
                        className="flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Post
                    </button>
                </div>
            </form>
        </div>
    );
}
