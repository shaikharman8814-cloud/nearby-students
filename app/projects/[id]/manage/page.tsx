'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getProjectApplications, updateApplicationStatus, Application, Project, ProjectRole, WorkCommitment } from '@/lib/projects-db';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, ArrowLeft, CheckCircle, XCircle, MessageSquare, Clock, User as UserIcon, Users as UsersIcon, Briefcase as BriefcaseIcon, Edit2, Save, Image as ImageIcon, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { updateDoc } from 'firebase/firestore';
import { uploadAttachment } from '@/lib/storage'; // Reusing storage helper

export default function ManageProjectPage() {
    const { user } = useAuth();
    const { id } = useParams() as { id: string }; // Project ID
    const router = useRouter();

    const [project, setProject] = useState<Project | null>(null);
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editPhase, setEditPhase] = useState('');

    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const [editRoles, setEditRoles] = useState<ProjectRole[]>([]);

    // Role Inputs
    const [roleTitle, setRoleTitle] = useState('');
    const [roleSeats, setRoleSeats] = useState(1);
    const [roleCommitment, setRoleCommitment] = useState<WorkCommitment>('Flexible');
    const [rolePaid, setRolePaid] = useState(false);
    const [roleStipend, setRoleStipend] = useState('');

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user || !id) return;

        const load = async () => {
            setLoading(true);
            try {
                // 1. Fetch Project to verify ownership
                const docRef = doc(db, 'projects', id);
                const snap = await getDoc(docRef);

                if (!snap.exists()) {
                    toast.error("Project not found");
                    router.push('/projects');
                    return;
                }

                const projData = { id: snap.id, ...snap.data() } as Project;

                if (projData.createdBy !== user.uid) {
                    toast.error("Unauthorized");
                    router.push('/projects');
                    return;
                }

                if (projData.createdBy !== user.uid) {
                    toast.error("Unauthorized");
                    router.push('/projects');
                    return;
                }

                setProject(projData);
                // Init Edit State
                setEditTitle(projData.title);
                setEditDesc(projData.description);
                setEditPhase(projData.phase);
                setEditTitle(projData.title);
                setEditDesc(projData.description);
                setEditPhase(projData.phase);
                setEditRoles(projData.roles || []);
                setBannerPreview(projData.bannerUrl || null);

                // 2. Fetch Applications
                const apps = await getProjectApplications(id);
                setApplications(apps);

            } catch (e) {
                console.error("Failed to load dashboard", e);
                toast.error("Failed to load dashboard");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [user, id, router]);

    const handleAddRole = () => {
        if (!roleTitle) return;
        const newRole: ProjectRole = {
            id: Math.random().toString(36).substr(2, 9),
            title: roleTitle,
            skills: [],
            commitment: roleCommitment,
            paid: rolePaid,
            stipendRange: rolePaid ? roleStipend : undefined,
            seats: roleSeats,
            openSeats: roleSeats
        };
        setEditRoles([...editRoles, newRole]);
        setRoleTitle('');
        setRoleSeats(1);
        setRolePaid(false);
        setRoleStipend('');
    };

    const handleRemoveRole = (id: string) => {
        // Warning: Removing a role might orphan applications. 
        // For MVP, we allow it.
        setEditRoles(editRoles.filter(r => r.id !== id));
    };

    const handleStatusUpdate = async (appId: string, status: 'accepted' | 'rejected') => {
        if (!user) return;
        setProcessingId(appId);
        try {
            await updateApplicationStatus(appId, status, user.uid);

            // Update local state
            setApplications(prev => prev.map(a =>
                a.id === appId ? { ...a, status } : a
            ));

            toast.success(`Application ${status}`);
        } catch (e) {
            console.error("Update failed", e);
            toast.error("Failed to update status");
        } finally {
            setProcessingId(null);
        }
    };

    const handleSaveProject = async () => {
        if (!project || !user) return;
        setSaving(true);
        try {
            let bannerUrl = project.bannerUrl;

            if (bannerFile) {
                const path = `project-banners/${user.uid}/${Date.now()}_${bannerFile.name}`;
                bannerUrl = await uploadAttachment(path, bannerFile);
            }

            // Sanitize roles to remove 'undefined' (Firestore rejects it)
            const sanitizedRoles = JSON.parse(JSON.stringify(editRoles));

            const docRef = doc(db, 'projects', project.id);
            await updateDoc(docRef, {
                title: editTitle,
                description: editDesc,
                phase: editPhase,
                roles: sanitizedRoles,
                bannerUrl: bannerUrl || null
            });

            setProject({ ...project, title: editTitle, description: editDesc, phase: editPhase as any, roles: sanitizedRoles, bannerUrl: bannerUrl || undefined });
            setIsEditing(false);
            toast.success("Project Updated!");
        } catch (e) {
            console.error("Save failed", e);
            toast.error("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    if (!project) return null;

    return (
        <div className="max-w-4xl mx-auto p-4 lg:p-8 min-h-screen">
            <button onClick={() => router.push('/projects')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
                <ArrowLeft className="w-4 h-4" /> Back to Projects
            </button>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex-1">
                    {isEditing ? (
                        <div className="space-y-4 bg-card border border-border p-4 rounded-xl mb-4 animate-in fade-in slide-in-from-top-2">
                            {/* Banner Edit */}
                            <div className="relative h-48 bg-secondary/10 rounded-lg overflow-hidden border-2 border-dashed border-border group">
                                {bannerPreview ? (
                                    <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                        <ImageIcon className="w-8 h-8 opacity-50" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <label className="cursor-pointer bg-white text-black px-4 py-2 rounded-full font-bold text-sm hover:bg-white/90">
                                        Change Cover
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                setBannerFile(e.target.files[0]);
                                                setBannerPreview(URL.createObjectURL(e.target.files[0]));
                                            }
                                        }} />
                                    </label>
                                </div>
                            </div>

                            <input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="text-2xl font-bold bg-background border rounded px-2 py-1 w-full"
                                placeholder="Project Title"
                            />
                            <textarea
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="w-full p-2 bg-background border rounded text-muted-foreground h-24 resize-none"
                                placeholder="Project Description"
                            />
                            <select
                                value={editPhase}
                                onChange={(e) => setEditPhase(e.target.value)}
                                className="block w-full md:w-auto p-2 bg-background border rounded text-sm font-medium"
                            >
                                <option value="Idea">Idea</option>
                                <option value="Building MVP">Building MVP</option>
                                <option value="Launched">Launched</option>
                                <option value="Scaling">Scaling</option>
                            </select>

                            {/* Roles Editor */}
                            <div className="border-t border-border pt-4">
                                <h3 className="font-semibold text-sm mb-3">Manage Roles</h3>
                                <div className="space-y-2 mb-3">
                                    {editRoles.map(r => (
                                        <div key={r.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded border border-border/50 text-sm">
                                            <div>
                                                <span className="font-medium">{r.title}</span>
                                                <span className="text-muted-foreground ml-2 text-xs">({r.openSeats}/{r.seats} Open)</span>
                                            </div>
                                            <button onClick={() => handleRemoveRole(r.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-muted p-3 rounded-lg space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            value={roleTitle} onChange={e => setRoleTitle(e.target.value)}
                                            className="flex-1 p-2 rounded border text-sm" placeholder="New Role Title"
                                        />
                                        <input
                                            type="number" min="1" max="10"
                                            value={roleSeats || ''}
                                            onChange={e => {
                                                const val = parseInt(e.target.value);
                                                setRoleSeats(isNaN(val) ? 0 : val);
                                            }}
                                            className="w-16 p-2 rounded border text-sm" placeholder="Seats"
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddRole}
                                        disabled={!roleTitle}
                                        className="w-full py-1.5 bg-secondary text-secondary-foreground text-xs font-bold rounded flex items-center justify-center gap-1 hover:bg-secondary/80 disabled:opacity-50"
                                    >
                                        <Plus className="w-3 h-3" /> Add Role
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleSaveProject}
                                    disabled={saving}
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm flex items-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Changes
                                </button>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-bold text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-start justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold flex items-center gap-2">
                                        {project.title}
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${project.phase === 'Idea' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                            project.phase === 'Building MVP' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-green-100 text-green-700 border-green-200'
                                            }`}>{project.phase}</span>
                                    </h1>
                                    <p className="text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                                </div>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-2 hover:bg-secondary rounded-full transition-colors"
                                    title="Edit Project Details"
                                >
                                    <Edit2 className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>
                        </>
                    )}
                </div>
                <div className="flex gap-2 text-sm">
                    <span className="px-3 py-1 bg-secondary rounded-full font-medium">
                        {applications.length} Application{applications.length !== 1 ? 's' : ''}
                    </span>
                    <span className="px-3 py-1 bg-secondary rounded-full font-medium">
                        {project.roles.reduce((acc, r) => acc + (r.seats - r.openSeats), 0)} Positions Filled
                    </span>
                </div>
            </div>

            <div className="grid gap-4">
                {applications.length === 0 ? (
                    <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                        <p className="text-muted-foreground">No applications yet.</p>
                    </div>
                ) : (
                    applications.map(app => (
                        <div key={app.id} className="bg-card border border-border rounded-xl p-5 flex flex-col md:flex-row gap-6">

                            {/* Applicant Info */}
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden">
                                        {app.applicantPhoto ? (
                                            <img src={app.applicantPhoto} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground">
                                                <UserIcon className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{app.applicantName}</h3>
                                        <p className="text-sm text-primary font-medium">{app.roleTitle}</p>
                                    </div>
                                </div>

                                <div className="bg-secondary/30 p-3 rounded-lg text-sm">
                                    <p className="italic text-muted-foreground mb-1">"{app.message}"</p>
                                    {app.portfolioLink && (
                                        <a href={app.portfolioLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline block text-xs mt-1">
                                            View Portfolio
                                        </a>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {app.availability}</span>
                                    <span>Applied {new Date(app.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-row md:flex-col items-center justify-center gap-2 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 min-w-[140px]">
                                {app.status === 'pending' ? (
                                    <>
                                        <button
                                            onClick={() => handleStatusUpdate(app.id, 'accepted')}
                                            disabled={!!processingId}
                                            className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            {processingId === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate(app.id, 'rejected')}
                                            disabled={!!processingId}
                                            className="w-full py-2 px-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Reject
                                        </button>
                                        <button
                                            // Future: Open Chat
                                            onClick={() => toast.info("Chat integration coming soon")}
                                            className="w-full py-2 px-4 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors"
                                        >
                                            <MessageSquare className="w-4 h-4" />
                                            Message
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex flex-col gap-2 w-full">
                                        <div className={`flex items-center justify-center gap-2 font-bold px-4 py-2 rounded-lg ${app.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                            {app.status === 'accepted' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                            <span className="capitalize">{app.status}</span>
                                        </div>
                                        {app.status === 'accepted' && (
                                            <button
                                                onClick={() => router.push(`/groups/project_${project.id}`)}
                                                className="w-full py-2 px-4 bg-primary text-primary-foreground text-sm font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                                Message Team
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
