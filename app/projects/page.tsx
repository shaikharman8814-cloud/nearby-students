'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getProjects, Project, ProjectRole, getUserApplications, Application } from '@/lib/projects-db';
import { ProjectCard } from '@/components/projects/project-card';
import { Loader2, Plus, RefreshCw, MessageSquare, Sparkles, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getUserProfile, UserProfile } from '@/lib/db';

import { ApplyModal } from '@/components/projects/apply-modal';

export default function ProjectsPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'for-you' | 'all' | 'my-projects'>('for-you');
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [myApplications, setMyApplications] = useState<Application[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [selectedRole, setSelectedRole] = useState<{ project: Project, role: ProjectRole } | null>(null);

    // Fetch Profile first (for recommendations)
    useEffect(() => {
        if (user) {
            getUserProfile(user.uid).then(setUserProfile);
        }
    }, [user]);

    // Fetch Projects
    useEffect(() => {
        if (!user) return;

        const CACHE_KEY = `sone_projects_cache_${user.uid}_${activeTab}`;

        // CACHE: Try to load immediately
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                setProjects(JSON.parse(cached));
                setLoading(false); // Instant
            }
            // Else keep loading=true (default) until fetch
        } catch (e) { }

        const load = async () => {
            // Only set loading true if we didn't hit cache? 
            // No, we want to show loading indicator if cache missing.
            // If cache hit, we effectively skip the visible spinner.
            // But we might want small indicator of "refreshing"? User asked for "Instant", so silent refresh is better.

            // If cache was not hit, set loading.
            // Can't easily know if cache hit in strict sense inside async without ref. 
            // But state update is async.
            // Simpler: If no projects in state, set loading=true. 

            // setProjects([]); // Don't clear! Keep old tab data visible or cache?
            // Actually, if switching tabs, we probably want to clear or show cache for NEW tab.
            // If we don't clear, we show wrong tab data.
            // Strategy: Cache read happens synchronously above? No, useEffect is after render.
            // Standard React Pattern for "Instant Tab Switch" needs synchronous read or LayoutEffect.
            // `useEffect` runs AFTER paint. So user sees spinner for 1 frame?
            // "Instant" implies we need layoutEffect or state initialization.
            // State init only runs once on mount. 
            // Effect runs on tab change.
            // For now, `useEffect` is ~fast enough (<50ms).
            // But `setLoading(true)` might flash.
            // Better: Don't set loading true if we found cache.

            // Re-read cache to decide on Loading spinner
            let hasCached = false;
            try {
                if (localStorage.getItem(CACHE_KEY)) hasCached = true;
            } catch (e) { }

            if (!hasCached) setLoading(true);

            try {
                // If 'for-you' and no profile yet, wait? Or fetch 'all' and sort later?
                // Logic inside getProjects handles filtering
                const data = await getProjects(user.uid, {
                    filter: activeTab,
                    userProfile: userProfile || undefined
                });
                setProjects(data);

                // Update Cache
                try {
                    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
                } catch (e) { }

                // Fetch User Applications
                const apps = await getUserApplications(user.uid);
                setMyApplications(apps);
            } catch (e) {
                console.warn("Failed to load projects", e);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [user, activeTab, userProfile]);

    const handleApply = (project: Project, role: ProjectRole) => {
        setSelectedRole({ project, role });
    };

    return (
        <div className="max-w-3xl mx-auto p-4 lg:p-8 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">Projects</h1>
                    <p className="text-sm text-muted-foreground">Collaborate, Build, and Launch.</p>
                </div>
                <button
                    onClick={() => router.push('/projects/create')}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    <span className="hidden sm:inline">Create Project</span>
                </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-xl mb-6 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('for-you')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === 'for-you' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:bg-background/50'
                        }`}
                >
                    For You
                </button>
                <button
                    onClick={() => setActiveTab('all')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === 'all' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:bg-background/50'
                        }`}
                >
                    All Projects
                </button>
                <button
                    onClick={() => setActiveTab('my-projects')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === 'my-projects' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:bg-background/50'
                        }`}
                >
                    My Projects
                </button>
            </div>

            {/* Search Input */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search projects by title, skill, or role..."
                    className="w-full p-3 rounded-xl bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-8">
                    {/* New & Trending Section (Horizontal Scroll) */}
                    {(() => {
                        const now = Date.now();
                        const MS_48H = 48 * 60 * 60 * 1000;

                        // Client-side Search Filter
                        const searchFiltered = projects.filter(p => {
                            if (!searchQuery) return true;
                            const q = searchQuery.toLowerCase();
                            return (
                                p.title.toLowerCase().includes(q) ||
                                p.description.toLowerCase().includes(q) ||
                                p.skills.some(s => s.toLowerCase().includes(q)) ||
                                p.roles.some(r => r.title.toLowerCase().includes(q))
                            );
                        });

                        const newProjects = searchFiltered.filter(p => (now - new Date(p.createdAt).getTime()) < MS_48H)
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                        if (newProjects.length === 0 && searchFiltered.length > 0) return null; // Only hide if there are other projects but no new ones

                        if (newProjects.length === 0 && searchFiltered.length === 0 && searchQuery) return null; // Hide if search yields no results at all

                        if (newProjects.length === 0 && !searchQuery && projects.length > 0) return null; // Hide if no new projects and no search

                        if (newProjects.length === 0) return null; // If no new projects, don't render this section

                        return (
                            <div className="mb-2">
                                <div className="flex items-center gap-2 mb-4 px-1">
                                    <Sparkles className="w-4 h-4 text-orange-500 fill-orange-500" />
                                    <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">New & Recommended</h2>
                                </div>
                                <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 -mx-4 px-4 scrollbar-hide">
                                    {newProjects.map(project => {
                                        const myApp = myApplications.find(a => a.projectId === project.id);
                                        return (
                                            <div key={project.id} className="min-w-[85vw] sm:min-w-[350px] snap-center">
                                                <ProjectCard
                                                    project={project}
                                                    onApply={handleApply}
                                                    applicationStatus={myApp?.status }
                                                    myRoleTitle={myApp?.roleTitle}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                    {/* All / Other Projects Grid */}
                    {(() => {
                        const now = Date.now();
                        const MS_48H = 48 * 60 * 60 * 1000;

                        // Client-side Search Filter (Repeated for safe isolation, or could hoist above)
                        const searchFiltered = projects.filter(p => {
                            if (!searchQuery) return true;
                            const q = searchQuery.toLowerCase();
                            return (
                                p.title.toLowerCase().includes(q) ||
                                p.description.toLowerCase().includes(q) ||
                                p.skills.some(s => s.toLowerCase().includes(q)) ||
                                p.roles.some(r => r.title.toLowerCase().includes(q))
                            );
                        });

                        const otherProjects = searchFiltered.filter(p => !((now - new Date(p.createdAt).getTime()) < MS_48H));

                        if (otherProjects.length === 0 && searchFiltered.length > 0 && searchQuery) return null; // Hide if search yields no other projects
                        if (otherProjects.length === 0 && searchFiltered.length === 0 && searchQuery) return null; // Hide if search yields no results at all
                        if (otherProjects.length === 0 && !searchQuery && projects.length > 0) return null; // Hide if no other projects and no search
                        if (otherProjects.length === 0) return null; // If no other projects, don't render this section

                        return (
                            <div>
                                <div className="flex items-center gap-2 mb-4 px-1">
                                    <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Browse All</h2>
                                </div>
                                <div className="grid gap-4">
                                    {otherProjects.map(project => {
                                        const myApp = myApplications.find(a => a.projectId === project.id);
                                        return (
                                            <ProjectCard
                                                key={project.id}
                                                project={project}
                                                onApply={handleApply}
                                                applicationStatus={myApp?.status}
                                                myRoleTitle={myApp?.roleTitle}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Empty State (when search returns nothing) */}
            {!loading && projects.length > 0 && searchQuery &&
                projects.filter(p => (
                    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    p.roles.some(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()))
                )).length === 0 && (
                    <div className="text-center py-20 flex flex-col items-center">
                        <RefreshCw className="w-12 h-12 text-muted-foreground/30 mb-4" />
                        <h3 className="font-semibold text-lg text-muted-foreground">No matching projects</h3>
                        <p className="text-sm text-muted-foreground/80 max-w-xs mt-1">
                            Try searching for a different role or skill.
                        </p>
                    </div>
                )}

            {/* Original Empty State (when no projects at all or no search query) */}
            {!loading && projects.length === 0 && !searchQuery && (
                <div className="text-center py-20 flex flex-col items-center">
                    <RefreshCw className="w-12 h-12 text-muted-foreground/30 mb-4" />
                    <h3 className="font-semibold text-lg text-muted-foreground">No projects found</h3>
                    <p className="text-sm text-muted-foreground/80 max-w-xs mt-1">
                        {activeTab === 'for-you' ? 'Adjust your skills in profile to see better recommendations.' : 'Be the first to create one!'}
                    </p>
                </div>
            )}

            {selectedRole && userProfile && (
                <ApplyModal
                    project={selectedRole.project}
                    role={selectedRole.role}
                    userProfile={userProfile}
                    onClose={() => setSelectedRole(null)}
                />
            )}
        </div>
    );
}
