'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useParams, useRouter } from 'next/navigation';
import { subscribeToMessages, sendMessage, getUserProfile, UserProfile, markConnectionAsRead, setTypingStatus } from '@/lib/db';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { ArrowLeft, Video, Phone, MoreVertical, Send, Paperclip, Image as ImageIcon, FileText, Smile, VenetianMask, Flame, Sparkles, X } from 'lucide-react';
import { useCall } from '@/lib/call-context';

import ChatInput from '@/components/chat-input';
import MessageItem from '@/components/message-item';

export default function ChatPage() {
    const { user, loading: authLoading } = useAuth();
    const { startCall } = useCall();
    const router = useRouter(); // Import useRouter
    const params = useParams();
    const chatId = typeof params.id === 'string' ? params.id : params.id?.[0];

    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
    const [isAnonymousChat, setIsAnonymousChat] = useState(false);
    const [streak, setStreak] = useState(0); // [NEW] Streak State
    const [isRemoteTyping, setIsRemoteTyping] = useState(false); // [NEW] Remote Typing State

    // AI Summary
    const [summary, setSummary] = useState<string | null>(null);
    const [summarizing, setSummarizing] = useState(false);

    const handleSummarize = () => {
        toast.info("Coming Soon!", {
            description: "AI Chat Summary feature will be available in a future update."
        });
    };

    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Effect for Auth redirection
    useEffect(() => {
        if (!authLoading && !user) {
            setLoading(false);
        }
    }, [authLoading, user]);

    useEffect(() => {
        if (authLoading) return; // Wait for auth
        if (!user || !chatId) {
            setLoading(false);
            return;
        }

        // Subscribe to connection info for real-time header updates (anonymity toggle)
        const connRef = doc(db, 'connections', chatId);
        const unsubscribeConn = onSnapshot(connRef, async (connSnap) => {
            if (connSnap.exists()) {
                const data = connSnap.data();
                setStreak(data.streak || 0); // [NEW] Set Streak

                const otherUserId = data.users.find((u: string) => u !== user.uid);

                // Typing Status Check
                if (data.typing && otherUserId) {
                    setIsRemoteTyping(data.typing[otherUserId] === true);
                } else {
                    setIsRemoteTyping(false);
                }

                // Check Anonymity Context
                const lastMsgAnonymous = data.lastMessageIsAnonymous === true;
                const sentByThem = data.lastMessageSenderId === otherUserId;

                if (lastMsgAnonymous && sentByThem) {
                    setIsAnonymousChat(true);
                } else {
                    setIsAnonymousChat(false);
                }

                if (otherUserId && !otherUser) {
                    // One-time profile fetch on first load
                    const profile = await getUserProfile(otherUserId);
                    setOtherUser(profile);
                }
            }
            setLoading(false);
        });

        // Subscribe to messages
        const unsubscribeMessages = subscribeToMessages(chatId, (msgs) => {
            setMessages(msgs);
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            markConnectionAsRead(chatId, user.uid);
        });

        return () => {
            unsubscribeConn();
            unsubscribeMessages();
        };
    }, [user, chatId, authLoading]);

    // Show Auth Loading
    if (authLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    // Show Page Loading (Chat Info)
    const handleSend = async (text: string, attachment?: any, isAnonymous?: boolean) => {
        if ((!text && !attachment) || !user || !chatId) return;

        console.log("ChatPage handleSend receiving:", { text, attachment, isAnonymous });

        // If we are currently in an "Anonymous Context" (they messaged us anonymously), 
        // passing isAnonymous=true here would make OUR reply anonymous.
        // It's up to the user to toggle the switch in ChatInput.
        await sendMessage(chatId, user.uid, text, attachment, isAnonymous);

        // Optimistically update header if we sent it? 
        // No, header reflects THEIR identity status mostly.
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    if (!user) return <div className="p-8 text-center">Please log in to view messages.</div>;

    return (
        <div className="fixed inset-0 z-[55] flex flex-col bg-background pb-20 lg:static lg:z-auto lg:h-[calc(100vh-65px)] lg:pb-0 lg:max-w-3xl lg:mx-auto lg:border-x lg:border-border lg:relative">

            {/* Summary Modal */}
            {summary && (
                <div className="absolute inset-x-4 top-20 z-[60] animate-in fade-in zoom-in-95">
                    <div className="bg-card w-full rounded-2xl border border-border shadow-2xl overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 fill-white" />
                                <h3 className="font-bold">Chat Summary</h3>
                            </div>
                            <button onClick={() => setSummary(null)} className="hover:bg-white/20 p-1 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto prose dark:prose-invert prose-sm max-w-none">
                            <div className="whitespace-pre-wrap">{summary}</div>
                        </div>
                    </div>
                    {/* Backdrop to close */}
                    <div className="fixed inset-0 z-[-1]" onClick={() => setSummary(null)} />
                </div>
            )}

            {/* Header */}
            <div className="p-4 border-b border-border flex items-center gap-4 bg-background/95 backdrop-blur sticky top-0 z-50 w-full">
                <button
                    onClick={() => router.push('/messages')}
                    className="p-2 -ml-2 hover:bg-secondary rounded-full lg:hidden"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden shrink-0 border border-border ${isAnonymousChat ? 'bg-zinc-800 text-zinc-400' : 'bg-secondary text-primary'}`}>
                    {isAnonymousChat ? (
                        <VenetianMask className="w-5 h-5" />
                    ) : otherUser?.photoURL ? (
                        <img src={otherUser.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                        otherUser?.displayName?.charAt(0)
                    )}
                </div>
                <div className="flex-1">
                    <h2 className="font-semibold flex items-center gap-2">
                        {isAnonymousChat ? 'Anonymous Student' : (otherUser?.displayName || 'Chat')}
                        {streak > 0 && (
                            <span className="flex items-center gap-0.5 text-orange-500 text-xs font-bold bg-orange-50 dark:bg-orange-950/30 px-1.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-800" title={`${streak} Day Streak!`}>
                                <Flame className="w-3 h-3 fill-orange-500" />
                                {streak}
                            </span>
                        )}
                    </h2>
                    <p className="text-xs text-muted-foreground">{isAnonymousChat ? 'Identity hidden' : otherUser?.college}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSummarize}
                        disabled={summarizing}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors text-sm font-medium ${summarizing ? 'bg-secondary text-muted-foreground animate-pulse' : 'hover:bg-secondary text-indigo-500'}`}
                        title="Summarize Chat"
                    >
                        {summarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        <span className="font-semibold hidden sm:inline">AI Chat Summary</span>
                    </button>
                    <button
                        onClick={() => otherUser && startCall(otherUser.uid, isAnonymousChat ? 'Anonymous' : otherUser.displayName, false)}
                        className="p-2 hover:bg-secondary rounded-full transition-colors"
                        title="Voice Call"
                    >
                        <Phone className="w-5 h-5 text-primary" />
                    </button>
                    <button
                        onClick={() => otherUser && startCall(otherUser.uid, isAnonymousChat ? 'Anonymous' : otherUser.displayName, true)}
                        className="p-2 hover:bg-secondary rounded-full transition-colors"
                        title="Video Call"
                    >
                        <Video className="w-5 h-5 text-primary" />
                    </button>
                    <button
                        onClick={() => otherUser && startCall(otherUser.uid, isAnonymousChat ? 'Anonymous' : (otherUser.displayName || 'User'), true, true)}
                        className="p-2 hover:bg-secondary rounded-full transition-colors group relative"
                        title="Anonymous Call"
                    >
                        <VenetianMask className="w-5 h-5 text-zinc-400 group-hover:text-purple-500 transition-colors" />
                        <span className="absolute -bottom-8 right-0 text-xs bg-black px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            Call Anonymously
                        </span>
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 smooth-scroll">
                {messages.map((msg, idx) => {
                    const isMe = msg.senderId === user?.uid;
                    const showHeader = idx === 0 || messages[idx - 1].senderId !== msg.senderId;

                    // Enrich message with profile data if missing
                    // This fixes the "Student" label issue by providing the real name/photo
                    // Enrich message with profile data only if NOT anonymous
                    const enrichedMsg = {
                        ...msg,
                        senderName: msg.isAnonymous ? undefined : (msg.senderName || (isMe ? user?.displayName : otherUser?.displayName)),
                        senderPhoto: msg.isAnonymous ? undefined : (msg.senderPhoto || (isMe ? user?.photoURL : otherUser?.photoURL))
                    };

                    return (
                        <MessageItem
                            key={msg.id}
                            message={enrichedMsg}
                            isMe={isMe}
                            showHeader={showHeader}
                        />
                    );
                })}
                <div ref={scrollRef} />

                {/* Typing Indicator Bubble */}
                {isRemoteTyping && (
                    <div className="flex items-center gap-2 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0 border border-border">
                            {otherUser?.photoURL ? (
                                <img src={otherUser.photoURL} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xs font-bold">{otherUser?.displayName?.charAt(0)}</span>
                            )}
                        </div>
                        <div className="bg-secondary px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1 shadow-sm">
                            <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <ChatInput
                onSendMessage={handleSend}
                onTyping={(isTyping) => user && chatId && setTypingStatus(chatId, user.uid, isTyping)}
                uploadPath={`chats/${chatId}`}
                lastMessage={(messages.length > 0 && user && messages[messages.length - 1].senderId !== user.uid) ? messages[messages.length - 1].text : undefined}
                context={`Private Chat with ${otherUser?.displayName || 'User'}`}
            />
        </div>
    );
}
