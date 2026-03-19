'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Post, getPosts, getUserProfile, UserProfile } from '@/lib/db';
import { CreatePost } from '@/components/feed/create-post';
import { PostItem } from '@/components/feed/post-item';
import { Loader2, GraduationCap, MapPin, Globe } from 'lucide-react';
import { FeedSkeleton } from '@/components/ui/skeleton-loaders';
import { useNetworkStatus } from '@/lib/hooks/use-network-status';
import { FadeIn } from '@/components/ui/fade-in';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header'; // Assuming this exists or we use a layout

export default function FeedPage() {
    const { user } = useAuth();
    const { isSlow } = useNetworkStatus();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [scope, setScope] = useState<'college' | 'city' | 'global'>('college');
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    // New Feed V2 State
    const [view, setView] = useState<'feed' | 'saved'>('feed');
    const [sortBy, setSortBy] = useState<'foryou' | 'latest'>('foryou');
    const [category, setCategory] = useState<string>('All');

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        async function loadProfile() {
            if (user) {
                timeout = setTimeout(() => {
                    setLoading(current => {
                        if (current) {
                            console.warn("[Feed] Profile check timed out");
                            return false;
                        }
                        return current;
                    });
                }, 3000);

                try {
                    const profile = await getUserProfile(user.uid);
                    setUserProfile(profile);
                    if (!profile) setLoading(false);
                } catch (e) {
                    console.warn("Failed to load profile", e);
                    setLoading(false);
                } finally {
                    clearTimeout(timeout);
                }
            } else {
                setLoading(false);
            }
        }
        loadProfile();
        return () => clearTimeout(timeout);
    }, [user]);

    const loadPosts = async () => {
        if (!user || (!userProfile && !loading)) {
            setLoading(false);
            return;
        }

        const timeout = setTimeout(() => {
            setLoading(current => {
                if (current) {
                    console.warn("[Feed] Posts load timed out");
                    return false;
                }
                return current;
            });
        }, 3000);

        setLoading(true);
        try {
            let fetchedPosts: Post[] = [];

            if (view === 'saved') {
                const { getSavedPosts } = await import('@/lib/db');
                fetchedPosts = await getSavedPosts(user.uid);
            } else {
                fetchedPosts = await getPosts(userProfile || { uid: user.uid } as any, scope, category, sortBy);
            }

            setPosts(fetchedPosts);
        } catch (error) {
            console.warn("Failed to load posts", error);
        } finally {
            clearTimeout(timeout);
            setLoading(false);
        }
    };

    // Reload posts when dependencies change
    useEffect(() => {
        if (userProfile || (!loading && user)) {
            loadPosts();
        }
    }, [userProfile, scope, view, sortBy, category, user]);

    if (!user) return <div className="p-8 text-center"><Loader2 className="animate-spin inline mr-2" /> Loading...</div>;

    const tabs = [
        { id: 'college', label: 'My College', icon: GraduationCap },
        { id: 'city', label: 'My City', icon: MapPin },
        { id: 'global', label: 'Global', icon: Globe },
    ] as const;

    const categories = ['All', 'Notes', 'PYQ', 'Doubts', 'Coding', 'Placement', 'Projects', 'General', 'UI'];

    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center pl-4">
                    <h1 className="font-bold text-lg">Student Buzz 🐝</h1>
                </div>
            </header>

            <main className="container max-w-2xl mx-auto p-4 smooth-scroll">

                {/* Scope Tabs - Only show when in Feed view */}
                {view === 'feed' && (
                    <div className="flex p-1 bg-secondary/50 rounded-xl mb-4">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setScope(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${scope === tab.id
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Filters & Sort Bar */}
                <div className="mb-6 space-y-3">
                    {/* Primary Filters (Chips) */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                        <button
                            onClick={() => { setView('feed'); setSortBy('foryou'); }}
                            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${view === 'feed' && sortBy === 'foryou'
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-muted-foreground border-border hover:bg-secondary'
                                }`}
                        >
                            sparkles For You
                        </button>
                        <button
                            onClick={() => { setView('feed'); setSortBy('latest'); }}
                            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${view === 'feed' && sortBy === 'latest'
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-muted-foreground border-border hover:bg-secondary'
                                }`}
                        >
                            Latest
                        </button>
                        <button
                            onClick={() => setView('saved')}
                            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${view === 'saved'
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-muted-foreground border-border hover:bg-secondary'
                                }`}
                        >
                            Saved
                        </button>

                        <div className="w-[1px] bg-border mx-1 h-6 self-center"></div>

                        {/* Category Chips */}
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => { setView('feed'); setCategory(cat); }}
                                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${view === 'feed' && category === cat
                                    ? 'bg-secondary text-foreground border-foreground/20'
                                    : 'bg-background text-muted-foreground border-border hover:bg-secondary'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Create Post (Only in Feed view) */}
                {view === 'feed' && (
                    <CreatePost
                        currentScope={scope}
                        onPostCreated={loadPosts}
                    />
                )}

                {/* Posts List */}
                {loading ? (
                    <FeedSkeleton />
                ) : posts.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-border rounded-xl">
                        {view === 'saved' ? (
                            <>
                                <p className="text-muted-foreground mb-2">No saved posts yet.</p>
                                <p className="text-sm">Bookmark interesting posts to see them here!</p>
                            </>
                        ) : (
                            <>
                                <p className="text-muted-foreground mb-2">No posts found.</p>
                                <p className="text-sm">Try changing filters or say something!</p>
                            </>
                        )}
                    </div>
                ) : (
                    <FadeIn show={!loading}>
                        <div className="space-y-4 list-optimize">
                            {view === 'saved' && <h2 className="font-semibold text-lg mb-4 px-1">Your Saved Posts</h2>}
                            {posts.map(post => (
                                <PostItem key={post.id} post={post} currentUserId={user.uid} />
                            ))}
                        </div>
                    </FadeIn>
                )}
            </main>
        </div>
    );
}
