'use client';

import { FileText, MapPin, Download } from 'lucide-react';
import Link from 'next/link';
import { useState, memo } from 'react';

interface MessageItemProps {
    message: {
        id: string;
        text: string;
        senderId: string;
        senderName?: string;
        senderPhoto?: string;
        createdAt: string;
        type?: 'text' | 'image' | 'video' | 'file' | 'audio' | 'location' | 'shared_post' | 'deleted' | 'call_log';
        read?: boolean;
        fileUrl?: string;
        fileName?: string;
        location?: { lat: number; lng: number };
        postId?: string;
        postContent?: string;
        postAuthor?: string;
        postAuthorId?: string;
        callInfo?: {
            durationSeconds: number;
            wasMissed: boolean;
            isVideo: boolean;
        };
        isAnonymous?: boolean;
        anonymousContext?: string;
        displayName?: string;
        displayAvatar?: string;
        displayBadge?: string;
    };
    isMe: boolean;
    showHeader?: boolean;
}

const MessageItem = memo(({ message, isMe, showHeader }: MessageItemProps) => {
    const time = message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...';
    // State to track if video playback failed
    const [videoError, setVideoError] = useState(false);

    // Helper to render header content safely
    const SharedPostHeader = () => (
        <div className="px-3 py-2 border-b border-border/10 flex items-center gap-2 hover:bg-black/5 transition-colors cursor-pointer">
            <div className={`w-5 h-5 rounded-full bg-secondary text-[10px] flex items-center justify-center font-bold`}>
                {message.postAuthor?.charAt(0) || 'P'}
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] opacity-70 font-semibold hover:underline">{message.postAuthor || 'Student'}</span>
                <span className="text-[9px] opacity-50 leading-none">Shared Post</span>
            </div>
        </div>
    );

    const renderContent = () => {
        switch (message.type) {
            case 'image':
                return (
                    <div className="space-y-1">
                        <img
                            src={message.fileUrl}
                            alt="Image attachment"
                            className="rounded-lg max-w-[240px] max-h-[300px] object-cover bg-black/10"
                            loading="lazy"
                        />
                        {message.text && <p className="text-sm pt-1">{message.text}</p>}
                    </div>
                );
            case 'video':
                if (videoError) {
                    // Fallback: Render as a clean File Attachment (looks intentional, not an error)
                    return (
                        <div className="space-y-1">
                            <div
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (!message.fileUrl) return;
                                    const a = document.createElement('a');
                                    a.href = message.fileUrl;
                                    a.download = message.fileName || 'video_clip';
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                }}
                                className={`cursor-pointer flex items-center gap-3 p-3 rounded-lg border ${isMe ? 'bg-primary-foreground/10 border-primary-foreground/20' : 'bg-background/50 border-border'} transition-colors hover:bg-black/5`}
                            >
                                <div className={`p-2 rounded-full ${isMe ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-medium truncate max-w-[150px]">{message.fileName || 'Video Clip'}</p>
                                    <p className="text-xs opacity-70 text-red-400">Video Load Failed</p>
                                </div>
                                <Download className="w-4 h-4 opacity-70" />
                            </div>
                            {message.text && <p className="text-sm pt-1">{message.text}</p>}
                        </div>
                    );
                }
                return (
                    <div className="space-y-1 relative group">
                        {/* Badge for Blob/Local videos */}
                        {message.fileUrl?.startsWith('blob:') && (
                            <div className="absolute top-2 right-2 z-10 bg-yellow-500/80 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm shadow-sm pointer-events-none">
                                Session Only
                            </div>
                        )}
                        <video
                            src={message.fileUrl}
                            controls
                            playsInline
                            className="rounded-lg max-w-[240px] max-h-[300px] bg-black"
                            onError={(e) => {
                                // Reduced log spam
                                // @ts-ignore
                                const code = e.target.error?.code;
                                if (code === 4) {
                                    console.warn("Video Src Not Supported (likely expired blob):", message.fileUrl);
                                } else {
                                    console.warn("Video Playback Error:", code, e);
                                }
                                setVideoError(true);
                            }}
                        />
                        {message.text && <p className="text-sm pt-1">{message.text}</p>}
                    </div>
                );
            case 'file':
                return (
                    <div className="space-y-1">
                        <div
                            onClick={(e) => {
                                e.preventDefault();
                                if (!message.fileUrl) return;
                                const a = document.createElement('a');
                                a.href = message.fileUrl;
                                a.download = message.fileName || 'document';
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                            }}
                            className={`cursor-pointer flex items-center gap-3 p-3 rounded-lg border ${isMe ? 'bg-primary-foreground/10 border-primary-foreground/20' : 'bg-background/50 border-border'} transition-colors hover:bg-black/5`}
                        >
                            <div className={`p-2 rounded-full ${isMe ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium truncate max-w-[150px]">{message.fileName || 'Attachment'}</p>
                                <p className="text-xs opacity-70">Document</p>
                            </div>
                            <Download className="w-4 h-4 opacity-70" />
                        </div>
                        {message.text && <p className="text-sm pt-1">{message.text}</p>}
                    </div>
                );
            case 'location':
                const mapUrl = `https://www.google.com/maps?q=${message.location?.lat},${message.location?.lng}`;
                return (
                    <div className="space-y-1">
                        <div
                            onClick={(e) => {
                                e.preventDefault();
                                window.open(mapUrl, '_blank', 'noopener,noreferrer');
                            }}
                            className="cursor-pointer block rounded-lg overflow-hidden border border-border/50 relative group"
                        >
                            {/* Simple static map preview placeholder or custom styling */}
                            <div className="h-32 bg-secondary flex items-center justify-center relative bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=0,0&zoom=1&size=400x400')] bg-cover bg-center bg-no-repeat bg-gray-100">
                                <div className="absolute inset-0 bg-black/5" />
                                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shadow-lg transform -translate-y-1 group-hover:-translate-y-2 transition-transform">
                                    <MapPin className="w-5 h-5 text-white fill-current" />
                                </div>
                            </div>
                            <div className={`p-2 text-xs font-medium ${isMe ? 'bg-primary-foreground/10' : 'bg-secondary/50'} flex items-center justify-between`}>
                                <span>📍 Location Shared</span>
                                <span className="underline opacity-70">Open Maps</span>
                            </div>
                        </div>
                        {message.text && <p className="text-sm pt-1">{message.text}</p>}
                    </div>
                );
            case 'shared_post':
                return (
                    <div className="space-y-1">
                        <div className={`rounded-lg border ${isMe ? 'border-primary-foreground/20 bg-primary-foreground/5' : 'border-border bg-secondary/30'} overflow-hidden max-w-[260px]`}>
                            {/* Header - Link to profile if ID exists */}
                            {message.postAuthorId ? (
                                <Link href={`/profile/${message.postAuthorId}`}>
                                    <SharedPostHeader />
                                </Link>
                            ) : (
                                <div className="px-3 py-2 border-b border-border/10 flex items-center gap-2">
                                    <div className={`w-5 h-5 rounded-full bg-secondary text-[10px] flex items-center justify-center font-bold`}>
                                        {message.postAuthor?.charAt(0) || 'P'}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] opacity-70 font-semibold">{message.postAuthor || 'Student'}</span>
                                        <span className="text-[9px] opacity-50 leading-none">Shared Post</span>
                                    </div>
                                </div>
                            )}

                            {/* Content Preview */}
                            <div className="p-3 space-y-2">
                                {/* Image if exists */}
                                {message.fileUrl && (
                                    <div className="rounded-md overflow-hidden h-24 w-full">
                                        <img src={message.fileUrl} className="w-full h-full object-cover" alt="Post preview" />
                                    </div>
                                )}
                                {/* Text snippet */}
                                <p className="text-sm line-clamp-3 italic opacity-90">
                                    "{message.postContent || 'Check out this post!'}"
                                </p>
                            </div>
                        </div>
                        {message.text && <p className="text-sm pt-1">{message.text}</p>}
                    </div>
                );
            case 'call_log':
                // @ts-ignore
                const isMissed = message.callInfo?.wasMissed || message.text === 'Missed Call';
                // @ts-ignore
                const isVideo = message.callInfo?.isVideo;

                return (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isMissed ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-secondary/50 border-border/50 opacity-80'}`}>
                        <div className={`p-1.5 rounded-full ${isMissed ? 'bg-red-500/20' : 'bg-background'}`}>
                            {isVideo ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z" /><rect x="2" y="6" width="14" height="12" rx="2" ry="2" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-medium text-xs">
                                {isMissed ? 'Missed Call' : `Call ended`}
                            </span>
                            {!isMissed && <span className="text-[10px] opacity-70">{message.text}</span>}
                        </div>
                    </div>
                );
            default:
                return <p className="text-sm whitespace-pre-wrap">{message.text}</p>;
        }
    };

    return (
        <div className={`flex ${message.type === 'call_log' ? 'justify-center py-2' : (isMe ? 'justify-end' : 'justify-start')} animate-in fade-in slide-in-from-bottom-2 duration-300 mobile-gpu`}>
            <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                {showHeader && !isMe && message.type !== 'call_log' && (
                    <div className="flex items-center gap-2 mb-1 ml-1">
                        {message.isAnonymous ? (
                            <div className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                                <span className="text-[10px]">🎭</span>
                            </div>
                        ) : (message.displayAvatar || message.senderPhoto) ? (
                            <img src={message.displayAvatar || message.senderPhoto} className="w-4 h-4 rounded-full object-cover" alt="" />
                        ) : (
                            <div className="w-4 h-4 rounded-full bg-secondary flex items-center justify-center text-[8px] font-bold">
                                {(message.displayName || message.senderName)?.charAt(0) || '?'}
                            </div>
                        )}
                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 profile-info">
                            {message.isAnonymous ? (
                                <span>{message.displayBadge || message.anonymousContext || 'Anonymous Student'}</span>
                            ) : (
                                <span className="user-name">{message.displayName || message.senderName || 'Student'}</span>
                            )}
                        </span>
                    </div>
                )}

                {message.type === 'call_log' ? (
                    renderContent()
                ) : (
                    <div className={`px-4 py-2 shadow-sm rounded-2xl ${isMe
                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                        : 'bg-card border border-border text-foreground rounded-tl-none'
                        } ${message.type === 'deleted' ? 'opacity-70 italic' : ''}`}>

                        {message.type === 'deleted' ? (
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                🚫 This message was deleted
                            </p>
                        ) : (
                            renderContent()
                        )}

                        <div className="flex items-center justify-end gap-1 mt-1">
                            <span className={`text-[10px] opacity-70`}>
                                {time}
                            </span>
                            {isMe && message.type !== 'deleted' && (
                                /* Read Receipt */
                                <span className={message.read ? 'text-blue-300' : 'opacity-70'}>
                                    {message.read ? (
                                        // Double Tick
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L7 17l-5-5" /><path d="m22 10-7.5 7.5L13 16" /></svg>
                                    ) : (
                                        // Single Tick
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                    )}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.message.id === nextProps.message.id &&
        prevProps.message.read === nextProps.message.read &&
        prevProps.isMe === nextProps.isMe &&
        prevProps.showHeader === nextProps.showHeader
    );
});

export default MessageItem;
