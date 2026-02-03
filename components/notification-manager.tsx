'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { Notification, subscribeToNotifications, markNotificationAsRead, checkFriendsBirthdays } from '@/lib/db';
import { X, Bell, MessageCircle, Heart, UserPlus, Calendar, Info, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    isPanelOpen: boolean;
    togglePanel: () => void;
    closePanel: () => void;
    markAsRead: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}

interface Toast {
    id: string; // notification id
    data: Notification;
    visible: boolean;
}

export function NotificationManager({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const pathname = usePathname();
    const router = useRouter();

    // Ref to track previous notifications for diffing
    const prevNotifsRef = useRef<Set<string>>(new Set());
    const isFirstLoad = useRef(true);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        if (user) {
            checkFriendsBirthdays(user.uid).catch(console.error);
        }

        const unsubscribe = subscribeToNotifications(user.uid, (newNotifs) => {
            setNotifications(newNotifs);

            // Toast Logic
            if (isFirstLoad.current) {
                // Don't toast on initial load, just populate ref
                newNotifs.forEach(n => prevNotifsRef.current.add(n.id));
                isFirstLoad.current = false;
            } else {
                // Find new ones
                const brandNew = newNotifs.filter(n => !prevNotifsRef.current.has(n.id) && !n.seen);

                if (brandNew.length > 0) {
                    // Add to toasts
                    const newToasts = brandNew.map(n => ({ id: n.id, data: n, visible: true }));
                    setToasts(prev => [...prev, ...newToasts]);

                    // Add to ref
                    brandNew.forEach(n => prevNotifsRef.current.add(n.id));

                    // Auto-dismiss after 5s
                    setTimeout(() => {
                        setToasts(current => current.map(t =>
                            brandNew.some(bn => bn.id === t.id) ? { ...t, visible: false } : t
                        ));
                        // Actual cleanup from state could occur later or just filter by visible
                    }, 5000);
                }
            }
        });

        return () => unsubscribe();
    }, [user]);

    // Cleanup invisible toasts periodically
    useEffect(() => {
        const interval = setInterval(() => {
            setToasts(prev => prev.filter(t => t.visible));
        }, 6000);
        return () => clearInterval(interval);
    }, []);

    // Close panel on route change
    useEffect(() => {
        setIsPanelOpen(false);
    }, [pathname]);

    const unreadCount = notifications.filter(n => !n.seen).length;

    const togglePanel = () => setIsPanelOpen(!isPanelOpen);
    const closePanel = () => setIsPanelOpen(false);

    const markAsRead = async (id: string) => {
        if (!user) return;
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, seen: true } : n));
        await markNotificationAsRead(user.uid, id);
    };

    const handleNotificationClick = async (n: Notification) => {
        // Mark read
        if (!n.seen) {
            markAsRead(n.id);
        }

        // Navigate
        if (n.link) {
            router.push(n.link);
        }
    };

    // Helper: Icon per type
    const getIcon = (type: string) => {
        switch (type) {
            case 'message': return <MessageCircle className="w-4 h-4 text-blue-500" />;
            case 'like': return <Heart className="w-4 h-4 text-red-500" />;
            case 'comment': return <MessageCircle className="w-4 h-4 text-green-500" />;
            case 'follow': return <UserPlus className="w-4 h-4 text-purple-500" />;
            case 'birthday': return <Calendar className="w-4 h-4 text-pink-500" />;
            case 'feedback_reply': return <Info className="w-4 h-4 text-primary" />;
            default: return <Info className="w-4 h-4 text-gray-500" />;
        }
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, isPanelOpen, togglePanel, closePanel, markAsRead }}>
            {children}

            {/* Toasts Container */}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        onClick={() => { handleNotificationClick(toast.data); setToasts(p => p.filter(t => t.id !== toast.id)); }}
                        className={`pointer-events-auto bg-background/95 backdrop-blur border border-border/50 shadow-lg rounded-xl p-3 w-80 flex items-start gap-3 transition-all duration-500 transform cursor-pointer hover:bg-muted/50 ${toast.visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
                            }`}
                    >
                        <div className="mt-1 p-1.5 bg-secondary rounded-full shrink-0">
                            {getIcon(toast.data.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold truncate">{toast.data.title}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2">{toast.data.body}</p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); setToasts(p => p.filter(t => t.id !== toast.id)); }}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Inbox Panel (Drawer/Overlay) */}
            {isPanelOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-black/20 z-[90]" onClick={closePanel} />

                    {/* Panel */}
                    <div className="fixed sm:top-16 sm:right-4 sm:w-96 sm:h-[80vh] sm:max-h-[600px] sm:rounded-2xl
                                    fixed bottom-0 left-0 right-0 h-[80vh] rounded-t-2xl
                                    bg-background border border-border shadow-2xl z-[95] flex flex-col animate-in slide-in-from-bottom-5 sm:slide-in-from-right-5 duration-200">
                        {/* Header */}
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h3 className="font-bold flex items-center gap-2">
                                <Bell className="w-4 h-4" /> Notifications
                                {unreadCount > 0 && <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
                            </h3>
                            <button onClick={closePanel} className="p-2 hover:bg-secondary rounded-full"><X className="w-4 h-4" /></button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {notifications.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                                    <Bell className="w-8 h-8 mb-3 opacity-20" />
                                    <p>No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <div
                                        key={n.id}
                                        onClick={() => handleNotificationClick(n)}
                                        className={`flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer ${n.seen ? 'hover:bg-muted/50' : 'bg-primary/5 hover:bg-primary/10'}`}
                                    >
                                        <div className={`mt-1 rounded-full shrink-0 overflow-hidden ${n.senderPhotoURL ? 'w-8 h-8' : 'p-1.5 ' + (n.seen ? 'bg-secondary' : 'bg-background shadow-sm border border-border')}`}>
                                            {n.senderPhotoURL ? (
                                                <img src={n.senderPhotoURL} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                getIcon(n.type)
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className={`text-sm ${n.seen ? 'font-medium' : 'font-bold'}`}>{n.title}</h4>
                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                                    {new Date(n.createdAt).toLocaleDateString() === new Date().toLocaleDateString()
                                                        ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                        : new Date(n.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className={`text-xs ${n.seen ? 'text-muted-foreground' : 'text-foreground'}`}>{n.body}</p>
                                        </div>
                                        {!n.seen && (
                                            <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </NotificationContext.Provider>
    );
}
