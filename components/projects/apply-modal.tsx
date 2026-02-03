'use client';

import { useState } from 'react';
import { Project, ProjectRole, applyForRole } from '@/lib/projects-db';
import { UserProfile } from '@/lib/db';
import { Loader2, Send, X, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ApplyModalProps {
    project: Project;
    role: ProjectRole;
    userProfile: UserProfile;
    onClose: () => void;
}

export function ApplyModal({ project, role, userProfile, onClose }: ApplyModalProps) {
    const [message, setMessage] = useState('');
    const [portfolio, setPortfolio] = useState('');
    const [availability, setAvailability] = useState('10-15 hrs/week'); // Default
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (message.length < 10) {
            toast.error("Please write a bit more in your message.");
            return;
        }

        setSubmitting(true);
        try {
            await applyForRole({
                projectId: project.id,
                projectTitle: project.title,
                roleId: role.id,
                roleTitle: role.title,
                applicantUid: userProfile.uid,
                applicantName: userProfile.displayName,
                applicantPhoto: userProfile.photoURL,
                applicantBio: userProfile.bio,
                founderUid: project.createdBy,
                message,
                portfolioLink: portfolio || undefined,
                availability
            });

            toast.success("Application sent successfully!");
            onClose();
        } catch (error: any) {
            console.error("Application failed", error);
            toast.error(error.message || "Failed to apply");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <div>
                        <h3 className="font-bold">Apply for {role.title}</h3>
                        <p className="text-xs text-muted-foreground">at {project.title}</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-secondary rounded-full transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">

                    {/* Applying As... */}
                    <div className="bg-secondary/30 p-3 rounded-lg flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-background overflow-hidden border">
                            {userProfile.photoURL ? (
                                <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground">{userProfile.displayName?.[0]}</div>
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-medium">{userProfile.displayName}</p>
                            <p className="text-xs text-muted-foreground">{userProfile.college}</p>
                        </div>
                    </div>

                    {/* Message */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground flex justify-between">
                            Message
                            <span className="text-xs text-muted-foreground font-normal">{message.length}/500</span>
                        </label>
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="Why are you a good fit? Mention relevant experience..."
                            className="w-full min-h-[100px] p-3 rounded-lg border bg-background focus:ring-2 ring-primary/20 transition-all text-sm resize-y"
                            maxLength={500}
                            required
                        />
                    </div>

                    {/* Portfolio */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                            <LinkIcon className="w-3.5 h-3.5" /> Portfolio / LinkedIn (Optional)
                        </label>
                        <input
                            type="url"
                            value={portfolio}
                            onChange={e => setPortfolio(e.target.value)}
                            placeholder="https://github.com/username (optional)"
                            className="w-full p-2.5 rounded-lg border bg-background focus:ring-2 ring-primary/20 transition-all text-sm"
                        />
                    </div>

                    {/* Availability */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Availability</label>
                        <select
                            value={availability}
                            onChange={e => setAvailability(e.target.value)}
                            className="w-full p-2.5 rounded-lg border bg-background focus:ring-2 ring-primary/20 transition-all text-sm"
                        >
                            <option value="5-10 hrs/week">5-10 hrs/week</option>
                            <option value="10-15 hrs/week">10-15 hrs/week</option>
                            <option value="20+ hrs/week">20+ hrs/week</option>
                            <option value="Weekends Only">Weekends Only</option>
                        </select>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            Send Application
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
