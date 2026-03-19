'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getUserProfile, updateUserProfile, UserProfile } from '@/lib/db';
import { uploadProfileImage } from '@/lib/storage';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Upload, Save } from 'lucide-react';
import Image from 'next/image';

export default function EditProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<Partial<UserProfile>>({});
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return; // Wait for auth check

        if (!user) {
            router.push('/login');
            return;
        }

        getUserProfile(user.uid)
            .then(profile => {
                if (profile) {
                    setFormData(profile);
                    setPreviewUrl(profile.photoURL || null);
                }
            })
            .catch(err => console.warn("Failed to load profile", err))
            .finally(() => setLoading(false));
    }, [user, authLoading]);

    const handleDisplayImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);
            setPreviewUrl(URL.createObjectURL(f));
        }
    };

    const compressImage = (file: File): Promise<File> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = document.createElement('img');
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            const newFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            resolve(newFile);
                        } else {
                            reject(new Error('Canvas is empty'));
                        }
                    }, 'image/jpeg', 0.7); // 0.7 quality
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);

        try {
            let photoURL = formData.photoURL;
            if (file) {
                // Compress image before upload
                const compressedFile = await compressImage(file);
                photoURL = await uploadProfileImage(user.uid, compressedFile);
            }

            // Clean up formData to remove undefined values
            const updates: any = { ...formData };
            if (photoURL !== undefined) {
                updates.photoURL = photoURL;
            } else {
                delete updates.photoURL; // Don't wipe it out if we didn't touch it, or set to null if intended
            }

            // Explicitly set undefined fields to null for Firestore if needed, or just delete them
            Object.keys(updates).forEach(key => {
                if (updates[key] === undefined) {
                    delete updates[key];
                }
            });

            await updateUserProfile(user.uid, updates);

            router.push(`/profile/${user.uid}`);
        } catch (err: any) {
            console.warn(err);
            // Show a visible error to the user
            alert(`Failed to save profile: ${err.message || 'Unknown error'}. Check console for details.`);
        } finally {
            setSaving(false);
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-2xl mx-auto p-4 lg:p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">Edit Profile</h1>
                <Link href="/settings/account" className="text-sm font-medium text-blue-500 hover:underline">
                    Account Settings
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative w-32 h-32 rounded-full overflow-hidden bg-secondary border-2 border-border shadow-sm">
                        {previewUrl ? (
                            <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-muted-foreground bg-zinc-100 dark:bg-zinc-800">
                                {formData.displayName?.charAt(0)}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-center gap-3">
                        <label className="cursor-pointer">
                            <span className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors text-sm font-medium shadow-sm">
                                <Upload className="w-4 h-4" /> Upload Photo
                            </span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleDisplayImage} />
                        </label>
                        <span className="text-xs text-muted-foreground">- OR -</span>
                        <div className="flex flex-wrap justify-center gap-2 max-w-xs">
                            {['Felix', 'Aneka', 'Zoe', 'Marc', 'Bandit', 'Bubba', 'Callie'].map((seed) => (
                                <button
                                    key={seed}
                                    type="button"
                                    onClick={() => {
                                        const url = `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}`;
                                        setPreviewUrl(url);
                                        setFormData({ ...formData, photoURL: url });
                                        setFile(null); // Clear manual upload if avatar selected
                                    }}
                                    className="w-10 h-10 rounded-full overflow-hidden border border-border hover:scale-110 transition-transform bg-white"
                                    title={`Use ${seed} avatar`}
                                >
                                    <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${seed}`} alt="Avatar" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid gap-4">
                    <div>
                        <label className="text-sm font-medium">Display Name</label>
                        <input
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.displayName || ''}
                            onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-3">
                            <label className="text-sm font-medium">Status (e.g. Studying)</label>
                            <input
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.statusText || ''}
                                onChange={e => setFormData({ ...formData, statusText: e.target.value })}
                                placeholder="What are you doing?"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Emoji</label>
                            <input
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-center text-lg placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.statusEmoji || ''}
                                onChange={e => setFormData({ ...formData, statusEmoji: e.target.value })}
                                placeholder="📚"
                                maxLength={2}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Birthday 🎉</label>
                        <input
                            type="date"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.birthday || ''}
                            onChange={e => setFormData({ ...formData, birthday: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium flex justify-between items-center">
                            Bio
                            <button
                                onClick={async () => { // Changed to async
                                    const currentBio = formData.bio || '';
                                    const interests = formData.interests?.join(', ') || '';

                                    // Validation: Need at least something to work with
                                    if (!currentBio && !interests && !formData.college && !formData.course) {
                                        alert("Please add some interests, college details, or a draft bio first!");
                                        return;
                                    }

                                    setLoading(true);

                                    try {
                                        const token = await user?.getIdToken();
                                        const res = await fetch('/api/enhance-bio', {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${token}`
                                            },
                                            body: JSON.stringify({
                                                bio: currentBio,
                                                interests: interests,
                                                college: formData.college,
                                                course: formData.course
                                            })
                                        });

                                        if (!res.ok) throw new Error('Failed to fetch');

                                        const data = await res.json();
                                        if (data.bio) {
                                            setFormData({ ...formData, bio: data.bio });
                                        }
                                    } catch (error) {
                                        console.warn("Enhance failed", error);
                                        alert("Failed to enhance bio. Please try again.");
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                                type="button" // Explicitly type button to avoid form submit
                            >
                                <span className="bg-primary/10 px-2 py-0.5 rounded-full font-medium">✨ SocialNet Enhance Bio</span>
                            </button>
                        </label>
                        <textarea
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.bio || ''}
                            onChange={e => setFormData({ ...formData, bio: e.target.value })}
                            placeholder="Tell us about yourself..."
                        />
                    </div>

                    {/* Bio Links Section */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium flex justify-between items-center">
                            Bio Links
                            <button
                                type="button"
                                onClick={() => {
                                    const currentLinks = formData.bioLinks || [];
                                    if (currentLinks.length >= 5) {
                                        alert("Maximum 5 links allowed.");
                                        return;
                                    }
                                    setFormData({
                                        ...formData,
                                        bioLinks: [...currentLinks, { title: '', url: '' }]
                                    });
                                }}
                                className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                            >
                                <span className="bg-primary/10 px-2 py-0.5 rounded-full font-medium">+ Add Link</span>
                            </button>
                        </label>
                        {(formData.bioLinks || []).map((link, index) => (
                            <div key={index} className="flex gap-2 items-start">
                                <div className="grid grid-cols-2 gap-2 flex-1">
                                    <input
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={link.title}
                                        onChange={(e) => {
                                            const newLinks = [...(formData.bioLinks || [])];
                                            newLinks[index].title = e.target.value;
                                            setFormData({ ...formData, bioLinks: newLinks });
                                        }}
                                        placeholder="Title (e.g. Portfolio)"
                                    />
                                    <input
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={link.url}
                                        onChange={(e) => {
                                            const newLinks = [...(formData.bioLinks || [])];
                                            newLinks[index].url = e.target.value;
                                            setFormData({ ...formData, bioLinks: newLinks });
                                        }}
                                        placeholder="URL (https://...)"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newLinks = [...(formData.bioLinks || [])];
                                        newLinks.splice(index, 1);
                                        setFormData({ ...formData, bioLinks: newLinks });
                                    }}
                                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                </button>
                            </div>
                        ))}
                        {(formData.bioLinks || []).length === 0 && (
                            <p className="text-xs text-muted-foreground italic">No links added yet.</p>
                        )}
                    </div>
                    <div>
                        <label className="text-sm font-medium">City</label>
                        <input
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.city || ''}
                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                            placeholder="e.g. Mumbai, New York"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-sm font-medium">College / University</label>
                            <input
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.college || ''}
                                onChange={e => setFormData({ ...formData, college: e.target.value })}
                                onBlur={(e) => {
                                    const val = e.target.value.trim();
                                    // Specific User Request: Expand PWIOI
                                    const MAP: Record<string, string> = {
                                        'pwioi': 'PW Institute of Innovation',
                                        'p.w.i.o.i': 'PW Institute of Innovation',
                                        'iit': 'Indian Institute of Technology', // Generic, maybe risky but helpful
                                    };
                                    const lower = val.toLowerCase();
                                    if (MAP[lower]) {
                                        setFormData({ ...formData, college: MAP[lower] });
                                    }
                                }}
                                placeholder="e.g. PW Institute of Innovation"
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">
                                ⚠️ Please use the <strong>Full College Name</strong> (not short forms) so others can find you!
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Course</label>
                            <input
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.course || ''}
                                onChange={e => setFormData({ ...formData, course: e.target.value })}
                                placeholder="e.g. CS"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Year</label>
                            <input
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.year || ''}
                                onChange={e => setFormData({ ...formData, year: e.target.value })}
                                placeholder="e.g. 2nd Year"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Interests (comma separated)</label>
                        <input
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            // @ts-ignore
                            value={formData.interests?.join(', ') || ''}
                            onChange={e => setFormData({ ...formData, interests: e.target.value.split(',').map(s => s.trim()) })}
                            placeholder="Coding, Design, Music"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none disabled:opacity-50"
                >
                    {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </button>
            </form >
        </div >
    );
}
