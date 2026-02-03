'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getUserProfile, updateUserProfile, UserProfile } from '@/lib/db';
import { uploadProfileImage } from '@/lib/storage';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, ArrowRight } from 'lucide-react';

export default function OnboardingPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<Partial<UserProfile>>({});
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            router.push('/login');
            return;
        }

        getUserProfile(user.uid)
            .then(profile => {
                if (profile) {
                    setFormData(profile);
                    setPreviewUrl(profile.photoURL || null);

                    // If profile is already completed, redirect to home
                    if (profile.profileCompleted) {
                        router.push('/');
                    }
                }
            })
            .catch(err => console.error("Failed to load profile", err))
            .finally(() => setLoading(false));
    }, [user, authLoading, router]);

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
                    }, 'image/jpeg', 0.7);
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        // Validation
        if (!formData.displayName?.trim()) {
            alert('Please enter your name');
            return;
        }

        setSaving(true);

        try {
            let photoURL = formData.photoURL;
            if (file) {
                const compressedFile = await compressImage(file);
                photoURL = await uploadProfileImage(user.uid, compressedFile);
            }

            const updates: any = { ...formData };
            if (photoURL !== undefined) {
                updates.photoURL = photoURL;
            }

            // Clean up undefined values
            Object.keys(updates).forEach(key => {
                if (updates[key] === undefined) {
                    delete updates[key];
                }
            });

            // CRITICAL: Set profileCompleted to true
            updates.profileCompleted = true;

            await updateUserProfile(user.uid, updates);

            // Redirect to home
            router.push('/');
        } catch (err: any) {
            console.error(err);
            alert(`Failed to save profile: ${err.message || 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-card rounded-2xl border border-border shadow-lg p-6 lg:p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Welcome to Student One! 🎉</h1>
                    <p className="text-muted-foreground">Let's set up your profile to get started</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Profile Photo */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative w-32 h-32 rounded-full overflow-hidden bg-secondary border-2 border-border shadow-sm">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-muted-foreground bg-zinc-100 dark:bg-zinc-800">
                                    {formData.displayName?.charAt(0) || '?'}
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
                                            setFile(null);
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

                    {/* Form Fields */}
                    <div className="grid gap-4">
                        <div>
                            <label className="text-sm font-medium">Display Name *</label>
                            <input
                                required
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={formData.displayName || ''}
                                onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                                placeholder="Your name"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">City</label>
                            <input
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={formData.city || ''}
                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                                placeholder="e.g. Mumbai, New York"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">College / University</label>
                            <input
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={formData.college || ''}
                                onChange={e => setFormData({ ...formData, college: e.target.value })}
                                placeholder="e.g. PW Institute of Innovation"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">Course</label>
                                <input
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={formData.course || ''}
                                    onChange={e => setFormData({ ...formData, course: e.target.value })}
                                    placeholder="e.g. CS"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Year</label>
                                <input
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={formData.year || ''}
                                    onChange={e => setFormData({ ...formData, year: e.target.value })}
                                    placeholder="e.g. 2nd Year"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium">Interests (comma separated)</label>
                            <input
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={formData.interests?.join(', ') || ''}
                                onChange={e => setFormData({ ...formData, interests: e.target.value.split(',').map(s => s.trim()) })}
                                placeholder="Coding, Design, Music"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                        {saving ? 'Setting up...' : 'Complete Setup'}
                    </button>

                    <p className="text-xs text-center text-muted-foreground">
                        You can always update your profile later from settings
                    </p>
                </form>
            </div>
        </div>
    );
}
