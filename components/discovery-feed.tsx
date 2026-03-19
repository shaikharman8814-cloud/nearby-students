import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getUserProfile, getUsers, UserProfile, getUserConnectionsMap } from '@/lib/db';
import { UserCard } from './user-card';
import { StoriesBar } from './stories-bar';
import { Filter, Search, Globe, MessageSquare, BookOpen, Briefcase, ArrowRight, HelpCircle } from 'lucide-react';

import { UserListSkeleton } from './ui/skeleton-loaders';
import { FadeIn } from './ui/fade-in';
import { calculateDistance } from '@/lib/location-utils';
import { getSafeDisplayName } from '@/lib/utils';

export function DiscoveryFeed() {
    const { user } = useAuth();
    const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [connectionMap, setConnectionMap] = useState<Record<string, 'pending' | 'accepted' | 'rejected'>>({});
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'college' | 'city'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [unit, setUnit] = useState<'km' | 'miles'>('km');

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;

        async function loadData() {
            setLoading(true);

            // Safety timeout: Never block the screen for more than 3 seconds
            timeout = setTimeout(() => {
                setLoading(current => {
                    if (current) {
                        console.warn("[DiscoveryFeed] Data load timed out");
                        return false;
                    }
                    return current;
                });
            }, 3000);

            if (!user) {
                setLoading(false);
                clearTimeout(timeout);
                return;
            }

            // CACHE STRATEGY: Render cached data immediately
            const CACHE_KEY = `sone_discovery_cache_${user.uid}`;
            try {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setUsers(parsed);
                        setLoading(false); // INSTANT LOAD
                    }
                }
            } catch (e) { }

            try {
                // PARALLEL FETCH
                const [profile, fetchedUsers, connMap] = await Promise.all([
                    getUserProfile(user.uid),
                    getUsers(user.uid, { limit: 20 }),
                    getUserConnectionsMap(user.uid)
                ]);

                setCurrentUserProfile(profile);
                setConnectionMap(connMap);

                const normalizedUsers = fetchedUsers.map(u => {
                    const isOnline = u.lastActive ? (new Date().getTime() - new Date(u.lastActive).getTime() < 1000 * 60 * 5) : false;
                    return {
                        ...u,
                        displayName: getSafeDisplayName(u),
                        originalDisplayName: (u as any).originalDisplayName || u.displayName || "",
                        college: u.college || "",
                        city: u.city || "",
                        course: u.course || "",
                        bio: u.bio || "",
                        distance: undefined,
                        isOnline
                    };
                }).sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0));

                setUsers(normalizedUsers);
                setLoading(false);
                clearTimeout(timeout);

                // Background Expansion
                const expandData = async () => {
                    if (!profile) return;
                    try {
                        const filters = {
                            college: filter === 'college' ? profile.college : undefined,
                            city: filter === 'city' ? profile.city : undefined,
                            limit: 500
                        };
                        const allUsers = await getUsers(user.uid, filters);
                        const normalizedAll = allUsers.map(u => ({
                            ...u,
                            displayName: decodeURIComponent(u.displayName || ""),
                            originalDisplayName: decodeURIComponent((u as any).originalDisplayName || u.displayName || ""),
                            college: u.college || "",
                            city: u.city || "",
                            course: u.course || "",
                            bio: u.bio || "",
                            distance: undefined
                        }));

                        let currentLoc = profile.location;
                        if (!currentLoc && navigator.geolocation) {
                            try {
                                const pos = await new Promise<GeolocationPosition>((res, rej) => {
                                    navigator.geolocation.getCurrentPosition(res, rej, {
                                        timeout: 2000,
                                        enableHighAccuracy: false
                                    });
                                });
                                currentLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                            } catch (e) { }
                        }

                        if (currentLoc) {
                            const sortedUsers = normalizedAll.map(u => {
                                let distance = undefined;
                                if (u.location?.lat && u.location?.lng) {
                                    distance = calculateDistance(currentLoc.lat, currentLoc.lng, u.location.lat, u.location.lng, unit);
                                }
                                const isOnline = u.lastActive ? (new Date().getTime() - new Date(u.lastActive).getTime() < 1000 * 60 * 5) : false;
                                return { ...u, distance, isOnline };
                            })
                                .sort((a, b) => {
                                    // Primary: Online status
                                    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;

                                    // Secondary: Distance
                                    const dA = a.distance === undefined ? 999999 : a.distance;
                                    const dB = b.distance === undefined ? 999999 : b.distance;
                                    return dA - dB;
                                });

                            setUsers(sortedUsers);
                            try {
                                localStorage.setItem(CACHE_KEY, JSON.stringify(sortedUsers.slice(0, 40)));
                            } catch (e) { }
                        } else {
                            const sortedByOnline = normalizedAll.map(u => ({
                                ...u,
                                isOnline: u.lastActive ? (new Date().getTime() - new Date(u.lastActive).getTime() < 1000 * 60 * 5) : false
                            })).sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0));
                            setUsers(sortedByOnline);
                        }
                    } catch (err) {
                        console.warn("Expansion failed", err);
                    }
                };

                const expandTimeout = setTimeout(expandData, 500);
                return () => clearTimeout(expandTimeout);

            } catch (error) {
                console.warn("Failed load", error);
                setLoading(false);
                clearTimeout(timeout);
            }
        }

        loadData();
        return () => {
            clearTimeout(timeout);
        };
    }, [user, filter, unit]);

    // Extract unique cities for filtering (Normalized to Title Case for chips, but logic remains case-insensitive)
    const availableCities = Array.from(new Set(users.map(u => (u.city || "").trim().toLowerCase()).filter(Boolean)))
        .map(city => city.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '))
        .sort();

    const filteredUsers = users.filter(u => {
        // Universal Search Logic: Name, Username, Skills, Course, College, City
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();

        const nameMatch = (u.displayName || "").toLowerCase().includes(q);
        const originalNameMatch = ((u as any).originalDisplayName || "").toLowerCase().includes(q);
        const usernameMatch = (u.name || "").toLowerCase().includes(q);
        const collegeMatch = (u.college || "").toLowerCase().includes(q);
        const courseMatch = (u.course || "").toLowerCase().includes(q);
        const cityMatch = (u.city || "").toLowerCase().includes(q);
        const bioMatch = (u.bio || "").toLowerCase().includes(q);
        const skillsMatch = (u.interests || []).some(interest => interest.toLowerCase().includes(q));

        return nameMatch || originalNameMatch || usernameMatch || collegeMatch || courseMatch || cityMatch || bioMatch || skillsMatch;
    });

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto p-4 lg:p-8">
                <div className="h-20 bg-muted/20 rounded-2xl mb-8 animate-pulse" /> {/* Stories Placeholder */}
                <UserListSkeleton />
            </div>
        );
    }

    // NO BLOCKING ON PROFILE: Render even if profile fetch failed or timed out
    // currentUserProfile can be null, we just show a limited UI or prompts

    return (
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
            <div className="flex flex-col gap-6 mb-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Discover Students</h1>
                        <p className="text-muted-foreground">
                            {filter === 'all'
                                ? 'Students across all cities and colleges'
                                : filter === 'college'
                                    ? `Students at ${currentUserProfile?.college && currentUserProfile.college !== 'undefined' ? currentUserProfile.college : 'your campus'}`
                                    : `Students in ${currentUserProfile?.city || 'your city'}`}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search by name, course..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-secondary/50 border-transparent focus:bg-background border focus:border-primary rounded-lg text-sm transition-all"
                            />
                        </div>

                        {/* Unit Toggle */}
                        <div className="flex items-center bg-secondary/50 p-1 rounded-lg shrink-0">
                            <button
                                onClick={() => setUnit('km')}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${unit === 'km' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                KM
                            </button>
                            <button
                                onClick={() => setUnit('miles')}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${unit === 'miles' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                MI
                            </button>
                        </div>

                        <div className="flex items-center bg-secondary/50 p-1 rounded-lg shrink-0">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'all' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilter('college')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'college' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Same Campus
                            </button>
                            <button
                                onClick={() => setFilter('city')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'city' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Same City
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stories Section */}
            <FadeIn show={true}>
                <StoriesBar currentUserProfile={currentUserProfile} />
            </FadeIn>

            {/* Explore Section */}
            <div className="sticky top-[60px] z-30 flex overflow-x-auto lg:grid lg:grid-cols-4 gap-4 mb-6 py-4 bg-background/95 backdrop-blur-sm border-b border-border/50 transition-all duration-300 scrollbar-hide">
                <Link href="/qa" className="group shrink-0 w-[240px] sm:w-[280px] lg:w-auto">
                    <div className="h-full p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 hover:border-orange-500/30 transition-all">
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <MessageSquare className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm">Anonymous Q&A</h3>
                            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">Ask anything privately.</p>
                    </div>
                </Link>

                <Link href="/resources" className="group shrink-0 w-[240px] sm:w-[280px] lg:w-auto">
                    <div className="h-full p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 hover:border-blue-500/30 transition-all">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <BookOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm">Resources</h3>
                            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">Notes and study guides.</p>
                    </div>
                </Link>

                <Link href="/projects" className="group shrink-0 w-[240px] sm:w-[280px] lg:w-auto">
                    <div className="h-full p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 hover:border-purple-500/30 transition-all">
                        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Briefcase className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm">Projects</h3>
                            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">Find projects. Join teams. Build together.</p>
                    </div>
                </Link>

                <Link href="/support" className="group shrink-0 w-[240px] sm:w-[280px] lg:w-auto">
                    <div className="h-full p-4 rounded-2xl bg-green-500/5 border border-green-500/10 hover:border-green-500/30 transition-all">
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <HelpCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm">Support</h3>
                            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">Help and feedback.</p>
                    </div>
                </Link>
            </div>

            {/* Students List */}
            {filteredUsers.length === 0 ? (
                <div className="text-center py-12 bg-card border border-border rounded-xl">
                    <p className="text-muted-foreground">
                        {searchQuery ? `No students found matching "${searchQuery}"` : "No students found in this category yet."}
                    </p>
                </div>
            ) : (
                <FadeIn show={!loading}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-all duration-300 list-optimize">
                        {filteredUsers.map(u => (
                            <UserCard
                                key={u.uid}
                                profile={u}
                                currentUserId={user?.uid}
                                unit={unit}
                                initialStatus={connectionMap[u.uid]}
                                currentUserProfile={currentUserProfile}
                            />
                        ))}
                    </div>
                </FadeIn>
            )}
        </div>
    );
}
