'use client';

import { Resource, toggleUpvoteResource, incrementDownloadCount, addResourceComment, getResourceComments, Comment } from '@/lib/db';
import { FileText, Download, ThumbsUp, File, Image as ImageIcon, MessageCircle, Send, Loader2, VenetianMask, Ghost } from 'lucide-react';
import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';

/* 
 * Helper to format file size (dummy for now as we don't store it yet, but good for UI)
 * Future: Add size to Resource interface
 */
function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

interface ResourceCardProps {
    resource: Resource;
    currentUserId?: string;
}

export function ResourceCard({ resource, currentUserId }: ResourceCardProps) {
    const { user } = useAuth();
    const [upvoted, setUpvoted] = useState(resource.upvotedBy?.includes(currentUserId || '') || false);
    const [upvoteCount, setUpvoteCount] = useState(resource.upvotes || 0);
    const [downloadCount, setDownloadCount] = useState(resource.downloads || 0);

    const [commentCount, setCommentCount] = useState(resource.commentCount || 0);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isPostingComment, setIsPostingComment] = useState(false);

    const handleUpvote = async () => {
        if (!currentUserId) return;

        const isNowUpvoted = !upvoted;
        setUpvoted(isNowUpvoted);
        setUpvoteCount(prev => isNowUpvoted ? prev + 1 : prev - 1);

        try {
            await toggleUpvoteResource(resource.id, currentUserId);
        } catch (error) {
            setUpvoted(!isNowUpvoted);
            setUpvoteCount(prev => isNowUpvoted ? prev - 1 : prev + 1);
        }
    };

    const handleDownload = async () => {
        if (!resource.fileUrl) {
            console.warn("Missing fileUrl for resource:", resource.id);
            return;
        }

        // Increment counter - properly await to catch permission errors silently
        setDownloadCount(prev => prev + 1);
        try {
            await incrementDownloadCount(resource.id);
        } catch (err) {
            console.warn("Permission denied for stats update, continuing download anyway.");
        }

        try {
            const fileName = resource.fileName || `${resource.title || 'resource'}.pdf`;
            const url = resource.fileUrl;

            // STRATEGY: Always use Blob for maximum compatibility with the 'download' attribute.
            let blob;

            if (url.startsWith('data:')) {
                try {
                    // Manually parse Data URI to avoid Content Security Policy (connect-src) blocks
                    const parts = url.split(',');
                    if (parts.length < 2) throw new Error("Invalid Data URI");

                    const mimeMatch = parts[0].match(/:(.*?);/);
                    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
                    const bstr = atob(parts[1]);
                    let n = bstr.length;
                    const u8arr = new Uint8Array(n);
                    while (n--) {
                        u8arr[n] = bstr.charCodeAt(n);
                    }
                    blob = new Blob([u8arr], { type: mime });
                } catch (base64Err) {
                    console.warn("Base64 conversion failed, falling back to direct link:", base64Err);
                    // Fallback to direct data URI navigation if manual conversion fails
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    return;
                }
            } else {
                // Remote URL - Fetch as blob to force 'download' behavior
                const response = await fetch(url);
                if (!response.ok) throw new Error("Network response was not ok");
                blob = await response.blob();
            }

            if (blob) {
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = fileName;

                // For some browsers (Safari/Mobile), the link must be in the DOM
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Extended cleanup timeout
                setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);
            }
        } catch (e) {
            console.warn("Advanced download failed, falling back to basic open", e);
            // Final fallback: try to open in a new tab
            window.open(resource.fileUrl, '_blank');
        }
    };

    const handleLoadComments = async () => {
        if (!showComments) {
            const fetched = await getResourceComments(resource.id);
            setComments(fetched);
        }
        setShowComments(!showComments);
    };

    const handlePostComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !user) return;

        setIsPostingComment(true);
        try {
            const tempInfo = {
                authorId: user.uid,
                authorName: user.displayName || 'Student',
                content: newComment,
            };
            // Optimistic Update
            setComments([...comments, { id: 'temp-' + Date.now(), ...tempInfo, createdAt: new Date().toISOString() }]);
            setNewComment('');
            setCommentCount(prev => prev + 1);

            await addResourceComment(resource.id, tempInfo);
        } catch (error) {
            console.warn("Failed to post comment", error);
        } finally {
            setIsPostingComment(false);
        }
    };

    const getIcon = () => {
        if (resource.type === 'note') return <FileText className="w-8 h-8 text-blue-500" />;
        if (resource.type === 'paper') return <File className="w-8 h-8 text-orange-500" />;
        return <ImageIcon className="w-8 h-8 text-green-500" />;
    };

    return (
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-4 hover:shadow-md transition-shadow">
            <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-secondary/30 rounded-lg flex items-center justify-center">
                    {getIcon()}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-semibold text-sm truncate pr-2" title={resource.title}>
                                {resource.title}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                                {resource.description || 'No description'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span className="bg-secondary px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide">
                            {resource.type}
                        </span>
                        <span>•</span>
                        <span>{resource.year} Year</span>
                        <span>•</span>
                        <span>{resource.course}</span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-1.5">
                        {resource.isAnonymous ? (
                            <>
                                <VenetianMask className="w-3 h-3 text-zinc-400" />
                                <span className="text-[10px] text-muted-foreground">Anonymous Student</span>
                            </>
                        ) : (
                            <>
                                {resource.uploaderPhotoURL ? (
                                    <img src={resource.uploaderPhotoURL} className="w-4 h-4 rounded-full object-cover" alt="" />
                                ) : (
                                    <div className="w-4 h-4 rounded-full bg-secondary flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                                        {resource.uploaderName?.charAt(0) || 'S'}
                                    </div>
                                )}
                                <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">{resource.uploaderName || 'Student'}</span>
                            </>
                        )}
                        <span className="text-[10px] text-muted-foreground/50">• {new Date(resource.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 pt-3 border-t border-border/50">
                <button
                    onClick={handleUpvote}
                    className={`flex items-center gap-1.5 text-xs transition-colors ${upvoted ? 'text-green-600 font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <ThumbsUp className={`w-3.5 h-3.5 ${upvoted ? 'fill-current' : ''}`} />
                    <span>{upvoteCount} Helpful</span>
                </button>

                <button
                    onClick={handleLoadComments}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{commentCount} Comments</span>
                </button>

                <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors ml-auto group"
                >
                    <span className="group-hover:underline">Download</span>
                    <Download className="w-3.5 h-3.5" />
                    <span className="text-[10px] opacity-70">({downloadCount})</span>
                </button>
            </div>

            {/* Comments Dropdown */}
            {showComments && (
                <div className="pt-3 border-t border-border/30 animate-in slide-in-from-top-2">
                    <div className="space-y-3 mb-3 max-h-60 overflow-y-auto custom-scrollbar">
                        {comments.length === 0 ? (
                            <p className="text-xs text-center text-muted-foreground">No comments yet. ask something!</p>
                        ) : (
                            comments.map(c => (
                                <div key={c.id} className="flex gap-2">
                                    <div className="w-5 h-5 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center text-[10px] font-bold">
                                        {c.authorName.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="bg-secondary/30 rounded-lg rounded-tl-none p-2 text-xs">
                                            <span className="font-semibold block mb-0.5">{c.authorName}</span>
                                            <p>{c.content}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {user && (
                        <form onSubmit={handlePostComment} className="flex gap-2">
                            <input
                                type="text"
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                placeholder="Write a comment..."
                                className="flex-1 bg-secondary/20 border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary/50"
                            />
                            <button
                                type="submit"
                                disabled={!newComment.trim() || isPostingComment}
                                className="p-1.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                            >
                                {isPostingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            </button>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}
