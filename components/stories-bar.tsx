'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getStories, UserProfile, Story } from '@/lib/db';
import { Plus } from 'lucide-react';
import { AddStoryModal } from './add-story-modal';
import { StoryViewer } from './story-viewer';

interface StoriesBarProps {
    currentUserProfile: UserProfile | null;
}

const StoryNode = ({
    profile,
    isMyStory,
    hasUnseen,
    onClick,
    onAdd
}: {
    profile: { photoURL?: string, displayName?: string, uid: string },
    isMyStory?: boolean,
    hasUnseen?: boolean,
    onClick: () => void,
    onAdd?: () => void
}) => {
    const [imgError, setImgError] = useState(false);

    return (
        <div className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0" onClick={onClick}>
            <div className="relative">
                <div className={`w-16 h-16 rounded-full p-[2px] ${hasUnseen ? 'bg-gradient-to-tr from-yellow-400 to-purple-600' : 'bg-secondary'}`}>
                    <div className="w-full h-full rounded-full bg-background p-0.5 overflow-hidden flex items-center justify-center relative">
                        {profile.photoURL && !imgError ? (
                            <img
                                src={profile.photoURL}
                                className="w-full h-full object-cover rounded-full"
                                onError={() => setImgError(true)}
                                alt={profile.displayName}
                            />
                        ) : (
                            <div className="w-full h-full bg-secondary flex items-center justify-center font-bold text-muted-foreground">
                                {(profile.displayName || 'U').charAt(0)}
                            </div>
                        )}
                    </div>
                </div>
                {isMyStory && (
                    <button
                        className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white border-2 border-background"
                        onClick={(e) => { e.stopPropagation(); onAdd?.(); }}
                    >
                        <Plus className="w-3 h-3" />
                    </button>
                )}
            </div>
            <span className="text-xs font-medium max-w-[64px] truncate">
                {isMyStory ? "Your Story" : (profile.displayName || 'User').split(' ')[0]}
            </span>
        </div>
    );
};

export function StoriesBar({ currentUserProfile }: StoriesBarProps) {
    const { user } = useAuth();
    const [stories, setStories] = useState<Story[]>([]);
    const [groupedStories, setGroupedStories] = useState<Record<string, Story[]>>({});
    const [loading, setLoading] = useState(true);
    const [repostUrl, setRepostUrl] = useState<string | undefined>(undefined);
    const [repostType, setRepostType] = useState<'image' | 'video' | undefined>(undefined);

    const [showAddModal, setShowAddModal] = useState(false);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewingStories, setViewingStories] = useState<Story[]>([]);
    const [startIndex, setStartIndex] = useState(0);

    const loadStories = async () => {
        if (!user || !currentUserProfile) return;
        try {
            // Fetch college stories mainly
            const fetched = await getStories(currentUserProfile, 'college');

            // Group by User
            const groups: Record<string, Story[]> = {};
            fetched.forEach(s => {
                if (!groups[s.authorId]) groups[s.authorId] = [];
                groups[s.authorId].push(s);
            });

            setStories(fetched);
            setGroupedStories(groups);
        } catch (e) {
            console.warn("[StoriesBar]", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStories();
    }, [user, currentUserProfile]);

    const handleStoryClick = (authorId: string) => {
        const userStories = groupedStories[authorId];
        if (userStories && userStories.length > 0) {
            setViewingStories(userStories);

            // Find first unviewed story logic here (for now just start at 0)
            const firstUnviewed = userStories.findIndex(s => !s.viewers.includes(user?.uid || ''));
            setStartIndex(firstUnviewed >= 0 ? firstUnviewed : 0);

            setViewerOpen(true);
        }
    };

    const handleRepost = (url: string, type: 'image' | 'video') => {
        setRepostUrl(url);
        setRepostType(type);
        setViewerOpen(false);
        setShowAddModal(true);
    };

    // If no user or profile, we simply don't show the bar. This is non-blocking.
    if (!user || !currentUserProfile) return null;

    // Filter authors to show. Exclude current user from the list if they have no stories?
    // Usually "Your Story" is first, then others.
    const authorIds = Object.keys(groupedStories).filter(id => id !== user.uid);
    const myStories = groupedStories[user.uid] || [];

    return (
        <div className="mb-6 overflow-x-auto pb-2 scrollbar-hide smooth-scroll">
            <div className="flex gap-4 px-1">
                {/* My Story Node */}
                <StoryNode
                    profile={{ ...currentUserProfile, uid: user.uid }}
                    isMyStory={true}
                    hasUnseen={myStories.length > 0}
                    onClick={() => myStories.length > 0 ? handleStoryClick(user.uid) : setShowAddModal(true)}
                    onAdd={() => setShowAddModal(true)}
                />

                {/* Friends Stories */}
                {authorIds.map(uid => {
                    const userSt = groupedStories[uid];
                    const firstStory = userSt[0];
                    const allViewed = userSt.every(s => s.viewers.includes(user.uid));

                    return (
                        <StoryNode
                            key={uid}
                            profile={{
                                uid,
                                displayName: firstStory.authorName || 'User',
                                photoURL: firstStory.authorPhotoURL
                            }}
                            hasUnseen={!allViewed}
                            onClick={() => handleStoryClick(uid)}
                        />
                    );
                })}
            </div>

            {showAddModal && (
                <AddStoryModal
                    onClose={() => { setShowAddModal(false); setRepostUrl(undefined); loadStories(); }}
                    currentProfile={currentUserProfile}
                    initialMediaUrl={repostUrl}
                    initialMediaType={repostType}
                />
            )}

            {viewerOpen && (
                <StoryViewer
                    stories={viewingStories}
                    initialIndex={startIndex}
                    onClose={() => setViewerOpen(false)}
                    onRepost={handleRepost}
                />
            )}
        </div>
    );
}
