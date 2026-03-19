'use client';

import { UserProfile, getConnection, sendConnectionRequest, respondToRequest, Connection, sendMessage, getUserLevel } from '@/lib/db';
import { UserPlus, MapPin, GraduationCap, Check, Clock, MessageCircle, VenetianMask, Zap } from 'lucide-react';
import { useState, useEffect, memo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UserCardProps {
    profile: UserProfile;
    currentUserId?: string;
    onConnect?: (targetId: string) => void;
    unit?: 'km' | 'miles';
    initialStatus?: 'none' | 'pending' | 'accepted' | 'rejected';
    currentUserProfile?: UserProfile | null;
}

const getDistanceLabel = (km: number): string | null => {
    if (km <= 1) return "Very Close";
    if (km <= 5) return "Nearby";
    if (km <= 25) return "In City";
    return null;
};

export const UserCard = memo(({ profile, currentUserId, onConnect, unit = 'km', initialStatus, currentUserProfile: propUserProfile }: UserCardProps) => {
    const router = useRouter();
    const [connection, setConnection] = useState<Connection | null>(null);
    const [status, setStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>(initialStatus || 'none');
    const [loading, setLoading] = useState(true);
    const [showConnectModal, setShowConnectModal] = useState(false);

    const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(propUserProfile || null);

    // Sync prop updates
    useEffect(() => {
        if (propUserProfile) setCurrentUserProfile(propUserProfile);
    }, [propUserProfile]);

    useEffect(() => {
        let mounted = true;

        if (currentUserId) {
            // Optimistic / Batch Status: Skip fetch if provided
            if (initialStatus) {
                if (mounted) {
                    setStatus(initialStatus);
                    // Deterministic ID for 'accepted' logic
                    if (initialStatus === 'accepted') {
                        const ids = [currentUserId, profile.uid].sort();
                        setConnection({ id: ids.join('_'), status: 'accepted' } as any);
                    }
                }
            } else {
                getConnection(currentUserId, profile.uid)
                    .then(conn => {
                        if (mounted) {
                            setConnection(conn);
                            setStatus(conn ? conn.status : 'none');
                        }
                    })
                    .catch(err => {
                        if (mounted) setStatus('none');
                    });
            }

            // Use prop if available, else fetch
            // Use prop if available
            if (!propUserProfile) {
                // Do NOT fetch internally to avoid N+1 fetches in lists.
                // Parent should provide profile. If not, we just don't show match tags.
                if (mounted) setLoading(false);
            } else {
                if (mounted) setLoading(false);
            }
        } else {
            setLoading(false);
        }

        return () => { mounted = false; };
    }, [currentUserId, profile.uid, initialStatus, propUserProfile]);

    // Calculate Match Tags
    const getMatchTags = () => {
        if (!currentUserProfile) return [];
        const tags = [];

        // Helper for safe comparison
        const isMatch = (a?: string, b?: string) => {
            return a && b && a.toLowerCase().trim() === b.toLowerCase().trim();
        };

        // City Match
        if (isMatch(currentUserProfile.city, profile.city)) {
            tags.push({ label: 'Same City', icon: MapPin });
        }

        // College Match
        if (isMatch(currentUserProfile.college, profile.college)) {
            tags.push({ label: 'Same College', icon: GraduationCap });
        }

        // Course Match
        const userCourse = (profile.course || "").trim().toLowerCase();
        const myCourse = (currentUserProfile?.course || "").trim().toLowerCase();
        if (userCourse && myCourse && userCourse === myCourse) {
            tags.push({ label: 'Same Course', icon: GraduationCap });
        }

        // Interest Match
        if (currentUserProfile.interests && profile.interests) {
            const common = profile.interests.filter(i =>
                currentUserProfile.interests?.some(myI => myI.toLowerCase() === i.toLowerCase())
            );
            if (common.length > 0) {
                tags.push({ label: `${common.length} Common Interest${common.length > 1 ? 's' : ''}`, icon: Zap });
            }
        }

        return tags;
    };

    const handleConnect = () => {
        setShowConnectModal(true);
    };

    const handleConfirmConnect = async (isAnonymous: boolean) => {
        if (!currentUserId) return;
        setLoading(true);
        setShowConnectModal(false); // Close modal immediately

        try {
            await sendConnectionRequest(currentUserId, profile.uid);

            // Deterministic ID generation
            const ids = [currentUserId, profile.uid].sort();
            const connectionId = ids.join('_');

            // Optimistic update
            const newConn = {
                id: connectionId,
                users: [currentUserId, profile.uid],
                requester: currentUserId,
                recipient: profile.uid,
                status: 'accepted',
                createdAt: new Date().toISOString()
            } as Connection;

            setConnection(newConn);
            setStatus('accepted');

            // Auto-send "Hi" message
            // If anonymous, send as anonymous.
            const defaultMsg = "Hi! Wanna study together? 👋";
            await sendMessage(connectionId, currentUserId, defaultMsg, undefined, isAnonymous);

            // Navigate to chat
            router.push(`/messages/${connectionId}`);

            // if (onConnect) onConnect(profile.uid); // onConnect was just for UI updates if needed
        } catch (error) {
            console.warn("Connection request failed:", error);
            setStatus('none'); // Revert on failure
        } finally {
            setLoading(false);
        }
    };

    const handleMessageClick = async () => {
        if (!connection || !currentUserId) return;

        // Auto-send "Hi" if it's a new connection (no last message)
        if (!connection.lastMessage) {
            const defaultMsg = "Hi! Wanna study together? 👋";
            // We can fire and forget, or await. Await ensures chat exists before nav.
            await sendMessage(connection.id, currentUserId, defaultMsg);
        }

        router.push(`/messages/${connection.id}`);
    };

    const handleResponse = async (response: 'accepted' | 'rejected') => {
        if (!connection) return;
        setLoading(true);
        try {
            await respondToRequest(connection.id, response);
            setStatus(response);
        } catch (error) {
            console.warn("Failed to respond to request:", error);
        } finally {
            setLoading(false);
        }
    };

    const getButtonContent = () => {
        if (loading) return <span className="animate-pulse text-xs text-muted-foreground">Loading...</span>;

        if (status === 'accepted') {
            return (
                <button
                    onClick={handleMessageClick}
                    className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg font-medium transition-colors text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    <MessageCircle className="w-3.5 h-3.5" /> Message
                </button>
            );
        }



        // Default: Show Connect (for 'none', 'rejected')
        return (
            <button
                onClick={handleConnect}
                className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg font-medium transition-colors text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground"
            >
                <UserPlus className="w-3.5 h-3.5" /> Connect
            </button>
        );
    };

    // Helper to capitalize words
    const capitalize = (str?: string) => {
        if (!str) return '';
        return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    };

    // Helper to check if online (active in last 5 mins)
    const isOnline = () => {
        if (!profile.lastActive) return false;
        const lastActiveDate = new Date(profile.lastActive);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return lastActiveDate > fiveMinutesAgo;
    };

    return (
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow relative mobile-gpu profile-card">
            {profile.statusText && (
                <div className="absolute -top-2 -right-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm px-2 py-1 rounded-full text-[10px] font-medium z-10 flex items-center gap-1 animate-in fade-in zoom-in duration-300">
                    {profile.statusEmoji && <span className="text-sm">{profile.statusEmoji}</span>}
                    <span className="max-w-[100px] truncate">{profile.statusText}</span>
                </div>
            )}
            {/* Top Row: Identity & Distance */}
            <div className="user-header">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    <Link href={`/profile/${profile.uid}`} className="shrink-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 overflow-hidden ring-1 ring-border/50">
                            {profile.photoURL ? (
                                <img
                                    src={profile.photoURL}
                                    alt={profile.displayName}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            ) : (
                                <span className="text-sm font-bold text-muted-foreground">
                                    {(capitalize(profile.displayName) || 'Student').trim().charAt(0) || 'S'}
                                </span>
                            )}
                        </div>
                    </Link>

                    <div className="user-identity">
                        <div className="flex items-center gap-2 min-w-0">
                            <Link href={`/profile/${profile.uid}`} className="hover:underline decoration-primary">
                                <span className="user-name font-bold">{(profile.name || profile.displayName || 'Student').trim()}</span>
                            </Link>
                            {profile.isVerified && (
                                <span className="text-blue-500 bg-blue-500/10 rounded-full p-0.5 shrink-0" title="Verified Student">
                                    <Check className="w-3 h-3" />
                                </span>
                            )}
                            {isOnline() && (
                                <span className="relative flex h-2.5 w-2.5 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col">
                            {profile.name && profile.displayName && profile.name !== profile.displayName && (
                                <span className="text-[10px] text-muted-foreground truncate opacity-80">
                                    {decodeURIComponent(profile.displayName)}
                                </span>
                            )}
                            {profile.xp !== undefined && (
                                <div className="user-badge uppercase tracking-tighter text-[9px] font-semibold text-muted-foreground/70">
                                    {getUserLevel(profile.xp)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="user-distance">
                    {(() => {
                        if (profile.distance === undefined || isNaN(Number(profile.distance))) return null;

                        const distanceInKm = unit === 'miles' ? profile.distance * 1.60934 : profile.distance;
                        const label = getDistanceLabel(distanceInKm);

                        return (
                            <div className="flex flex-col items-end gap-0.5">
                                {label && (
                                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                                        {label}
                                    </span>
                                )}
                                <span className="text-[10px] font-semibold text-foreground">
                                    {profile.distance} {unit}
                                </span>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Middle Row: Details */}
            <div className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{capitalize(profile.course) || 'General Course'} {profile.year ? `· ${profile.year}` : ''}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                        {(profile.city && profile.city !== 'undefined') ? capitalize(profile.city) : 'Campus Area'}
                    </span>
                </div>
                {/* @ts-ignore */}
                {profile.college && (
                    <div className="text-xs text-muted-foreground/80 truncate pl-5">
                        {capitalize(profile.college)}
                    </div>
                )}
            </div>

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 mb-1">
                    {profile.interests.slice(0, 3).map((interest, i) => (
                        <span key={i} className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                            {capitalize(interest)}
                        </span>
                    ))}
                    {profile.interests.length > 3 && (
                        <span className="text-[10px] text-muted-foreground flex items-center">+{profile.interests.length - 3}</span>
                    )}
                </div>
            )}

            {/* Match Badges */}
            <div className="flex flex-wrap gap-1 mt-1">
                {getMatchTags().map((tag, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                        <tag.icon className="w-3 h-3" /> {tag.label}
                    </span>
                ))}
            </div>

            {/* Smart Suggestion Text */}
            {currentUserProfile && (
                <div className="text-[10px] text-emerald-600/90 dark:text-emerald-400/90 mt-1 px-1 italic">
                    {(() => {
                        const tags = getMatchTags().map(t => t.label);
                        if (tags.includes('Same City') && tags.includes('Same College')) return `Wow! You both live in ${capitalize(profile.city)} and go to ${capitalize(profile.college)}! Say Hi! 👋`;
                        if (tags.includes('Same City')) return `You both live in ${capitalize(profile.city)}! Great way to start a chat. 🏠`;
                        if (tags.includes('Same College')) return `Fellow student at ${capitalize(profile.college)}! Connect now. 🎓`;
                        if (tags.includes('Same Course')) return `Also studying ${capitalize(profile.course)}! Study buddy? 📚`;
                        return "Looks like a great connection! Say hello. 👋";
                    })()}
                </div>
            )}

            {/* Bottom Row: Action Button */}
            <div className="mt-2">
                {getButtonContent()}
            </div>

            {/* Connect Choice Modal */}
            {showConnectModal && (
                <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
                    <h4 className="text-sm font-bold mb-3 text-center">Connect as...</h4>
                    <div className="flex flex-col gap-2 w-full">
                        <button
                            onClick={() => handleConfirmConnect(false)}
                            className="flex items-center gap-3 w-full p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/20 group"
                        >
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <span className="text-xs font-bold">{currentUserProfile?.displayName?.charAt(0) || 'U'}</span>
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-xs font-semibold">Myself</span>
                                <span className="text-[10px] text-muted-foreground">Show my profile</span>
                            </div>
                        </button>

                        <button
                            onClick={() => handleConfirmConnect(true)}
                            className="flex items-center gap-3 w-full p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-zinc-700 group"
                        >
                            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:scale-110 transition-transform">
                                <span className="text-xs font-semibold">Anonymous</span>
                                <span className="text-[10px] text-muted-foreground">Hide my identity</span>
                            </div>
                        </button>
                    </div>
                    <button
                        onClick={() => setShowConnectModal(false)}
                        className="mt-3 text-[10px] text-muted-foreground hover:text-foreground underline"
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.profile.uid === nextProps.profile.uid &&
        prevProps.profile.distance === nextProps.profile.distance &&
        prevProps.profile.statusText === nextProps.profile.statusText &&
        prevProps.profile.isVerified === nextProps.profile.isVerified &&
        prevProps.currentUserId === nextProps.currentUserId &&
        prevProps.unit === nextProps.unit
    );
});
