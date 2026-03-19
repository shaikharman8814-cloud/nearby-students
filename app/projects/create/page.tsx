'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createProject, ProjectCategory, ProjectPhase, ProjectRole, WorkCommitment } from '@/lib/projects-db';

import { Loader2, Plus, Trash2, ArrowLeft, Briefcase, Info, X, Image as ImageIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { uploadAttachment } from '@/lib/storage'; // Import our robust uploader

export default function CreateProjectPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);

    // Project Details
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<ProjectCategory>('Software');
    const [phase, setPhase] = useState<ProjectPhase>('Idea');
    const [locationScope, setLocationScope] = useState<'College' | 'City' | 'Remote'>('College');

    const [skillsString, setSkillsString] = useState(''); // Comma separated for input

    // Banner Image State
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);

    // Roles (Dynamic)
    const [roles, setRoles] = useState<ProjectRole[]>([]);

    // Role Input State (Temp)
    const [roleTitle, setRoleTitle] = useState('');
    const [roleSeats, setRoleSeats] = useState(1);
    const [roleCommitment, setRoleCommitment] = useState<WorkCommitment>('Flexible');
    const [rolePaid, setRolePaid] = useState(false);
    const [roleStipend, setRoleStipend] = useState('');

    const handleAddRole = () => {
        if (!roleTitle) return;
        const newRole: ProjectRole = {
            id: Math.random().toString(36).substr(2, 9),
            title: roleTitle,
            skills: [], // Can elaborate if needed
            commitment: roleCommitment,
            paid: rolePaid,
            stipendRange: rolePaid ? roleStipend : undefined,
            seats: roleSeats,
            openSeats: roleSeats
        };
        setRoles([...roles, newRole]);

        // Reset Inputs
        setRoleTitle('');
        setRoleSeats(1);
        setRolePaid(false);
        setRoleStipend('');
    };

    const removeRole = (id: string) => {
        setRoles(roles.filter(r => r.id !== id));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Image must be smaller than 5MB");
                return;
            }
            setBannerFile(file);
            setBannerPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        // Auto-add pending role if user forgot to click "Add Role"
        let finalRoles = [...roles];
        if (roles.length === 0 && roleTitle.trim()) {
            finalRoles.push({
                id: Math.random().toString(36).substr(2, 9),
                title: roleTitle,
                skills: [],
                commitment: roleCommitment,
                paid: rolePaid,
                stipendRange: rolePaid ? roleStipend : undefined,
                seats: roleSeats,
                openSeats: roleSeats
            });
        }

        if (finalRoles.length === 0) {
            toast.error("Please add at least one open role (e.g. Founder, Developer)");
            return;
        }

        setSubmitting(true);
        try {
            // Get user's college/city from profile?
            // Ideally we fetch it, but let's assume valid. 
            // In DB function we fetch author profile anyway.
            // But we need to pass college/city matching the author if 'College' scope.
            // For now, we rely on the backend/DB function to enrich or trust input?
            // The CREATE function in `projects-db` didn't fetch profile to set college/city. 
            // We should fix that or pass it here.
            // Let's pass placeholders and update `projects-db` if needed, OR just assume empty and fix later.
            // Wait, for recommendation logic relying on college/city, we MUST populate them.
            // I'll fetch profile on mount to get defaults.

            // NOTE: Code snippet below assumes createProject logic.

            const { getUserProfile } = await import('@/lib/db');
            const userProfile = await getUserProfile(user.uid);

            let bannerUrl = undefined;
            if (bannerFile) {
                try {
                    const path = `project-banners/${user.uid}/${Date.now()}_${bannerFile.name}`;
                    bannerUrl = await uploadAttachment(path, bannerFile);
                } catch (uploadErr) {
                    console.warn("Banner upload failed:", uploadErr);
                    toast.error("Failed to upload banner, project will rely on default.");
                    // Proceed without banner? Or stop? Let's proceed.
                }
            }

            const finalCollege = locationScope === 'College' ? userProfile?.college : undefined;
            const finalCity = locationScope === 'City' ? userProfile?.city : undefined;

            const projectPayload: any = {
                title,
                description,
                category,
                phase,
                locationScope,
                skills: skillsString.split(',').map(s => s.trim()).filter(Boolean),
                createdBy: user.uid,
                roles: finalRoles,
                bannerUrl
            };

            if (finalCollege) projectPayload.college = finalCollege;
            if (finalCity) projectPayload.city = finalCity;

            await createProject(projectPayload);

            toast.success("Project Created!");
            router.push('/projects');
        } catch (error: any) {
            toast.error(error.message || "Failed to create project");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4 lg:py-8 min-h-screen">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
                <ArrowLeft className="w-4 h-4" /> Back to Projects
            </button>

            <h1 className="text-2xl font-bold mb-6">Create New Project</h1>

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* 1. Basic Info */}
                <div className="space-y-6 bg-card border border-border p-5 rounded-xl">
                    <h2 className="font-semibold flex items-center gap-2">
                        <Info className="w-4 h-4 text-primary" /> Basic Details
                    </h2>

                    {/* Banner Upload */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">Project Cover Image (Optional)</label>
                        <div className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-secondary/50 transition-colors relative h-48 bg-secondary/10">
                            {bannerPreview ? (
                                <>
                                    <img src={bannerPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover rounded-xl opacity-80" />
                                    <button
                                        type="button"
                                        onClick={() => { setBannerFile(null); setBannerPreview(null); }}
                                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full z-10"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                <div className="pointer-events-none flex flex-col items-center gap-2 text-muted-foreground z-0">
                                    <ImageIcon className="w-8 h-8 opacity-50" />
                                    <span className="text-sm">Click to upload banner</span>
                                    <span className="text-xs opacity-70">JPG, PNG up to 5MB</span>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer ${bannerPreview ? 'hidden' : ''}`} // Hide input if preview exists to prevent accidental double dialog, use X to clear
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">Project Title</label>
                        <input
                            value={title} onChange={e => setTitle(e.target.value)}
                            className="w-full p-2.5 rounded-lg border bg-background" placeholder="e.g. AI Study Assistant" required
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">One-Line Description</label>
                        <textarea
                            value={description} onChange={e => setDescription(e.target.value)}
                            className="w-full p-2.5 rounded-lg border bg-background h-24 resize-none" placeholder="What are you building?" required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Category</label>
                            <select
                                value={category} onChange={e => setCategory(e.target.value as any)}
                                className="w-full p-2.5 rounded-lg border bg-background"
                            >
                                <option value="Software">Software</option>
                                <option value="Hardware">Hardware</option>
                                <option value="Business">Business</option>
                                <option value="Design">Design</option>
                                <option value="Content">Content</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Phase</label>
                            <select
                                value={phase} onChange={e => setPhase(e.target.value as any)}
                                className="w-full p-2.5 rounded-lg border bg-background"
                            >
                                <option value="Idea">Idea</option>
                                <option value="Building MVP">Building MVP</option>
                                <option value="Launched">Launched</option>
                                <option value="Scaling">Scaling</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">Location Preference</label>
                        <div className="flex gap-2">
                            {(['College', 'City', 'Remote'] as const).map(scope => (
                                <button
                                    key={scope}
                                    type="button"
                                    onClick={() => setLocationScope(scope)}
                                    className={`px-4 py-2 text-sm rounded-lg border transition-all ${locationScope === scope
                                        ? 'bg-primary/10 border-primary text-primary font-medium'
                                        : 'bg-background border-border text-muted-foreground hover:bg-secondary'
                                        }`}
                                >
                                    {scope}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">Skills / Tools needed</label>
                        <input
                            value={skillsString} onChange={e => setSkillsString(e.target.value)}
                            className="w-full p-2.5 rounded-lg border bg-background" placeholder="e.g. React, Figma, Marketing, Backend"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Add skills or tools people should have. Press comma or Enter after each one.</p>
                    </div>
                </div>

                {/* 2. Roles */}
                <div className="space-y-4 bg-card border border-border p-5 rounded-xl">
                    <h2 className="font-semibold flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-primary" /> Open Roles
                    </h2>

                    {roles.length > 0 && (
                        <div className="space-y-2 mb-4">
                            {roles.map(r => (
                                <div key={r.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
                                    <div>
                                        <p className="font-medium text-sm">{r.title}</p>
                                        <p className="text-xs text-muted-foreground">{r.commitment} • {r.paid ? r.stipendRange : 'Unpaid'}</p>
                                    </div>
                                    <button onClick={() => removeRole(r.id)} type="button" className="text-red-500 hover:bg-red-50 p-1 rounded">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="bg-muted/30 p-4 rounded-xl space-y-3 border border-dashed border-border">
                        <h3 className="text-sm font-medium">Add a Role</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                value={roleTitle} onChange={e => setRoleTitle(e.target.value)}
                                className="w-full p-2 rounded-md border text-sm" placeholder="Role Title (e.g. Frontend Dev)"
                            />
                            <select
                                value={roleCommitment} onChange={e => setRoleCommitment(e.target.value as any)}
                                className="w-full p-2 rounded-md border text-sm"
                            >
                                <option value="Flexible">Flexible</option>
                                <option value="Daily">Daily</option>
                                <option value="Weekends">Weekends Only</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={rolePaid} onChange={e => setRolePaid(e.target.checked)} className="rounded border-gray-300" />
                                Paid / Stipend?
                            </label>
                            {rolePaid && (
                                <input
                                    value={roleStipend} onChange={e => setRoleStipend(e.target.value)}
                                    className="flex-1 p-2 rounded-md border text-sm" placeholder="e.g. $50-100"
                                />
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={handleAddRole}
                            disabled={!roleTitle}
                            className="w-full py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" /> Add Role
                        </button>
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        Create Project
                    </button>
                </div>

            </form>
        </div>
    );
}
