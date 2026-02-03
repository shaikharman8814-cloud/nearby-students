'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project, Application, applyForRole } from '@/lib/projects-db';
import { useAuth } from '@/lib/auth-context';
import { Loader2, MapPin, Calendar, ArrowLeft, Share2, Briefcase, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectDetailsPage() {
    const { id } = useParams() as { id: string };
    const { user } = useAuth();
    const router = useRouter();

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [applyingRole, setApplyingRole] = useState<string | null>(null);
    const [myApplication, setMyApplication] = useState<Application | null>(null);
    const [checkingApp, setCheckingApp] = useState(true);

    useEffect(() => {
        if (!id) return;

        const load = async () => {
            try {
                const docRef = doc(db, 'projects', id);
                const snap = await getDoc(docRef);

                if (snap.exists()) {
                    setProject({ id: snap.id, ...snap.data() } as Project);
                }

                // Check for existing application if user logged in
                if (user) {
                    const appsRef = collection(db, 'applications');
                    const q = query(
                        appsRef,
                        where('projectId', '==', id),
                        where('applicantUid', '==', user.uid)
                    );
                    const appSnap = await getDocs(q);
                    if (!appSnap.empty) {
                        setMyApplication({ id: appSnap.docs[0].id, ...appSnap.docs[0].data() } as Application);
                    }
                }

            } catch (e) {
                console.error("Failed to load project", e);
            } finally {
                setLoading(false);
                setCheckingApp(false);
            }
        };

        load();
    }, [id, user]);

    const handleApply = async (roleId: string, roleTitle: string) => {
        if (!user || !project) return;

        const message = prompt("Why are you a good fit? (Brief)");
        if (!message) return;

        setApplyingRole(roleId);
        try {
            await applyForRole({
                projectId: project.id,
                projectTitle: project.title,
                roleId,
                roleTitle,
                applicantUid: user.uid,
                applicantName: user.displayName || 'Student',
                applicantPhoto: user.photoURL || undefined,
                founderUid: project.createdBy,
                message,
                availability: 'Flexible', // Default for quick apply
            });
            toast.success("Application Sent!");
            // Refresh logic could go here
            setMyApplication({
                status: 'pending',
                roleId,
                roleTitle
            } as any);
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || "Failed to apply");
        } finally {
            setApplyingRole(null);
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    if (!project) return <div className="text-center py-20">Project not found</div>;

    const isOwner = user?.uid === project.createdBy;

    return (
        <div className="max-w-4xl mx-auto p-4 lg:p-8 min-h-screen">
            <button onClick={() => router.push('/projects')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
                <ArrowLeft className="w-4 h-4" /> Back to Projects
            </button>

            <div className="bg-card border border-border rounded-xl overflow-hidden mb-8">
                {project.bannerUrl && (
                    <div className="h-48 w-full bg-secondary">
                        <img src={project.bannerUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                )}
                <div className="p-6 md:p-8">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <span className="text-xs font-bold text-primary uppercase tracking-wider mb-2 block">{project.category} · {project.phase}</span>
                            <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {project.locationScope === 'College' ? project.college : project.city}</span>
                                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Posted {new Date(project.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                        {isOwner && (
                            <button
                                onClick={() => router.push(`/projects/${project.id}/manage`)}
                                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium text-sm hover:bg-secondary/80"
                            >
                                Manage Project
                            </button>
                        )}
                    </div>

                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap mb-8">
                        {project.description}
                    </p>

                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-primary" />
                        Open Roles
                    </h2>

                    <div className="grid gap-4">
                        {project.roles.map(role => {
                            const isApplyDisabled = !!myApplication || role.openSeats === 0;
                            const isMyRole = myApplication?.roleId === role.id;

                            return (
                                <div key={role.id} className="border border-border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="font-bold text-lg">{role.title}</h3>
                                        <div className="flex flex-wrap gap-2 text-xs mt-1">
                                            {role.skills.map(s => <span key={s} className="px-2 py-0.5 bg-secondary rounded text-secondary-foreground">{s}</span>)}
                                            <span className="px-2 py-0.5 border border-border rounded opacity-70">{role.commitment}</span>
                                            {role.paid ? <span className="px-2 py-0.5 bg-green-500/10 text-green-600 rounded font-medium">Paid</span> : <span className="px-2 py-0.5 bg-secondary/50 rounded">Unpaid</span>}
                                        </div>
                                    </div>

                                    {!isOwner && (
                                        myApplication?.status === 'accepted' && isMyRole ? (
                                            <button
                                                onClick={() => router.push(`/groups/project_${project.id}`)}
                                                className="px-5 py-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
                                            >
                                                Chat with Team
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleApply(role.id, role.title)}
                                                disabled={isApplyDisabled || applyingRole === role.id || checkingApp}
                                                className={`px-5 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${isMyRole
                                                        ? 'bg-secondary text-secondary-foreground' // Applied but pending/rejected
                                                        : role.openSeats === 0
                                                            ? 'bg-secondary text-muted-foreground cursor-not-allowed'
                                                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                    }`}
                                            >
                                                {applyingRole === role.id ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                                    isMyRole ? (myApplication?.status === 'pending' ? 'Applied' : 'Rejected') :
                                                        role.openSeats === 0 ? 'Filled' : 'Apply Now'}
                                            </button>
                                        )
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
