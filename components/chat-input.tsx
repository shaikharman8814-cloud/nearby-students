'use client';

import { useState, useRef, useEffect } from 'react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Send, Smile, Paperclip, Image as ImageIcon, FileText, MapPin, Video, Loader2, X, Sticker, Ghost } from 'lucide-react';
import { uploadAttachment } from '@/lib/storage';
import { useAuth } from '@/lib/auth-context'; // [NEW] Import useAuth
import { getUserProfile } from '@/lib/db'; // [NEW] Import getUserProfile

interface ChatInputProps {
    onSendMessage: (text: string, attachment?: { type: 'image' | 'video' | 'file' | 'location', url?: string, name?: string, location?: { lat: number, lng: number } }, isAnonymous?: boolean) => Promise<void>;
    uploadPath: string; // "chats/connectionId" or "groups/groupId"
    lastMessage?: string; // [NEW] Context for Smart Reply
    context?: string; // [NEW] "Private Chat" or "Group Chat"
    onTyping?: (isTyping: boolean) => void; // [NEW] Typing Indicator
}

export default function ChatInput({ onSendMessage, uploadPath, lastMessage, context, onTyping }: ChatInputProps) {
    const { user } = useAuth(); // [NEW] Get user from auth context
    const [message, setMessage] = useState('');
    const [showEmoji, setShowEmoji] = useState(false);
    const [showAttachments, setShowAttachments] = useState(false);
    const [showGif, setShowGif] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [isAnonymous, setIsAnonymous] = useState(false);

    // Smart Reply State
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [smartRepliesEnabled, setSmartRepliesEnabled] = useState(true); // Default to true

    // Fetch user profile setting for smart replies on mount
    useEffect(() => {
        if (!user?.uid) return;

        const fetchSmartRepliesSetting = async () => {
            try {
                const profile = await getUserProfile(user.uid);
                if (profile && profile.notificationPreferences) {
                    // Check strict boolean, default to true if undefined
                    setSmartRepliesEnabled(profile.notificationPreferences.smartReplies !== false);
                }
            } catch (e) {
                console.warn("Failed to fetch smart replies setting", e);
            }
        };
        fetchSmartRepliesSetting();
    }, [user?.uid]);

    // Fetch Smart Replies
    useEffect(() => {
        if (!lastMessage) {
            // console.log("SmartReply: No last message"); 
            setSuggestions([]);
            return;
        }
        if (!smartRepliesEnabled) {
            console.log("SmartReply: Disabled by user setting");
            setSuggestions([]);
            return;
        }

        // Clear old suggestions immediately
        setSuggestions([]);

        const fetchSuggestions = async () => {
            // Debounce/Delay slightly to avoid fetching on rapid incoming
            await new Promise(r => setTimeout(r, 500));

            try {
                setLoadingSuggestions(true);
                const res = await fetch('/api/chat/smart-reply', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lastMessage, context })
                });

                if (!res.ok) {
                    // console.warn("Smart Reply API Error:", res.status, res.statusText);
                }

                const data = await res.json();
                // console.log("Smart Reply API Response:", data);

                if (data.replies && Array.isArray(data.replies)) {
                    setSuggestions(data.replies);
                }
            } catch (e) {
                console.warn("Smart Reply failed", e);
            } finally {
                setLoadingSuggestions(false);
            }
        };

        fetchSuggestions();
    }, [lastMessage, context, smartRepliesEnabled]); // Added smartRepliesEnabled to dependencies

    const handleSuggestionClick = (reply: string) => {
        setMessage(reply);
        setSuggestions([]); // Clear after use
        // specific user request: "Insert text into the input field (default)"
    };

    // GIF State
    const [gifSearch, setGifSearch] = useState('');
    const [gifs, setGifs] = useState<any[]>([]);
    const [loadingGifs, setLoadingGifs] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
    const emojiRef = useRef<HTMLDivElement>(null);
    const attachmentsRef = useRef<HTMLDivElement>(null);
    const gifRef = useRef<HTMLDivElement>(null);

    // Close emoji/attachment popups when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
                setShowEmoji(false);
            }
            if (attachmentsRef.current && !attachmentsRef.current.contains(event.target as Node) &&
                !(event.target as HTMLElement).closest('.attachment-menu-trigger')) {
                setShowAttachments(false);
            }
            if (gifRef.current && !gifRef.current.contains(event.target as Node)) {
                setShowGif(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSend = async () => {
        if (!message.trim()) return;
        const text = message;
        setMessage('');
        setShowEmoji(false);
        setSuggestions([]); // Clear suggestions
        const currentAnonymous = isAnonymous;
        console.log("ChatInput Sending Text: isAnonymous=", currentAnonymous);
        // setIsAnonymous(false); // Removed auto-reset based on user feedback to allow continuous anonymous chat
        await onSendMessage(text, undefined, currentAnonymous);
    };

    const handleEmojiClick = (emojiData: EmojiClickData) => {
        setMessage((prev) => prev + emojiData.emoji);
    };

    // --- GIF Logic ---
    useEffect(() => {
        if (showGif) {
            searchGifs('trending');
        }
    }, [showGif]);

    const searchGifs = async (query: string) => {
        setLoadingGifs(true);
        try {
            // Using Tenor public anonymous key for demo purposes. 
            // In production, use your own key in env.
            const q = query === 'trending' ? '' : `&q=${query}`;
            const endpoint = query === 'trending'
                ? `https://g.tenor.com/v1/trending?key=LIVDSRZULELA&limit=20`
                : `https://g.tenor.com/v1/search?key=LIVDSRZULELA&limit=20${q}`;

            const res = await fetch(endpoint);
            const data = await res.json();
            setGifs(data.results || []);
        } catch (e) {
            console.warn("Failed to fetch GIFs", e);
        } finally {
            setLoadingGifs(false);
        }
    };

    const handleGifSelect = async (gifUrl: string) => {
        setShowGif(false);
        // Send as image attachment
        const currentAnonymous = isAnonymous;
        // setIsAnonymous(false); // Persist
        await onSendMessage('', {
            type: 'image',
            url: gifUrl,
            name: 'GIF'
        }, currentAnonymous);
    };
    // ----------------

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'file') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setShowAttachments(false);
        setIsUploading(true);
        try {
            let finalType = type;
            if (file.type.startsWith('image/')) finalType = 'image';
            else if (file.type.startsWith('video/')) finalType = 'video';

            const url = await uploadAttachment(uploadPath, file);
            const currentAnonymous = isAnonymous;
            // setIsAnonymous(false); // Persist
            await onSendMessage('', {
                type: finalType,
                url,
                name: file.name
            }, currentAnonymous);
        } catch (error) {
            console.warn("Upload failed", error);
            alert("Failed to upload file. Please check your connection and try again.");
        } finally {
            setIsUploading(false);
            if (e.target) e.target.value = ''; // Reset input
        }
    };

    const handleLocationShare = () => {
        setShowAttachments(false);
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        const currentAnonymous = isAnonymous;
        // Don't reset anonymous here until location is fetched (or maybe keep it consistent)
        // Let's perform reset inside the callbacks to be safe, or capture it now.
        // Captured in `currentAnonymous` const.

        if (!window.isSecureContext) {
            setLocationLoading(true);
            fetch('https://ipapi.co/json/')
                .then(res => res.json())
                .then(data => {
                    // setIsAnonymous(false); // Persist
                    onSendMessage('', {
                        type: 'location',
                        location: { lat: data.latitude, lng: data.longitude }
                    }, currentAnonymous);
                })
                .catch(e => { console.warn(e); alert("Location sharing failed."); })
                .finally(() => setLocationLoading(false));
            return;
        }

        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    // setIsAnonymous(false); // Persist
                    await onSendMessage('', {
                        type: 'location',
                        location: { lat: position.coords.latitude, lng: position.coords.longitude }
                    }, currentAnonymous);
                } catch (e) { console.warn(e); } finally { setLocationLoading(false); }
            },
            (error) => {
                const errorMessage = error.message || "Unknown error";
                console.warn(`Geolocation failed (${error.code}): ${errorMessage}. Falling back to IP-based location.`);

                fetch('https://ipapi.co/json/')
                    .then(res => res.json())
                    .then(data => {
                        // setIsAnonymous(false); // Persist
                        onSendMessage('', {
                            type: 'location',
                            location: { lat: data.latitude, lng: data.longitude }
                        }, currentAnonymous);
                    })
                    .catch(e => { console.warn(e); alert("Location sharing failed."); })
                    .finally(() => setLocationLoading(false));
            }
        );
    };

    return (
        <div className="p-4 border-t border-border bg-card relative z-20">
            {/* Smart Reply Chips */}
            {suggestions.length > 0 && !message && (
                <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar animate-in slide-in-from-bottom-2 fade-in duration-300">
                    {suggestions.map((reply, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSuggestionClick(reply)}
                            className="whitespace-nowrap px-3 py-1.5 rounded-full bg-secondary hover:bg-primary/10 hover:text-primary transition-colors text-xs font-medium border border-border"
                        >
                            {reply}
                        </button>
                    ))}
                </div>
            )}

            {/* Emoji Picker */}
            {showEmoji && (
                <div ref={emojiRef} className="absolute bottom-20 left-4 z-[100] shadow-2xl rounded-2xl animate-in duration-200 slide-in-from-bottom-2">
                    <EmojiPicker onEmojiClick={handleEmojiClick} theme={Theme.AUTO} lazyLoadEmojis={true} />
                </div>
            )}

            {/* GIF Picker */}
            {showGif && (
                <div ref={gifRef} className="absolute bottom-20 left-0 right-0 mx-auto w-full max-w-sm z-[100] bg-popover border border-border rounded-xl shadow-2xl p-4 animate-in duration-200 slide-in-from-bottom-2 h-80 flex flex-col">
                    <div className="mb-3">
                        <input
                            type="text"
                            placeholder="Search GIFs..."
                            value={gifSearch}
                            onChange={(e) => {
                                setGifSearch(e.target.value);
                                if (e.target.value.length > 2) searchGifs(e.target.value);
                            }}
                            className="w-full bg-secondary px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-3 gap-2">
                        {loadingGifs ? (
                            <div className="col-span-3 flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
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

            {/* Attachments Menu (unchanged logic) */}
            {showAttachments && (
                <div ref={attachmentsRef} className="absolute bottom-20 left-16 z-[100] bg-popover border border-border rounded-xl shadow-xl p-2 flex flex-col gap-1 min-w-[160px] animate-in duration-200 fade-in slide-in-from-bottom-2">
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 p-2 hover:bg-secondary rounded-lg text-sm transition-colors text-left">
                        <div className="p-1.5 bg-blue-100 text-blue-600 rounded-full"><ImageIcon className="w-4 h-4" /></div>
                        Photo
                    </button>
                    <button onClick={() => videoInputRef.current?.click()} className="flex items-center gap-3 p-2 hover:bg-secondary rounded-lg text-sm transition-colors text-left">
                        <div className="p-1.5 bg-pink-100 text-pink-600 rounded-full"><Video className="w-4 h-4" /></div>
                        Video
                    </button>
                    <button onClick={() => docInputRef.current?.click()} className="flex items-center gap-3 p-2 hover:bg-secondary rounded-lg text-sm transition-colors text-left">
                        <div className="p-1.5 bg-orange-100 text-orange-600 rounded-full"><FileText className="w-4 h-4" /></div>
                        Document
                    </button>
                    <button onClick={handleLocationShare} disabled={locationLoading} className="flex items-center gap-3 p-2 hover:bg-secondary rounded-lg text-sm transition-colors text-left disabled:opacity-50">
                        <div className="p-1.5 bg-green-100 text-green-600 rounded-full">
                            {locationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                        </div>
                        Location
                    </button>
                </div>
            )}

            {/* Hidden Inputs */}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} />
            <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={(e) => handleFileUpload(e, 'video')} />
            <input type="file" ref={docInputRef} className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => handleFileUpload(e, 'file')} />

            {/* Loading Overlay */}
            {isUploading && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center backdrop-blur-sm z-40 rounded-t-xl">
                    <div className="bg-card p-3 rounded-xl shadow-lg flex items-center gap-3 border border-border">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span className="text-sm font-medium">Uploading...</span>
                    </div>
                </div>
            )}

            <div className="flex gap-2 items-end">
                {/* Attachment Button */}
                <button
                    onClick={() => setShowAttachments(!showAttachments)}
                    className="attachment-menu-trigger p-2.5 rounded-full bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                    {showAttachments ? <X className="w-5 h-5" /> : <Paperclip className="w-5 h-5" />}
                </button>

                {/* GIF Button */}
                <button
                    onClick={() => setShowGif(!showGif)}
                    className="flex p-2.5 rounded-full bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    title="GIF"
                >
                    <Sticker className="w-5 h-5" />
                </button>


                <div className="flex-1 bg-background/50 border border-input rounded-3xl p-1 flex items-end focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                    {/* Anonymous Toggle */}
                    <button
                        onClick={() => setIsAnonymous(!isAnonymous)}
                        className={`p-2 transition-colors rounded-full ${isAnonymous ? 'bg-zinc-800 text-white' : 'text-muted-foreground hover:text-purple-500'}`}
                        title="Toggle Anonymous Mode"
                    >
                        <Ghost className="w-5 h-5" />
                    </button>

                    {/* Emoji Button */}
                    <button
                        onClick={() => setShowEmoji(!showEmoji)}
                        className="p-2 text-muted-foreground hover:text-yellow-500 transition-colors"
                    >
                        <Smile className="w-5 h-5" />
                    </button>

                    <textarea
                        value={message}
                        onChange={(e) => {
                            setMessage(e.target.value);
                            if (e.target.value) setSuggestions([]); // Hide suggestions when typing

                            // Typing Indicator Logic
                            if (onTyping) {
                                onTyping(true);
                                // Clear existing timeout
                                if ((window as any).typingTimeout) clearTimeout((window as any).typingTimeout);
                                // Set new timeout to stop typing after 3s
                                (window as any).typingTimeout = setTimeout(() => {
                                    onTyping(false);
                                }, 3000);
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                                // Stop typing immediately on send
                                if (onTyping) {
                                    if ((window as any).typingTimeout) clearTimeout((window as any).typingTimeout);
                                    onTyping(false);
                                }
                            }
                        }}
                        placeholder={isAnonymous ? "Send anonymous message..." : "Type a message..."}
                        className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[40px] py-2.5 px-2 text-sm leading-5 placeholder:text-muted-foreground/50"
                        rows={1}
                        style={{ height: 'auto', minHeight: '40px' }}
                    />
                </div>

                {/* Send Button */}
                <button
                    onClick={handleSend}
                    disabled={!message.trim()}
                    className="p-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
