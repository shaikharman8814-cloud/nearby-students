'use client';

import Link from 'next/link';
import { Project, ProjectRole } from '@/lib/projects-db';
import { BadgeCheck, Briefcase, MapPin, Users, Activity, Clock, MessageSquare, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
// import { formatDistanceToNow } from 'date-fns';

interface ProjectCardProps {
    project: Project;
    onApply: (project: Project, role: ProjectRole) => void;
    applicationStatus?: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
    myRoleTitle?: string;
}

function timeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "just now";
}

export function ProjectCard({ project, onApply, applicationStatus, myRoleTitle }: ProjectCardProps) {
    const { user } = useAuth();
    const isOwner = user?.uid === project.createdBy;

    return (
        <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow relative overflow-hidden">
            {project.bannerUrl && (
                <div className="h-32 -mx-5 -mt-5 mb-4 relative bg-secondary/20">
                    <img src={project.bannerUrl} alt={project.title} className="w-full h-full object-cover" />
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="font-bold text-lg leading-tight mb-1">{project.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {project.authorName}
                        </span>
                        <span>•</span>
                        <span>{timeAgo(project.createdAt)}</span>
                        {project.locationScope !== 'Remote' && (
                            <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> {project.city || project.college}
                                </span>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    {/* NEW Badge */}
                    {(Date.now() - new Date(project.createdAt).getTime()) < 48 * 60 * 60 * 1000 && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm mb-0.5">
                            NEW
                        </span>
                    )}

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${project.phase === 'Idea' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        project.phase === 'Building MVP' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                        {project.phase}
                    </span>
                    {isOwner && (
                        <div className="flex flex-col items-end gap-1 mt-1">
                            <Link href={`/projects/${project.id}/manage`} className="text-xs font-medium text-primary hover:underline">
                                Manage Project
                            </Link>
                            <Link href={`/groups/project_${project.id}`} className="text-xs font-medium text-green-600 dark:text-green-400 hover:underline flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" /> Team Chat
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Description */}
            <p className="text-sm text-foreground/80 mb-4 line-clamp-3">
                {project.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-4">
                {project.skills.slice(0, 5).map((skill, i) => (
                    <span key={i} className="px-2 py-0.5 bg-secondary text-secondary-foreground text-[10px] font-medium rounded-md">
                        {skill}
                    </span>
                ))}
            </div>

            {/* Roles */}
            <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> Open Roles
                </h4>
                <div className="grid gap-2">
                    {project.roles.map(role => (
                        <div key={role.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border border-border/50">
                            <div>
                                <p className="font-semibold text-sm">{role.title}</p>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {role.commitment}
                                    </span>
                                    <span>•</span>
                                    <span>{role.paid ? (role.stipendRange || 'Paid') : 'Unpaid'}</span>
                                    {role.openSeats > 0 && <span className="text-green-600 dark:text-green-400">• {role.openSeats} seat{role.openSeats > 1 ? 's' : ''} left</span>}
                                </div>
                            </div>
                            {isOwner ? (
                                <div className="text-xs text-muted-foreground font-medium px-2">
                                    {role.seats - role.openSeats} / {role.seats} Filled
                                </div>
                            ) : (
                                applicationStatus && myRoleTitle === role.title ? (
                                    applicationStatus === 'accepted' ? (
                                        <Link href={`/groups/project_${project.id}`}>
                                            <button className="px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold rounded-md hover:opacity-90 transition-opacity">
                                                Chat
                                            </button>
                                        </Link>
                                    ) : (
                                        <span className={`px-3 py-1.5 text-xs font-semibold rounded-md ${applicationStatus === 'pending' ? 'bg-secondary text-secondary-foreground' : 'bg-red-100 text-red-600'
                                            }`}>
                                            {applicationStatus === 'pending' ? 'Applied' : 'Rejected'}
                                        </span>
                                    )
                                ) : (
                                    <button
                                        onClick={() => onApply(project, role)}
                                        className="flex items-center gap-1 pl-2 pr-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-full hover:opacity-90 transition-all shadow-sm active:scale-95"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Apply
                                    </button>
                                )
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Helper to show 'Phase' colors or icons
