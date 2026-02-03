import { Post, toggleLikePost, addComment, getComments, Comment, savePost, unsavePost, checkIsSaved, hidePost, reportPost, getUserProfile } from '@/lib/db';
import { Heart, MessageCircle, Share2, MoreHorizontal, Send, User, Sticker, Loader2, VenetianMask, Ghost, Bookmark, Flag, EyeOff } from 'lucide-react';
import { useState, useEffect, useRef, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

import { SharePostModal } from './share-post-modal';

/* 
 * Helper to format date "time ago"
 */
function timeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return "now";
}

interface PostItemProps {
    post: Post;
    currentUserId?: string;
}

export const PostItem = memo(({ post, currentUserId }: PostItemProps) => {
    const { user } = useAuth();
    const router = useRouter();
    const [liked, setLiked] = useState(post.likedBy?.includes(currentUserId || '') || false);
    const [likeCount, setLikeCount] = useState(post.likes || 0);
    const [saved, setSaved] = useState(false);

    const [showComments, setShowComments] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isHidden, setIsHidden] = useState(false);

    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [commentImage, setCommentImage] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [commentCount, setCommentCount] = useState(post.commentCount || 0);
    const [isAnonymousComment, setIsAnonymousComment] = useState(false);

    // GIF State
    const [showGif, setShowGif] = useState(false);
    const [gifSearch, setGifSearch] = useState('');
    const [gifs, setGifs] = useState<any[]>([]);
    const [loadingGifs, setLoadingGifs] = useState(false);
    const gifRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Author Avatar (Fallback for existing posts)
    const [authorAvatar, setAuthorAvatar] = useState(post.authorPhotoURL || null);

    useEffect(() => {
        // If no photo URL in post data, and not anonymous, try to fetch it
        if (!post.authorPhotoURL && !post.isAnonymous && post.authorId) {
            // Check if it's me first to save a read
            if (currentUserId === post.authorId && user?.photoURL) {
                setAuthorAvatar(user.photoURL);
            } else {
                getUserProfile(post.authorId).then(p => {
                    if (p?.photoURL) setAuthorAvatar(p.photoURL);
                }).catch(() => { });
            }
        }
    }, [post.authorId, post.authorPhotoURL, post.isAnonymous, currentUserId, user?.photoURL]);

    useEffect(() => {
        if (currentUserId && post.id) {
            checkIsSaved(currentUserId, post.id).then(setSaved);
        }
    }, [currentUserId, post.id]);

    // Close Modals on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (gifRef.current && !gifRef.current.contains(event.target as Node)) {
                setShowGif(false);
            }
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // GIF Search Logic
    useEffect(() => {
        if (showGif) {
            searchGifs('trending');
        }
    }, [showGif]);

    const searchGifs = async (query: string) => {
        setLoadingGifs(true);
        try {
            const q = query === 'trending' ? '' : `&q=${query}`;
            const endpoint = query === 'trending'
                ? `https://g.tenor.com/v1/trending?key=LIVDSRZULELA&limit=20`
                : `https://g.tenor.com/v1/search?key=LIVDSRZULELA&limit=20${q}`;

            const res = await fetch(endpoint);
            const data = await res.json();
            setGifs(data.results || []);
        } catch (e) {
            console.error("Failed to fetch GIFs", e);
        } finally {
            setLoadingGifs(false);
        }
    };

    const handleLike = async () => {
        if (!currentUserId) return;

        // Optimistic update
        const isNowLiked = !liked;
        setLiked(isNowLiked);
        setLikeCount(prev => isNowLiked ? prev + 1 : prev - 1);

        try {
            await toggleLikePost(post.id, currentUserId);
        } catch (error) {
            // Revert on error
            setLiked(!isNowLiked);
            setLikeCount(prev => isNowLiked ? prev - 1 : prev + 1);
            console.error("Like failed", error);
        }
    };

    const handleSave = async () => {
        if (!currentUserId) return;
        const isNowSaved = !saved;
        setSaved(isNowSaved);

        try {
            if (isNowSaved) {
                await savePost(currentUserId, post);
            } else {
                await unsavePost(currentUserId, post.id);
            }
        } catch (e) {
            console.error("Save failed", e);
            setSaved(!isNowSaved);
        }
    }

    const handleHide = async () => {
        if (!currentUserId) return;
        if (confirm("Hide this post? It won't appear in your feed.")) {
            setIsHidden(true); // Immediate hide in UI
            await hidePost(currentUserId, post.id);
        }
        setShowMenu(false);
    }

    const handleReport = async () => {
        if (!currentUserId) return;
        const reason = prompt("Why are you reporting this post?");
        if (reason) {
            await reportPost(post.id, currentUserId, reason);
            alert("Thanks! We've received your report.");
        }
        setShowMenu(false);
    }

    const handleLoadComments = async () => {
        if (!showComments) {
            const fetched = await getComments(post.id);
            // Enrich comments with avatars if missing
            const enriched = await Promise.all(fetched.map(async (c) => {
                if (!c.authorPhotoURL && !c.isAnonymous && c.authorId) {
                    try {
                        const p = await getUserProfile(c.authorId);
                        if (p?.photoURL) return { ...c, authorPhotoURL: p.photoURL };
                    } catch { }
                }
                return c;
            }));
            setComments(enriched);
        }
        setShowComments(!showComments);
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newComment.trim() && !commentImage) || !user) return;

        setIsUploading(true);
        try {
            let imageUrl = undefined;
            if (commentImage) {
                const { uploadAttachment } = await import('@/lib/storage');
                imageUrl = await uploadAttachment(`comments/${post.id}/${Date.now()}_${commentImage.name}`, commentImage);
            }

            const tempId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            const commentData = {
                authorId: user.uid,
                authorName: user.displayName || 'Student',
                content: newComment,
                imageUrl,
                isAnonymous: isAnonymousComment, // Added flag
                authorPhotoURL: isAnonymousComment ? undefined : (user.photoURL || undefined)
            };

            // Optimistic append with masked values if anonymous
            setComments([...comments, {
                id: tempId,
                ...commentData,
                authorName: isAnonymousComment ? 'Anonymous Student' : commentData.authorName, // Optimistic Mask
                createdAt: new Date().toISOString()
            }]);
            setNewComment('');
            setCommentImage(null);
            setIsAnonymousComment(false); // Reset toggle
            setCommentCount(prev => prev + 1);

            await addComment(post.id, commentData);
        } catch (error) {
            console.error("Comment failed", error);
            alert("Failed to post comment. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleGifSelect = async (gifUrl: string) => {
        setShowGif(false);
        if (!user) return;

        setIsUploading(true);
        try {
            const tempId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            const currentAnonymous = isAnonymousComment;
            setIsAnonymousComment(false);

            const commentData = {
                authorId: user.uid,
                authorName: user.displayName || 'Student',
                content: '', // GIF only comment
                imageUrl: gifUrl,
                isAnonymous: currentAnonymous,
                authorPhotoURL: currentAnonymous ? undefined : (user.photoURL || undefined)
            };

            // Optimistic append
            setComments([...comments, {
                id: tempId,
                ...commentData,
                authorName: currentAnonymous ? 'Anonymous Student' : commentData.authorName,
                createdAt: new Date().toISOString()
            }]);
            setCommentCount(prev => prev + 1);

            await addComment(post.id, commentData);
        } catch (error) {
            console.error("GIF Comment failed", error);
        } finally {
            setIsUploading(false);
        }
    };

    if (isHidden) return null;

    return (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 relative mobile-gpu mobile-content-visibility">
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex gap-3">
                    {post.isAnonymous ? (
                        <>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-zinc-800`}>
                                <VenetianMask className="w-6 h-6 text-zinc-400" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-sm">Anonymous Student</h3>
                                    <span className="text-xs text-muted-foreground">• {timeAgo(post.createdAt)}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {post.authorCollege} <span className="italic opacity-70">(Hidden)</span>
                                </p>
                            </div>
                        </>
                    ) : (
                        <Link href={`/profile/${post.authorId}`} className="flex gap-3 group">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 overflow-hidden group-hover:opacity-80 transition-opacity flex-shrink-0">
                                {authorAvatar ? (
                                    <img src={authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-5 h-5 text-primary" />
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 profile-info">
                                    <h3 className="font-bold text-sm group-hover:underline user-name">
                                        {post.authorName || 'Student'}
                                    </h3>
                                    <span className="text-xs text-muted-foreground">• {timeAgo(post.createdAt)}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {post.authorCollege}
                                </p>
                            </div>
                        </Link>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {post.category && post.category !== 'General' && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
                            {post.category}
                        </span>
                    )}

                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="text-muted-foreground hover:text-foreground p-1"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-6 w-32 bg-popover border border-border rounded-lg shadow-lg py-1 z-20 animate-in fade-in zoom-in-95 duration-200">
                                <button
                                    onClick={handleHide}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-secondary flex items-center gap-2"
                                >
                                    <EyeOff className="w-3 h-3" /> Hide
                                </button>
                                <button
                                    onClick={handleReport}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-secondary flex items-center gap-2 text-red-500"
                                >
                                    <Flag className="w-3 h-3" /> Report
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>
                {post.imageUrl && (
                    <div className="mt-3 rounded-lg overflow-hidden border border-border">
                        <img src={post.imageUrl} alt="Post content" className="w-full object-cover max-h-96" loading="lazy" />
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-6 border-t border-border pt-3">
                <button
                    onClick={handleLike}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                    <span>{likeCount}</span>
                </button>

                <button
                    onClick={handleLoadComments}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <MessageCircle className="w-4 h-4" />
                    <span>{commentCount}</span>
                </button>

                <button
                    onClick={handleSave}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${saved ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                </button>


                <button
                    onClick={() => setShowShare(true)}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors ml-auto"
                >
                    <Share2 className="w-4 h-4" />
                </button>
            </div>

            <SharePostModal post={post} isOpen={showShare} onClose={() => setShowShare(false)} />

            {/* Comments Section */}
            {showComments && (
                <div className="mt-4 pt-4 border-t border-border bg-secondary/20 -mx-4 px-4 pb-2">
                    <div className="space-y-4 mb-4 max-h-96 overflow-y-auto custom-scrollbar pl-2">
                        {/* Wrapper to cleanly handle scroll */}
                        {comments.length === 0 ? (
                            <p className="text-xs text-center text-muted-foreground py-2">No replies yet.</p>
                        ) : (
                            comments.map(comment => (
                                <div key={comment.id} className="flex gap-3 relative min-h-[40px]">
                                    {/* Thread Line */}
                                    <div className="absolute top-8 left-3 bottom-[-16px] w-[2px] bg-border/50 last:hidden"></div>

                                    {comment.isAnonymous ? (
                                        // Anonymous Comment Avatar
                                        <div className="w-6 h-6 rounded-full bg-zinc-800 flex-shrink-0 flex items-center justify-center text-xs z-10 ring-2 ring-background">
                                            <VenetianMask className="w-3 h-3 text-zinc-400" />
                                        </div>
                                    ) : comment.authorPhotoURL ? (
                                        <img src={comment.authorPhotoURL} alt={comment.authorName} className="w-6 h-6 rounded-full object-cover ring-2 ring-background flex-shrink-0" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex-shrink-0 flex items-center justify-center text-xs z-10 ring-2 ring-background">
                                            {comment.authorName.charAt(0)}
                                        </div>
                                    )}

                                    <div className="flex-1 pb-2">
                                        <div className="flex items-baseline gap-2">
                                            {comment.isAnonymous ? (
                                                <span className="font-semibold text-xs text-zinc-500">Anonymous Student</span>
                                            ) : (
                                                <span className="font-semibold text-xs hover:underline cursor-pointer">{comment.authorName || 'Student'}</span>
                                            )}
                                            <span className="text-[10px] text-muted-foreground">{timeAgo(comment.createdAt)}</span>
                                        </div>
                                        {comment.content && <p className="text-sm mt-0.5">{comment.content}</p>}
                                        {comment.imageUrl && (
                                            <div className="mt-2 rounded-lg overflow-hidden border border-border max-w-xs bg-secondary/50">
                                                <img
                                                    src={comment.imageUrl}
                                                    alt="Reply attachment"
                                                    className="w-full h-auto object-cover"
                                                    loading="lazy"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="relative">
                        {/* GIF Picker */}
                        {showGif && (
                            <div ref={gifRef} className="absolute bottom-14 left-0 w-full max-w-sm z-30 bg-popover border border-border rounded-xl shadow-2xl p-4 animate-in duration-200 slide-in-from-bottom-2 h-64 flex flex-col">
                                <div className="mb-2">
                                    <input
                                        type="text"
                                        placeholder="Search GIFs..."
                                        value={gifSearch}
                                        onChange={(e) => {
                                            setGifSearch(e.target.value);
                                            if (e.target.value.length > 2) searchGifs(e.target.value);
                                        }}
                                        className="w-full bg-secondary px-3 py-1.5 rounded-lg text-xs focus:outline-none"
                                    />
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-3 gap-2">
                                    {loadingGifs ? (
                                        <div className="col-span-3 flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                                    ) : gifs.length > 0 ? (
                                        gifs.map(gif => (
                                            <button
                                                key={gif.id}
                                                onClick={() => handleGifSelect(gif.media[0].gif.url)}
                                                className="relative aspect-square rounded-md overflow-hidden hover:opacity-80 transition-opacity"
                                            >
                                                <img src={gif.media[0].tinygif.url} className="w-full h-full object-cover" loading="lazy" />
                                            </button>
                                        ))
                                    ) : (
                                        <div className="col-span-3 text-center text-xs text-muted-foreground py-8">No GIFs found</div>
                                    )}
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmitComment}>
                            {commentImage && (
                                <div className="flex items-center gap-2 mb-2 p-2 bg-background rounded-lg border border-border w-fit">
                                    <span className="text-xs truncate max-w-[150px]">{commentImage.name}</span>
                                    <button type="button" onClick={() => setCommentImage(null)} className="text-muted-foreground hover:text-red-500">
                                        &times;
                                    </button>
                                </div>
                            )}
                            <div className="flex gap-2 items-end">
                                <div className="flex-1 bg-background rounded-2xl border border-input focus-within:ring-2 focus-within:ring-primary/50 flex items-center px-3 py-2">
                                    <input
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder={isAnonymousComment ? "Reply Anonymously..." : "Tweet your reply"}
                                        className="flex-1 bg-transparent text-sm focus:outline-none min-w-0"
                                    />

                                    {/* Anonymous Toggle */}
                                    <button
                                        type="button"
                                        onClick={() => setIsAnonymousComment(!isAnonymousComment)}
                                        className={`p-1.5 transition-colors mr-1 rounded-full ${isAnonymousComment ? 'bg-zinc-800 text-white' : 'text-muted-foreground hover:text-primary'}`}
                                        title="Toggle Anonymous"
                                    >
                                        <Ghost className="w-4 h-4" />
                                    </button>

                                    {/* GIF Trigger */}
                                    <button
                                        type="button"
                                        onClick={() => setShowGif(!showGif)}
                                        className="p-1.5 text-muted-foreground hover:text-primary transition-colors mr-1"
                                        title="GIF"
                                    >
                                        <Sticker className="w-4 h-4" />
                                    </button>

                                    {/* Image Picker */}
                                    <label className="cursor-pointer text-muted-foreground hover:text-primary transition-colors p-1">
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={e => e.target.files && setCommentImage(e.target.files[0])}
                                        />
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                                    </label>
                                </div>
                                <button
                                    type="submit"
                                    disabled={(!newComment.trim() && !commentImage) || isUploading}
                                    className="bg-primary text-primary-foreground p-2.5 rounded-full disabled:opacity-50 hover:opacity-90 transition-opacity mb-0.5"
                                >
                                    {isUploading ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison to avoid unnecessary re-renders
    return (
        prevProps.post.id === nextProps.post.id &&
        prevProps.post.likes === nextProps.post.likes &&
        prevProps.post.commentCount === nextProps.post.commentCount &&
        prevProps.currentUserId === nextProps.currentUserId
    );
});
