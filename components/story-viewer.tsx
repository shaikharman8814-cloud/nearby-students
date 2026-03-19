import { useState, useEffect, useRef } from 'react';
import { Story, viewStory, deleteStory, getUserProfile, UserProfile, likeStory, getConnection, sendMessage, sendConnectionRequest } from '@/lib/db';
import { X, ChevronLeft, ChevronRight, Heart, MoreVertical, Trash2, Music, MapPin, Share, Eye } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

interface StoryViewerProps {
    stories: Story[];
    initialIndex: number;
    onClose: () => void;
    onRepost?: (url: string, type: 'image' | 'video') => void;
}

export function StoryViewer({ stories, initialIndex, onClose, onRepost }: StoryViewerProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    // Viewers Logic
    const [showViewers, setShowViewers] = useState(false);
    const [viewerProfiles, setViewerProfiles] = useState<UserProfile[]>([]);
    const [loadingViewers, setLoadingViewers] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    // If stories array becomes empty (e.g. after delete), close
    useEffect(() => {
        if (stories.length === 0) onClose();
    }, [stories, onClose]);

    const story = stories[currentIndex];
    const DURATION = 5000; // 5s for images

    // Check if current user is mentioned
    const isMentioned = story?.overlays?.some(o => o.type === 'mention' && o.content === user?.uid);

    // Handle Music Playback
    useEffect(() => {
        // Find music overlay
        const musicOverlay = story?.overlays?.find(o => o.type === 'music');
        if (musicOverlay && audioRef.current && !isPaused && !showViewers) {
            audioRef.current.src = musicOverlay.content;
            audioRef.current.volume = 0.5;
            audioRef.current.play().catch(e => console.log("Auto-play blocked", e));
        } else if (audioRef.current) {
            audioRef.current.pause();
        }
    }, [currentIndex, isPaused, story, showViewers]);

    // Progress Logic
    useEffect(() => {
        // Reset progress when story changes
        setProgress(0);
        setIsPaused(false);
        setShowViewers(false); // Reset viewers sheet

        if (!story) {
            onClose();
            return;
        }

        // Mark as viewed
        if (user && !story.viewers.includes(user.uid)) {
            viewStory(story.id, user.uid).catch(console.warn);
        }
    }, [currentIndex, story, user]);

    useEffect(() => {
        if (isPaused || !story || showViewers) return; // Pause progress if viewers list open

        let interval: NodeJS.Timeout;
        const step = 100; // Update every 100ms

        if (story.type === 'image') {
            interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        handleNext();
                        return 0;
                    }
                    return prev + (step / DURATION) * 100;
                });
            }, step);
        }

        return () => clearInterval(interval);
    }, [currentIndex, isPaused, story?.type, showViewers]);

    // Fetch Viewers when sheet opens
    useEffect(() => {
        const viewers = story?.viewers || [];
        if (showViewers && story && viewers.length > 0) {
            setLoadingViewers(true);
            Promise.all(viewers.map(uid => getUserProfile(uid)))
                .then(profiles => {
                    setViewerProfiles(profiles.filter(p => p !== null) as UserProfile[]);
                })
                .finally(() => setLoadingViewers(false));
        } else if (showViewers && viewers.length === 0) {
            setViewerProfiles([]);
        }
    }, [showViewers, story]);

    // Live Profile
    const [authorProfile, setAuthorProfile] = useState<UserProfile | null>(null);

    // Interaction State
    const [replyText, setReplyText] = useState('');
    const [isLiked, setIsLiked] = useState(false);
    const [isSendingReply, setIsSendingReply] = useState(false);

    useEffect(() => {
        if (story?.authorId) {
            getUserProfile(story.authorId).then(p => {
                if (p) setAuthorProfile(p);
            });
        }
    }, [story?.authorId]);

    // Check Like Status on Load
    useEffect(() => {
        if (user && story) {
            setIsLiked(story.likedBy?.includes(user.uid) || false);
        }
    }, [currentIndex, story, user]);

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user || !story) return;

        // Optimistic UI
        const newStatus = !isLiked;
        setIsLiked(newStatus);

        // Trigger small haptic or animation if possible (omitted for web)
        await likeStory(story.id, user.uid, newStatus);
    };

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!replyText.trim() || !user || !story || isSendingReply) return;

        setIsSendingReply(true);

        try {
            // Check for existing connection
            let connection = await getConnection(user.uid, story.authorId);
            let connectionId = connection?.id;

            if (!connection) {
                // If no connection, we simulate one or send request?
                // For simplified "DM", we usually need a connection. 
                // Let's force a "Pending" request + Message if system allows, 
                // OR just create a connection if we want "Open DMs".
                // Since this is a college app, let's assume auto-accept or flexible.
                // We'll use sendConnectionRequest logic but auto-accept for now?
                // Actually, existing `sendMessage` requires a `connectionId`.
                // Let's try to "ensure" connection.
                await sendConnectionRequest(user.uid, story.authorId);
                // Need to wait/fetch updated connection?
                // Just deterministic ID:
                const ids = [user.uid, story.authorId].sort();
                connectionId = ids.join('_');
            }

            if (connectionId) {
                await sendMessage(connectionId, user.uid, replyText, {
                    type: 'story_mention',
                    storyId: story.id,
                    url: story.mediaUrl // Preview
                });

                setReplyText('');
                setIsPaused(false);
                alert("Reply sent! 📤");
            }
        } catch (e) {
            console.warn("Failed to reply", e);
            alert("Failed to send message.");
        } finally {
            setIsSendingReply(false);
        }
    };

    const handleNext = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // Defer closing to avoid "Cannot update a component while rendering a different component"
            setTimeout(() => {
                onClose();
            }, 0);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleDelete = async () => {
        if (confirm("Delete this story?")) {
            await deleteStory(story.id);
            // Quick UI update: remove from list
            // For now, simple reload/close is easiest
            onClose();
            // Ideally we callback to parent to refresh
            window.location.reload();
        }
    };

    const handleVideoUpdate = () => {
        if (videoRef.current) {
            const current = videoRef.current.currentTime;
            const duration = videoRef.current.duration;
            if (duration) {
                setProgress((current / duration) * 100);
            }
        }
    };

    if (!story) return null;

    const renderOverlays = () => story.overlays?.map(ov => (
        <div
            key={ov.id}
            className="absolute z-30 transition-transform hover:scale-105 cursor-pointer"
            style={{
                left: `${ov.style?.x}%`,
                top: `${ov.style?.y}%`,
                transform: `translate(-50%, -50%) scale(${ov.style?.scale || 1}) rotate(${ov.style?.rotation || 0}deg)`
            }}
            onClick={(e) => {
                e.stopPropagation(); // prevent navigation
                if (ov.type === 'mention') {
                    onClose();
                    router.push(`/profile/${ov.content}`);
                }
            }}
        >
            {ov.type === 'music' && (
                <div className="bg-white/90 text-black px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md animate-pulse">
                    <Music className="w-3 h-3" />
                    {ov.meta?.title}
                </div>
            )}
            {ov.type === 'location' && (
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md">
                    <MapPin className="w-3 h-3" />
                    {ov.content}
                </div>
            )}
            {ov.type === 'mention' && (
                <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md hover:underline">
                    @ {ov.meta?.name || 'User'}
                </div>
            )}
            {ov.type === 'emoji' && (
                <div className="text-4xl drop-shadow-md">
                    {ov.content}
                </div>
            )}
        </div>
    ));

    // Resolve display data (prefer live profile, fallback to story snapshot)
    const displayName = authorProfile?.displayName || story.authorName || 'User';
    const photoURL = authorProfile?.photoURL || story.authorPhotoURL;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-gray-300 z-50">
                <X className="w-8 h-8" />
            </button>

            <audio ref={audioRef} className="hidden" />

            {/* Main Story Container */}
            <div className="relative w-full max-w-md aspect-[9/16] bg-black rounded-lg overflow-hidden shadow-2xl">

                {/* Viewers Sheet */}
                {showViewers && (
                    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md animate-in slide-in-from-bottom-full duration-300 flex flex-col">
                        <div className="p-4 flex items-center justify-between border-b border-white/10">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                Viewed by {(story.viewers || []).length}
                            </h3>
                            <button onClick={() => setShowViewers(false)} className="p-1 hover:bg-white/10 rounded-full text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {loadingViewers ? (
                                <div className="text-white/50 text-center py-4">Loading...</div>
                            ) : viewerProfiles.length > 0 ? (
                                viewerProfiles.map(p => (
                                    <div key={p.uid} className="flex items-center gap-3 text-white">
                                        {p.photoURL ? (
                                            <img src={p.photoURL} className="w-10 h-10 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                                                {p.displayName.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-semibold text-sm">{p.displayName}</p>
                                            <p className="text-xs text-white/50">{p.college}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-white/50 text-center py-8">No viewers yet</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Progress Bar */}
                <div className="absolute top-2 left-2 right-2 flex gap-1 z-30">
                    {stories.map((s, idx) => (
                        <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white transition-all duration-100 ease-linear"
                                style={{
                                    width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div className="absolute top-6 left-4 right-4 flex items-center justify-between text-white z-30">
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                            router.push(`/profile/${story.authorId}`);
                        }}
                    >
                        {photoURL ? (
                            <img src={photoURL} className="w-8 h-8 rounded-full border border-white/50 object-cover" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                                {displayName.charAt(0)}
                            </div>
                        )}
                        <span className="font-medium text-sm text-shadow shadow-black">{displayName}</span>
                        <span className="text-xs text-white/70 ml-2">
                            {(() => {
                                const diff = Date.now() - new Date(story.createdAt).getTime();
                                const hrs = Math.floor(diff / (1000 * 60 * 60));
                                const mins = Math.floor(diff / (1000 * 60));
                                return hrs > 0 ? `${hrs}h` : `${mins}m`;
                            })()}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {user && user.uid === story.authorId && (
                            <button onClick={handleDelete} className="p-2 hover:bg-white/10 rounded-full text-red-500">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                        <button className="p-2 hover:bg-white/10 rounded-full">
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Interactions Bottom Bar (Insta Style) - Only if NOT owner */}
                {user && user.uid !== story.authorId && (
                    <div
                        className="absolute bottom-4 left-4 right-4 z-50 flex items-center gap-3"
                        onClick={(e) => e.stopPropagation()} // Prevent story navigation
                    >
                        <form
                            onSubmit={handleReply}
                            className="flex-1"
                        >
                            <input
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onFocus={() => setIsPaused(true)}
                                onBlur={() => !replyText && setIsPaused(false)}
                                placeholder="Send message"
                                className="w-full bg-transparent border border-white/50 rounded-full px-4 py-3 text-white placeholder-white/70 focus:outline-none focus:border-white focus:bg-black/20 backdrop-blur-sm transition-all text-sm"
                            />
                        </form>

                        <button
                            onClick={handleLike}
                            className={`p-3 rounded-full transition-transform active:scale-90 ${isLiked ? 'text-red-500' : 'text-white'}`}
                        >
                            <Heart className={`w-7 h-7 ${isLiked ? 'fill-current' : ''}`} />
                        </button>

                        <button className="p-2 text-white hover:opacity-80 -rotate-12">
                            <Share className="w-6 h-6" />
                        </button>
                    </div>
                )}

                {/* Viewers Button (for Owner) - High Z-Index */}
                {user && user.uid === story.authorId && (
                    <div className="absolute bottom-6 left-4 z-[60]">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowViewers(true);
                                setIsPaused(true);
                            }}
                            className="bg-black/40 backdrop-blur-md text-white px-3 py-1.5 rounded-full flex items-center gap-2 hover:bg-black/60 transition-colors border border-white/10"
                        >
                            <Eye className="w-4 h-4" />
                            <span className="text-sm font-bold">{(story.viewers || []).length}</span>
                        </button>
                    </div>
                )}

                {/* Content */}
                <div
                    className="w-full h-full relative"
                    onMouseDown={() => setIsPaused(true)}
                    onMouseUp={() => setIsPaused(false)}
                    onTouchStart={() => setIsPaused(true)}
                    onTouchEnd={() => setIsPaused(false)}
                >
                    {story.type === 'image' ? (
                        <img
                            src={story.mediaUrl}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                    ) : (
                        <video
                            ref={videoRef}
                            src={story.mediaUrl}
                            className="w-full h-full object-cover"
                            autoPlay={!isPaused && !showViewers}
                            playsInline
                            muted={!!story.overlays?.some(o => o.type === 'music')}
                            onTimeUpdate={handleVideoUpdate}
                            onEnded={handleNext}
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                    )}

                    {/* Fallback for Expired Content */}
                    <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-900 text-white flex-col gap-2">
                        <span className="text-4xl">⚠️</span>
                        <p className="font-bold">Content Expired</p>
                        <p className="text-xs text-gray-400">This story is no longer available.</p>
                    </div>

                    {renderOverlays()}

                    {/* Repost Button for Mentioned Users */}
                    {isMentioned && onRepost && !showViewers && (
                        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRepost(story.mediaUrl, story.type);
                                }}
                                className="bg-white text-black px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
                            >
                                <Share className="w-4 h-4" />
                                Add to your story
                            </button>
                        </div>
                    )}
                </div>

                {/* Navigation Hotspots - Block when viewers list is open */}
                {!showViewers && (
                    <>
                        <div className="absolute top-0 left-0 w-1/4 h-full z-20" onClick={handlePrev} />
                        <div className="absolute top-0 right-0 w-1/4 h-full z-20" onClick={handleNext} />
                    </>
                )}
            </div>
        </div>
    );
}
