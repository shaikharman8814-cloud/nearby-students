'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getUserProfile, UserProfile, getUsers, getUserLevel } from '@/lib/db';
import { useParams, useRouter } from 'next/navigation';
import { HighlightBar } from '@/components/highlight-bar';
import { Loader2, MapPin, GraduationCap, Edit, User, FileText, Link as LinkIcon, Check } from 'lucide-react';
import { UserCard } from '@/components/user-card';

export default function ProfilePage() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();

    // -- HOOKS MUST BE TOP LEVEL --
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Tab State
    const [activeTab, setActiveTab] = useState<'about' | 'posts' | 'resources'>('about');
    const [posts, setPosts] = useState<any[]>([]);
    const [resources, setResources] = useState<any[]>([]);
    const [loadingContent, setLoadingContent] = useState(false);

    // Similar Users State
    const [similarUsers, setSimilarUsers] = useState<UserProfile[]>([]);

    const uid = typeof params.id === 'string' ? params.id : params.id?.[0];

    // 1. Fetch Profile
    useEffect(() => {
        if (uid) {
            setLoading(true);

            // Safety timeout: Never block the screen for more than 3 seconds
            const timeout = setTimeout(() => {
                setLoading(current => {
                    if (current) {
                        console.warn(`[Profile] Profile load timed out for ${uid}`);
                        return false;
                    }
                    return current;
                });
            }, 3000);

            getUserProfile(uid)
                .then(p => {
                    clearTimeout(timeout);
                    setProfile(p);
                })
                .catch(e => {
                    clearTimeout(timeout);
                    console.error("Profile load failed", e);
                })
                .finally(() => setLoading(false));

            return () => clearTimeout(timeout);
        }
    }, [uid]);

    // 2. Fetch Tab Content
    useEffect(() => {
        if (!uid || activeTab === 'about') return;

        const loadContent = async () => {
            setLoadingContent(true);
            try {
                const { getUserPosts, getUserResources } = await import('@/lib/db');
                if (activeTab === 'posts') {
                    const data = await getUserPosts(uid);
                    setPosts(data);
                } else if (activeTab === 'resources') {
                    const data = await getUserResources(uid);
                    setResources(data);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingContent(false);
            }
        };
        loadContent();
    }, [uid, activeTab]);

    // 3. Fetch Similar Users (Same College)
    useEffect(() => {
        if (!profile || !user) return; // Wait for profile & auth

        const loadSimilar = async () => {
            try {
                // Fetch users from same college
                // Note: getUsers filters out the current user (first arg)
                const users = await getUsers(user.uid, { college: profile.college });
                // Filter out the profile user itself if it's not me (should already be covered but safe to check)
                const filtered = users.filter(u => u.uid !== uid).slice(0, 4);
                setSimilarUsers(filtered);
            } catch (e) {
                console.error("Failed to load similar users", e);
            }
        };
        loadSimilar();
    }, [profile, user, uid]);


    // -- RENDERING --
    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

    // If loading is done and no profile exists, show a graceful not found state.
    if (!profile) {
        return (
            <div className="max-w-3xl mx-auto p-8 text-center space-y-4">
                <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto text-3xl">👤</div>
                <h1 className="text-xl font-bold">User Not Found</h1>
                <p className="text-muted-foreground">This profile might be private or the member might have moved on.</p>
                <button onClick={() => router.push('/')} className="px-6 py-2 bg-primary text-primary-foreground rounded-full">Explore Others</button>
            </div>
        );
    }

    const isOwnProfile = user?.uid === uid;

    return (
        <div className="max-w-3xl mx-auto p-4 lg:p-8">
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm mb-6">
                {/* Header / Cover */}
                <div className="h-32 bg-secondary/50"></div>

                <div className="px-8 pb-8">
                    <div className="relative flex justify-between items-end -mt-12 mb-6">
                        <div className="w-24 h-24 rounded-full bg-background p-1">
                            <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                {profile.photoURL ? (
                                    <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl font-bold text-primary">{profile.displayName?.charAt(0)}</span>
                                )}
                            </div>
                        </div>
                        {isOwnProfile && (
                            <button
                                onClick={() => router.push('/profile/edit')}
                                className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-background hover:bg-muted text-sm font-medium"
                            >
                                <Edit className="w-4 h-4" /> Edit Profile
                            </button>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-bold">{profile.displayName}</h1>
                            <span className="text-xs font-semibold text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full border border-border/50">
                                {getUserLevel(profile.xp || 0)}
                            </span>
                            {profile.isVerified && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full" title="Verified Student">
                                    <Check className="w-3 h-3" /> Verified Student
                                </span>
                            )}
                        </div>
                        <p className="text-muted-foreground mb-4">{profile.bio || "No bio yet."}</p>

                        {/* Bio Links */}
                        {profile.bioLinks && profile.bioLinks.length > 0 && (
                            <div className="flex flex-wrap gap-3 mb-4">
                                {profile.bioLinks.map((link, i) => (
                                    <a
                                        key={i}
                                        href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-sm text-blue-500 hover:underline"
                                    >
                                        <LinkIcon className="w-3 h-3" />
                                        {link.title}
                                    </a>
                                ))}
                            </div>
                        )}

                        {/* Highlights */}
                        <div className="mb-6">
                            <HighlightBar userId={profile.uid} isOwnProfile={isOwnProfile} />
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
                            <div className="flex items-center gap-2">
                                <GraduationCap className="w-4 h-4" />
                                <span>{profile.course} • {profile.year}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                <span>{profile.college}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{profile.city}</span>
                            </div>
                        </div>

                        {profile.interests && profile.interests.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {profile.interests.map((tag, i) => (
                                    <span key={i} className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {!isOwnProfile && user && (
                            <div className="mt-8 border-t border-border pt-6 max-w-sm">
                                <UserCard profile={profile} currentUserId={user.uid} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex border-t border-border mt-8">
                    <button
                        onClick={() => setActiveTab('about')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'about' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:bg-secondary/50'}`}
                    >
                        About
                    </button>
                    <button
                        onClick={() => setActiveTab('posts')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'posts' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:bg-secondary/50'}`}
                    >
                        Posts
                    </button>
                    <button
                        onClick={() => setActiveTab('resources')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'resources' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:bg-secondary/50'}`}
                    >
                        Resources
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'about' && (
                <div className="space-y-6">
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h2 className="font-bold text-lg mb-4">Details</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground">About</h3>
                                <p className="mt-1">{profile.bio || "No bio available."}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground">College</h3>
                                    <p>{profile.college}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground">Course</h3>
                                    <p>{profile.course} • {profile.year}</p>
                                </div>
                            </div>
                            {profile.interests && (
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Interests</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.interests.map((tag, i) => (
                                            <span key={i} className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Same College Users Section */}
                    {similarUsers.length > 0 && (
                        <div className="mt-8">
                            <h3 className="font-bold text-lg mb-4 pl-1">Others from {profile.college}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {similarUsers.map(u => (
                                    <div key={u.uid} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-primary flex-shrink-0">
                                                {u.photoURL ? <img src={u.photoURL} className="w-full h-full rounded-full object-cover" /> : u.displayName?.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium truncate">{u.displayName}</p>
                                                <p className="text-xs text-muted-foreground truncate">{u.course}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => router.push(`/profile/${u.uid}`)}
                                            className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-xs rounded-full transition-colors"
                                        >
                                            View
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'posts' && (
                <div className="bg-card border border-border rounded-xl p-6 min-h-[200px]">
                    <h2 className="font-bold text-lg mb-4">Posts</h2>
                    {loadingContent ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : posts.length > 0 ? (
                        <div className="grid gap-4">
                            {posts.map(post => (
                                <div key={post.id} className="p-4 border border-border rounded-lg hover:bg-secondary/20 transition-colors">
                                    <p className="line-clamp-2 mb-2">{post.content}</p>
                                    {post.imageUrl && <div className="h-40 bg-secondary rounded-md mb-2 overflow-hidden"><img src={post.imageUrl} className="w-full h-full object-cover" /></div>}
                                    <span className="text-xs text-muted-foreground">{new Date(post.createdAt).toLocaleDateString()}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            No posts yet.
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'resources' && (
                <div className="bg-card border border-border rounded-xl p-6 min-h-[200px]">
                    <h2 className="font-bold text-lg mb-4">Resources</h2>
                    {loadingContent ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : resources.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2">
                            {resources.map(res => (
                                <div key={res.id} className="p-4 border border-border rounded-lg hover:bg-secondary/20 transition-colors flex items-start gap-3">
                                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium line-clamp-1">{res.title}</h4>
                                        <p className="text-xs text-muted-foreground line-clamp-1">{res.description}</p>
                                        <span className="text-[10px] text-muted-foreground mt-1 block">{res.subject} • {res.downloadCount || 0} downloads</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            No resources shared.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
