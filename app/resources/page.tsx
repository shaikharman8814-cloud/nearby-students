'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Resource, getResources, createResource, getUserProfile, UserProfile } from '@/lib/db';
import { uploadResourceFile } from '@/lib/storage';
import { ResourceCard } from '@/components/resources/resource-card';
import { Loader2, Search, Upload, Plus, X, Filter, Ghost, VenetianMask } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ResourcesPage() {
    const { user } = useAuth();
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    // Filters
    const [filterType, setFilterType] = useState<string>('all');
    const [filterYear, setFilterYear] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    // Upload Modal State
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [newResource, setNewResource] = useState({
        title: '',
        description: '',
        type: 'note',
        course: '',
        year: '1st',
        file: null as File | null,
        isAnonymous: false
    });

    useEffect(() => {
        async function loadProfile() {
            if (user) {
                const PROFILE_CACHE_KEY = `sone_user_profile_cache_${user.uid}`;

                // CACHE: Try to load profile immediately
                try {
                    const cachedProfile = localStorage.getItem(PROFILE_CACHE_KEY);
                    if (cachedProfile) {
                        const parsed = JSON.parse(cachedProfile);
                        setUserProfile(parsed);
                        // Don't set filterYear here because it might trigger loadResources before we want?
                        // Actually, logic below sets filterYear='all' if profile found.
                        if (!filterYear) setFilterYear('all');
                    }
                } catch (e) { }

                try {
                    const profile = await getUserProfile(user.uid);
                    setUserProfile(profile);

                    // Update Cache
                    if (profile) {
                        try {
                            localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
                        } catch (e) { }
                    }

                    if (profile) {
                        // Only set if not already set (to avoid re-triggering effect if cached was same)
                        // But strictly, setting state to same value is cheap in React.
                        if (!filterYear) setFilterYear('all');
                    } else {
                        setLoading(false);
                    }
                } catch (e) {
                    console.warn("Error loading profile", e);
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        }
        loadProfile();
    }, [user]);

    const loadResources = async () => {
        if (!user || !userProfile) {
            // setLoading(false); // Don't turn off loading if waiting for profile?
            // Actually if no user, we are done.
            if (!user) setLoading(false);
            return;
        }

        const CACHE_KEY = `sone_resources_cache_${user.uid}_${filterType}_${filterYear}`;

        // CACHE: Try to load resources immediately
        let hasCached = false;
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                setResources(JSON.parse(cached));
                setLoading(false); // Instant
                hasCached = true;
            }
        } catch (e) { }

        if (!hasCached) setLoading(true);

        try {
            // Fetch resources filtered by user's College (mandatory scope)
            const fetched = await getResources({
                college: userProfile.college,
                type: filterType === 'all' ? undefined : filterType,
                year: filterYear === 'all' ? undefined : filterYear
            });
            setResources(fetched);

            // Update Cache
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify(fetched));
            } catch (e) { }

        } catch (error) {
            console.warn("Failed to load resources", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userProfile) {
            loadResources();
        }
    }, [userProfile, filterType, filterYear]);

    // Client-side search filtering
    const filteredResources = resources.filter(r =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.course.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !userProfile || !newResource.file) return;

        // Ensure college is set
        if (!userProfile.college) {
            alert("Please update your profile with your College (in Profile > Edit) before uploading resources.");
            return;
        }

        setUploadLoading(true);
        console.log("🚀 Starting Upload Process...");
        try {
            // 1. Upload File
            console.log("➡️ Step 1: Uploading File...");
            const url = await uploadResourceFile(userProfile.college, newResource.course, newResource.file);
            console.log("✅ Step 1 Complete. URL:", url ? url.substring(0, 50) + "..." : "null");

            // 2. Create DB Entry
            console.log("➡️ Step 2: Creating DB Entry...");
            await createResource({
                title: newResource.title,
                description: newResource.description,
                // @ts-ignore
                type: newResource.type,
                fileUrl: url,
                fileName: newResource.file.name,
                uploaderId: user.uid,
                uploaderName: user.displayName || 'Student',
                college: userProfile.college,
                course: newResource.course,
                year: newResource.year,
                isAnonymous: newResource.isAnonymous
            });
            console.log("✅ Step 2 Complete.");

            // 3. Reset & Reload
            setIsUploadOpen(false);
            setNewResource({
                title: '', description: '', type: 'note',
                course: '', year: '1st', file: null, isAnonymous: false
            });
            loadResources();

        } catch (error) {
            console.warn("❌ Upload Workflow Failed:", error);
            alert("Failed to upload resource. Please try again.");
        } finally {
            console.log("🏁 Upload Workflow Finished. Stopping Loading.");
            setUploadLoading(false);
        }
    };

    if (!user) return <div className="p-8 text-center"><Loader2 className="animate-spin inline mr-2" /> Loading...</div>;

    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur px-4 h-14 flex items-center justify-between">
                <h1 className="font-bold text-lg">Resource Hub 📚</h1>
                <button
                    onClick={() => setIsUploadOpen(true)}
                    className="bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
                >
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                </button>
            </header>

            <main className="container max-w-2xl mx-auto p-4">

                {/* Search & Filters */}
                <div className="mb-6 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by title or subject..."
                            className="w-full bg-secondary/50 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        {/* Type Filter */}
                        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                            {['all', 'note', 'paper', 'syllabus'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize whitespace-nowrap transition-colors ${filterType === type
                                        ? 'bg-foreground text-background'
                                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                                        }`}
                                >
                                    {type === 'all' ? 'All Types' : type === 'syllabus' ? 'Syllabus' : type + 's'}
                                </button>
                            ))}
                        </div>

                        {/* Year Filter */}
                        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar border-t border-border/40 pt-2">
                            {['all', '1st', '2nd', '3rd', '4th'].map(year => (
                                <button
                                    key={year}
                                    onClick={() => setFilterYear(year)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize whitespace-nowrap transition-colors ${filterYear === year
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                                        }`}
                                >
                                    {year === 'all' ? 'All Years' : year + ' Year'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Resource List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                    </div>
                ) : filteredResources.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-border rounded-xl">
                        <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileTextIcon className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold mb-1">No resources found</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {searchQuery ? "Try verifying your search terms" : "Be the first to share notes!"}
                        </p>
                        <button
                            onClick={() => setIsUploadOpen(true)}
                            className="text-primary text-sm font-medium hover:underline"
                        >
                            Upload a Resource
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredResources.map(res => (
                            <ResourceCard key={res.id} resource={res} currentUserId={user.uid} />
                        ))}
                    </div>
                )}
            </main>

            {/* Upload Modal Overlay */}
            {isUploadOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-background rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setIsUploadOpen(false)}
                            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-xl font-bold mb-4">Upload Resource</h2>

                        <form onSubmit={handleUpload} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Title</label>
                                <input
                                    required
                                    value={newResource.title}
                                    onChange={e => setNewResource({ ...newResource, title: e.target.value })}
                                    placeholder="e.g. Data Structures Unit 1 Notes"
                                    className="w-full bg-secondary/50 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Subject / Course</label>
                                    <input
                                        required
                                        value={newResource.course}
                                        onChange={e => setNewResource({ ...newResource, course: e.target.value })}
                                        placeholder="e.g. CS101"
                                        className="w-full bg-secondary/50 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Type</label>
                                    <select
                                        value={newResource.type}
                                        onChange={e => setNewResource({ ...newResource, type: e.target.value })}
                                        className="w-full bg-secondary/50 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    >
                                        <option value="note">Note</option>
                                        <option value="paper">Exam Paper</option>
                                        <option value="syllabus">Syllabus</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">File (PDF/Image)</label>
                                <div className="bg-secondary/50 rounded-lg p-4 text-center border-2 border-dashed border-input hover:border-primary/50 transition-colors">
                                    <input
                                        type="file"
                                        required
                                        accept=".pdf,.png,.jpg,.jpeg"
                                        onChange={e => setNewResource({ ...newResource, file: e.target.files ? e.target.files[0] : null })}
                                        className="hidden"
                                        id="file-upload"
                                    />
                                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                                        {newResource.file ? (
                                            <>
                                                <FileTextIcon className="w-8 h-8 text-primary" />
                                                <span className="text-sm font-medium">{newResource.file.name}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">Click to select file</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>

                            {/* Anonymous Toggle */}
                            <div className="flex items-center gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setNewResource({ ...newResource, isAnonymous: !newResource.isAnonymous })}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${newResource.isAnonymous
                                        ? 'bg-zinc-800 text-white'
                                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                                        }`}
                                >
                                    {newResource.isAnonymous ? (
                                        <>
                                            <VenetianMask className="w-4 h-4" />
                                            <span>Post Anonymously</span>
                                        </>
                                    ) : (
                                        <>
                                            <Ghost className="w-4 h-4" />
                                            <span>Post as Me</span>
                                        </>
                                    )}
                                </button>
                                <p className="text-[10px] text-muted-foreground">
                                    {newResource.isAnonymous ? "Your name will be hidden from the resource card." : "Your name will be visible to everyone."}
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={uploadLoading}
                                className="w-full bg-primary text-primary-foreground font-semibold rounded-lg py-3 mt-4 disabled:opacity-50"
                            >
                                {uploadLoading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</span> : 'Upload Resource'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function FileTextIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            <path d="M10 9H8" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
        </svg>
    )
}
