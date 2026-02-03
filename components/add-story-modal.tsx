'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createStory, UserProfile, StoryOverlay, getUsers } from '@/lib/db';
import { uploadAttachment } from '@/lib/storage';
import { compressImage } from '@/lib/image-compression';
import { Loader2, Upload, X, Music, Sticker, MapPin, AtSign, Type, Send, Trash2 } from 'lucide-react';

interface AddStoryModalProps {
    onClose: () => void;
    currentProfile: UserProfile;
    initialMediaUrl?: string; // For reposts
    initialMediaType?: 'image' | 'video';
}

// Mock Music Tracks
const MUSIC_TRACKS = [
    { id: '1', title: 'Lofi Chill', artist: 'Sone Beats', url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Chad_Crouch/Arps/Chad_Crouch_-_Elipses.mp3' }, // Public domain placeholder
    { id: '2', title: 'Upbeat Summer', artist: 'Sone Vibes', url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Tours/Enthusiast/Tours_-_01_-_Enthusiast.mp3' },
];

export function AddStoryModal({ onClose, currentProfile, initialMediaUrl, initialMediaType = 'image' }: AddStoryModalProps) {
    const { user } = useAuth();
    const [step, setStep] = useState<'upload' | 'edit'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [storyType, setStoryType] = useState<'image' | 'video'>('image');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    // Load initial media (Repost logic)
    useEffect(() => {
        if (initialMediaUrl) {
            // Convert URL to Blob/File so we can re-upload or just use URL?
            // Re-upload is safer to own the file, but for MVP we can just pass the URL as if it was uploaded?
            // But createStory expects mediaUrl.
            // If we don't have a File object, handlePost might crash if we try to uploadAttachment(null).

            setPreviewUrl(initialMediaUrl);
            setStoryType(initialMediaType);
            setStep('edit');
            // Note: file is null, so handlePost needs to handle "already uploaded" URL.
        }
    }, [initialMediaUrl]);
    const [uploading, setUploading] = useState(false);

    // Editor State
    const [overlays, setOverlays] = useState<StoryOverlay[]>([]);
    const [activeTool, setActiveTool] = useState<string | null>(null); // 'music', 'sticker', 'mention', 'location'
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [users, setUsers] = useState<UserProfile[]>([]);

    useEffect(() => {
        if (user) {
            getUsers(user.uid).then(u => setUsers(u.slice(0, 50)));
        }
    }, [user]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);
            setPreviewUrl(URL.createObjectURL(f));
            setStoryType(f.type.startsWith('video/') ? 'video' : 'image');
            setStep('edit');
        }
    };

    const addOverlay = (type: StoryOverlay['type'], content: string, meta?: any) => {
        const newOverlay: StoryOverlay = {
            id: Date.now().toString(),
            type,
            content,
            style: { x: 50, y: 50, scale: 1, rotation: 0, color: '#FFFFFF' },
            meta
        };
        setOverlays([...overlays, newOverlay]);
        setActiveTool(null);
    };

    const updateOverlayPosition = (id: string, x: number, y: number) => {
        setOverlays(prev => prev.map(o => o.id === id ? { ...o, style: { ...o.style!, x, y } } : o));
    };

    const searchPlaces = async (query: string) => {
        setSearching(true);
        try {
            // Use local proxy to avoid CORS/Mixed Content issues
            const res = await fetch(`/api/location?q=${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error('Search failed');
            const data = await res.json();
            setSearchResults(data.results || []);
        } catch (e) {
            console.error("Location search failed", e);
        } finally {
            setSearching(false);
        }
    };
    const handlePost = async () => {
        if (!user || (!file && !initialMediaUrl)) return;
        setUploading(true);
        try {
            let url = initialMediaUrl || '';

            if (file) {
                const path = `stories/${user.uid}/${Date.now()}_${file.name}`;
                url = await uploadAttachment(path, file) || '';
            }

            const newStory = await createStory({
                authorId: user.uid,
                authorName: currentProfile.displayName,
                authorPhotoURL: currentProfile.photoURL || undefined,
                mediaUrl: url,
                type: storyType,
                scope: 'college',
                college: currentProfile.college || undefined,
                city: currentProfile.city || undefined,
                overlays: overlays
            });

            // Send Notifications to Mentioned Users
            const mentions = overlays.filter(o => o.type === 'mention');
            if (mentions.length > 0) {
                // Dynamic import to avoid circular dependencies if any (though safe here)
                const { sendMessage } = await import('@/lib/db');

                for (const mention of mentions) {
                    const mentionedUid = mention.content;
                    // Deterministic ID
                    const ids = [user.uid, mentionedUid].sort();
                    const connectionId = ids.join('_');

                    // Send System / Bot message or User message? User message "Mentioned you..."
                    await sendMessage(
                        connectionId,
                        user.uid,
                        `Mentioned you in their story`,
                        {
                            type: 'story_mention',
                            storyId: newStory.id,
                            url: url,
                            postAuthor: currentProfile.displayName
                        }
                    );
                }
            }

            onClose();
        } catch (error) {
            console.error("Failed to post story", error);
            alert("Failed to post story. Check console.");
        } finally {
            setUploading(false);
        }
    };

    // Render Tools
    const renderTools = () => (
        <div className="absolute top-4 right-4 flex flex-col gap-4 z-20">
            <button onClick={() => setActiveTool('music')} className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-sm">
                <Music className="w-5 h-5" />
            </button>
            <button onClick={() => setActiveTool('sticker')} className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-sm">
                <Sticker className="w-5 h-5" />
            </button>
            <button onClick={() => setActiveTool('mention')} className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-sm">
                <AtSign className="w-5 h-5" />
            </button>
            <button onClick={() => addOverlay('location', currentProfile.city || 'Unknown Location', {})} className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-sm">
                <MapPin className="w-5 h-5" />
            </button>
        </div>
    );

    // Drag Handlers
    const handleDragStart = (id: string, e: React.MouseEvent | React.TouchEvent) => {
        // Stop propagation only for start to avoid parent clicks
        e.stopPropagation();
        setDraggingId(id);
    };

    const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!draggingId) return;

        // Prevent scrolling on mobile while dragging
        // e.preventDefault(); // React synthetic events might be too late for preventDefault in some cases, but trying here.
        // For consistent preventDefault on touchMove, usually needs ref-based non-passive listener,
        // but for MVP let's calculate pos.

        const container = e.currentTarget.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const x = ((clientX - container.left) / container.width) * 100;
        const y = ((clientY - container.top) / container.height) * 100;

        // Clamp to prevent losing it
        const clampedX = Math.max(0, Math.min(100, x));
        const clampedY = Math.max(0, Math.min(100, y));

        updateOverlayPosition(draggingId, clampedX, clampedY);
    };

    const handleDragEnd = () => {
        setDraggingId(null);
    };

    // Render Overlays on Canvas
    const renderOverlays = () => overlays.map(ov => (
        <div
            key={ov.id}
            className={`absolute cursor-move select-none z-10 transition-transform active:scale-105 ${draggingId === ov.id ? 'opacity-80 scale-105' : ''}`}
            style={{
                left: `${ov.style?.x}%`,
                top: `${ov.style?.y}%`,
                transform: `translate(-50%, -50%) scale(${ov.style?.scale || 1}) rotate(${ov.style?.rotation || 0}deg)`,
                touchAction: 'none' // Critical for blocking scroll
            }}
            onMouseDown={(e) => handleDragStart(ov.id, e)}
            onTouchStart={(e) => handleDragStart(ov.id, e)}
            onClick={(e) => {
                e.stopPropagation();
                // delete logic on double click or separate delete button?
                // For now, if not dragging (clicked), maybe show delete confirm?
                // But dragging usually triggers click too.
                // Simplified: If it was a very short click (not drag), assume intent to delete.
                // Implementing sophisticated "Click vs Drag" distinction:
                // If draggingId was set, we ignore click.
            }}
        >
            {/* Delete Button (Visible only when selected/clicked - Simplified for now: Top Right X) */}
            <div className="relative group">
                <button
                    className="absolute -top-4 -right-4 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                        e.stopPropagation();
                        setOverlays(prev => prev.filter(o => o.id !== ov.id));
                    }}
                    onTouchEnd={(e) => { // Better for mobile tap
                        e.stopPropagation();
                        setOverlays(prev => prev.filter(o => o.id !== ov.id));
                    }}
                >
                    <X className="w-3 h-3" />
                </button>

                {ov.type === 'music' && (
                    <div className="bg-white/90 text-black px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md">
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
                    <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md">
                        @ {ov.meta?.name || ov.content}
                    </div>
                )}
                {ov.type === 'emoji' && (
                    <div className="text-4xl drop-shadow-md">
                        {ov.content}
                    </div>
                )}
            </div>
        </div>
    ));

    const renderToolPanel = () => {
        if (!activeTool) return null;
        return (
            <div className="absolute bottom-0 left-0 right-0 bg-black/90 text-white p-4 rounded-t-2xl z-30 animate-in slide-in-from-bottom flex flex-col max-h-[50vh]">
                <div className="flex justify-between items-center mb-3 flex-shrink-0">
                    <h3 className="font-bold capitalize">{activeTool}</h3>
                    <button onClick={() => setActiveTool(null)}><X className="w-5 h-5" /></button>
                </div>

                {/* Search Bar for Music & Location */}
                {(activeTool === 'music' || activeTool === 'location') && (
                    <div className="mb-4 flex-shrink-0">
                        <input
                            type="text"
                            placeholder={activeTool === 'music' ? "Search songs..." : "Search places..."}
                            className="w-full bg-white/10 border-none rounded-lg p-3 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                )}

                <div className="overflow-y-auto flex-1 min-h-0">
                    {/* Loading State */}
                    {searching && <div className="p-4 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}

                    {/* Music Results */}
                    {activeTool === 'music' && (
                        <div className="space-y-2">
                            {/* Recommended / Default if no search */}
                            {!searchQuery && searchResults.length === 0 && (
                                <p className="text-xs text-gray-500 mb-2">Recommended</p>
                            )}

                            {(searchResults.length > 0 ? searchResults : MUSIC_TRACKS).map((track: any) => (
                                <button key={track.id} onClick={() => addOverlay('music', track.url, { title: track.title, artist: track.artist })} className="w-full text-left p-2 hover:bg-white/10 rounded flex items-center gap-3">
                                    {track.cover ? (
                                        <img src={track.cover} className="w-10 h-10 rounded" />
                                    ) : (
                                        <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center"><Music className="w-5 h-5" /></div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{track.title}</p>
                                        <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                                    </div>
                                    {/* Preview Button? Just selecting adds it for now */}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Location Results */}
                    {activeTool === 'location' && (
                        <div className="space-y-2">
                            {/* Current Location Option */}
                            {!searchQuery && (
                                <button
                                    onClick={() => addOverlay('location', currentProfile.city || 'My City', {})}
                                    className="w-full text-left p-3 hover:bg-white/10 rounded flex items-center gap-3 text-blue-400"
                                >
                                    <MapPin className="w-5 h-5" />
                                    <span>Use Current Profile City</span>
                                </button>
                            )}

                            {searchResults.map((place: any) => (
                                <button key={place.id} onClick={() => addOverlay('location', place.name, { full_name: place.full_name })} className="w-full text-left p-3 hover:bg-white/10 rounded border-b border-white/5">
                                    <p className="font-medium">{place.name}</p>
                                    <p className="text-xs text-gray-400 truncate">{place.full_name}</p>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Stickers (Static for now) */}
                    {activeTool === 'sticker' && (
                        <div className="grid grid-cols-5 gap-4 text-3xl p-2">
                            {['🔥', '😂', '❤️', '🎉', '👀', '✨', '💯', '🍕', '😎', '🎵', '🚀', '👋', '😭', '🙌', '🤔'].map(emoji => (
                                <button key={emoji} onClick={() => addOverlay('emoji', emoji)} className="hover:scale-125 transition-transform p-2">
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Mentions */}
                    {activeTool === 'mention' && (
                        <div className="space-y-1">
                            <input
                                type="text"
                                placeholder="Search friends..."
                                className="w-full bg-white/10 border-none rounded-lg p-2 text-sm text-white placeholder:text-gray-400 mb-2"
                                onChange={(e) => {
                                    // Local filter for mentions
                                    const q = e.target.value.toLowerCase();
                                    // Ideally fetch search, but filter `users` state for now
                                    // Implementation note: we need to filter the `users` list derived from prop/fetch
                                }}
                            />
                            {users.map(u => (
                                <button key={u.uid} onClick={() => addOverlay('mention', u.uid, { name: u.displayName || 'User' })} className="w-full text-left p-2 hover:bg-white/10 rounded flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden">
                                        {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : (u.displayName || 'U').charAt(0)}
                                    </div>
                                    <span>{u.displayName || 'User'}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (step === 'upload') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-card w-full max-w-sm rounded-2xl p-6 flex flex-col items-center">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full aspect-square border-2 border-dashed border-muted-foreground/30 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/50 transition-colors mb-4"
                    >
                        <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="font-medium">Create a Story</p>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,video/*" className="hidden" />
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">Cancel</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
            <div className="relative w-full max-w-md h-full md:h-[90vh] md:rounded-xl overflow-hidden bg-black flex flex-col">
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-30 bg-gradient-to-b from-black/50 to-transparent">
                    <button onClick={() => setStep('upload')}><X className="w-6 h-6 text-white" /></button>
                </div>

                {renderTools()}

                {/* Canvas */}
                <div
                    className="relative flex-1 bg-gray-900 flex items-center justify-center overflow-hidden"
                    onMouseMove={handleDragMove}
                    onTouchMove={handleDragMove}
                    onMouseUp={handleDragEnd}
                    onTouchEnd={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                >
                    {previewUrl && storyType === 'image' && <img src={previewUrl} className="w-full h-full object-contain pointer-events-none" />}
                    {previewUrl && storyType === 'video' && <video src={previewUrl} className="w-full h-full object-contain pointer-events-none" autoPlay muted loop />}

                    {renderOverlays()}
                </div>

                {renderToolPanel()}

                {/* Footer */}
                <div className="p-4 bg-black flex justify-between items-center gap-4">
                    <div className="flex-1 text-white text-xs opacity-50">
                        {activeTool ? 'Select an item...' : 'Tap widgets to add'}
                    </div>
                    <button
                        onClick={handlePost}
                        disabled={uploading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 disabled:opacity-50"
                    >
                        {uploading ? <Loader2 className="animate-spin" /> : <Send className="w-5 h-5" />}
                        Share
                    </button>
                </div>
            </div>
        </div>
    );
}
