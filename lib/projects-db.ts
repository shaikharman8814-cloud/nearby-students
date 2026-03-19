import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, getDoc, serverTimestamp, setDoc, orderBy, limit, deleteDoc, arrayUnion } from 'firebase/firestore';
import { UserProfile, getUserProfile, createNotification, addXp } from './db';

// --- Types ---

export type ProjectCategory = 'Software' | 'Hardware' | 'Content' | 'Design' | 'Business' | 'Other';
export type ProjectPhase = 'Idea' | 'Building MVP' | 'Launched' | 'Scaling';
export type WorkCommitment = 'Daily' | 'Weekends' | 'Flexible';

export interface ProjectRole {
    id: string; // Random ID for linking
    title: string; // e.g. "Frontend Dev"
    skills: string[]; // e.g. ["React", "TypeScript"]
    commitment: WorkCommitment;
    paid: boolean;
    stipendRange?: string; // e.g. "$50-100" or "Equity"
    seats: number;
    openSeats: number;
}

export interface Project {
    id: string;
    title: string;
    description: string;
    category: ProjectCategory;
    phase: ProjectPhase;

    // Location Logic
    locationScope: 'College' | 'City' | 'Remote';
    college?: string; // Populated if scope is College
    city?: string;    // Populated if scope is City

    skills: string[]; // Aggregated skills for search

    // Author Info (Cached for Feed Performance)
    createdBy: string; // UID
    authorName: string;
    authorPhoto?: string;
    authorBadge?: string;

    createdAt: string;

    roles: ProjectRole[];
    bannerUrl?: string;
}

export interface Application {
    id: string;
    projectId: string;
    projectTitle: string; // Cached
    roleId: string;
    roleTitle: string; // Cached

    applicantUid: string;
    applicantName: string; // Cached
    applicantPhoto?: string;
    applicantBio?: string; // Brief

    founderUid: string; // For security rules / querying

    message: string;
    portfolioLink?: string;
    availability: string;

    status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
    createdAt: string;
}

// --- Functions ---

// Helper to recursively remove undefined values
function removeUndefined(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(v => removeUndefined(v));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.entries(obj).reduce((acc, [k, v]) => {
            if (v !== undefined) {
                acc[k] = removeUndefined(v);
            }
            return acc;
        }, {} as any);
    }
    return obj;
}

/**
 * Create a new Project
 */
export const createProject = async (projectData: Omit<Project, 'id' | 'createdAt' | 'authorName' | 'authorPhoto'>) => {
    try {
        // Enrich with Author Data
        const authorProfile = await getUserProfile(projectData.createdBy);
        const authorName = authorProfile?.displayName || 'Founder';
        const authorPhoto = authorProfile?.photoURL || null;

        const newProject = {
            ...projectData,
            authorName,
            authorPhoto,
            createdAt: new Date().toISOString()
        };

        // Deep clean to ensure no undefined values exist (Firestore Rejection Fix)
        const cleanData = removeUndefined(newProject);

        const docRef = await addDoc(collection(db, 'projects'), cleanData);

        // --- XP: Project Created (+10 XP) ---
        try {
            await addXp(projectData.createdBy, 10, `project_${docRef.id}`);
        } catch (e) {
            console.warn("XP Project Creation Award Failed", e);
        }

        return { id: docRef.id, ...cleanData };
    } catch (e) {
        console.warn("[ProjectsDB] createProject error:", e);
        throw e;
    }
};

/**
 * Get Projects with Filters and Simple Recommendation Logic
 */
export const getProjects = async (currentUserId: string, filters: { filter: 'for-you' | 'all' | 'my-projects'; userProfile?: UserProfile }) => {
    try {
        const projectsRef = collection(db, 'projects');

        if (filters.filter === 'my-projects') {
            const q = query(projectsRef, where('createdBy', '==', currentUserId));
            const snap = await getDocs(q);
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
            // Sort client-side to avoid Composite Index requirement
            return docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        // "All" and "For You" basically fetch recent projects for now
        // Recommendation logic is often best done client-side if data is small (< 500 projects)
        // or via dedicated specialized Index/Algolia.
        // We will fetch recent 20-50 and filter/sort client side for "For You".

        const q = query(projectsRef, orderBy('createdAt', 'desc'), limit(50));
        const snap = await getDocs(q);
        let projects = snap.docs.map(d => ({ id: d.id, ...d.data() } as Project));

        if (filters.filter === 'for-you' && filters.userProfile) {
            const p = filters.userProfile;
            // Simple client-side scoring
            projects = projects.sort((a, b) => {
                let scoreA = 0;
                let scoreB = 0;

                // College Boost
                if (a.locationScope === 'College' && a.college === p.college) scoreA += 10;
                if (b.locationScope === 'College' && b.college === p.college) scoreB += 10;

                // City Boost
                if (a.city === p.city) scoreA += 5;
                if (b.city === p.city) scoreB += 5;

                // Skills Match (Overlap)
                const skillsA = a.skills?.filter(s => p.interests?.includes(s)).length || 0;
                const skillsB = b.skills?.filter(s => p.interests?.includes(s)).length || 0;
                scoreA += skillsA * 3;
                scoreB += skillsB * 3;

                return scoreB - scoreA;
            });
        }

        return projects;
    } catch (e) {
        console.warn("[ProjectsDB] getProjects error:", e);
        return [];
    }
};

/**
 * Apply for a Role
 */
export const applyForRole = async (applicationData: Omit<Application, 'id' | 'createdAt' | 'status'>) => {
    try {
        // 1. Check if already applied
        const applicationsRef = collection(db, 'applications');
        const q = query(
            applicationsRef,
            where('projectId', '==', applicationData.projectId),
            where('roleId', '==', applicationData.roleId),
            where('applicantUid', '==', applicationData.applicantUid)
        );
        const existing = await getDocs(q);

        // Allow re-apply if withdrawn or rejected? Let's say NO for now to avoid spam.
        if (!existing.empty) {
            // Check status?
            const status = existing.docs[0].data().status;
            if (status !== 'withdrawn') {
                throw new Error(`You have already applied (Status: ${status})`);
            }
        }

        // 2. Create Application
        const newApp: Omit<Application, 'id'> = {
            ...applicationData,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        // Sanitize undefined values (e.g. applicantPhoto, portfolioLink)
        const cleanApp = removeUndefined(newApp);

        const docRef = await addDoc(applicationsRef, cleanApp);

        // 3. Notify Founder - MOVED TO CLOUD FUNCTIONS
        // await createNotification(applicationData.founderUid, {
        //     type: 'project_alert',
        //     title: `New Application: ${applicationData.roleTitle}`,
        //     body: `${applicationData.applicantName} applied for ${applicationData.projectTitle}`,
        //     link: `/projects/${applicationData.projectId}/manage`, // Dashboard link
        //     senderId: applicationData.applicantUid,
        //     isAnonymous: false,
        //     metadata: {
        //         projectId: applicationData.projectId,
        //         roleId: applicationData.roleId,
        //         applicationId: docRef.id
        //     }
        // });

        return { id: docRef.id, ...newApp };
    } catch (e) {
        console.warn("[ProjectsDB] applyForRole error:", e);
        throw e;
    }
};

/**
 * Get Applications (For Founder Dashboard)
 */
export const getProjectApplications = async (projectId: string, founderId: string) => {
    try {
        const applicationsRef = collection(db, 'applications');
        const q = query(
            applicationsRef,
            where('projectId', '==', projectId),
            where('founderUid', '==', founderId)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Application));
    } catch (e) {
        console.warn("[ProjectsDB] getProjectApplications error:", e);
        return [];
    }
};

/**
 * Get User's Applications (For "My Applications" View)
 */
export const getUserApplications = async (userUid: string) => {
    try {
        const applicationsRef = collection(db, 'applications');
        const q = query(applicationsRef, where('applicantUid', '==', userUid));
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Application));
        return docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
        console.warn("[ProjectsDB] getUserApplications error:", e);
        return [];
    }
};

/**
 * Update Application Status (Accept/Reject)
 */
export const updateApplicationStatus = async (applicationId: string, status: 'accepted' | 'rejected', founderUid: string) => {
    try {
        const appRef = doc(db, 'applications', applicationId);
        const appSnap = await getDoc(appRef);

        if (!appSnap.exists()) throw new Error("Application not found");
        const app = appSnap.data() as Application;

        // Security Check
        if (app.founderUid !== founderUid) throw new Error("Unauthorized");

        await updateDoc(appRef, { status });

        // Notify Applicant
        let title = '';
        let body = '';

        if (status === 'accepted') {
            title = "Application Accepted! 🎉";
            body = `You've been accepted as ${app.roleTitle} for ${app.projectTitle}.`;

            // Decrement Open Seats logic can be added here
            // Ideally we fetch Project, find Role, decrement openSeats...
            try {
                const projectRef = doc(db, 'projects', app.projectId);
                const pSnap = await getDoc(projectRef);
                if (pSnap.exists()) {
                    const pData = pSnap.data() as Project;
                    const newRoles = pData.roles.map(r => {
                        if (r.id === app.roleId && r.openSeats > 0) {
                            return { ...r, openSeats: r.openSeats - 1 };
                        }
                        return r;
                    });
                    await updateDoc(projectRef, { roles: newRoles });
                }
            } catch (e) {
                console.warn("Failed to decrement seats", e);
            }

            // --- NEW: Project Membership & Group Chat Logic ---
            try {
                // 1. Create Project Member Record
                // This grants "Project Member" status for future permission checks
                await addDoc(collection(db, 'project_members'), {
                    projectId: app.projectId,
                    projectTitle: app.projectTitle,
                    userId: app.applicantUid,
                    userName: app.applicantName,
                    roleId: app.roleId,
                    roleTitle: app.roleTitle,
                    joinedAt: new Date().toISOString(),
                    status: 'active'
                });

                // 2. Manage Project Group Chat
                // Deterministic ID ensures we don't create duplicates
                const groupId = `project_${app.projectId}`;
                const groupRef = doc(db, 'groups', groupId);
                const groupSnap = await getDoc(groupRef);

                if (!groupSnap.exists()) {
                    // Feature: Auto-create Project Group if it doesn't exist
                    // The Owner/Founder is the creator and first admin
                    await setDoc(groupRef, {
                        id: groupId,
                        name: app.projectTitle, // Group Name matches Project
                        type: 'custom', // Using 'custom' to ensure compatibility, conceptual 'project'
                        privacy: 'private', // Only members can join/see
                        description: `Official Team Chat for ${app.projectTitle}`,
                        admins: [founderUid],
                        members: [founderUid, app.applicantUid], // Add Founder + New Member
                        createdAt: new Date().toISOString(),
                        icon: '🚀', // Project default icon
                        projectId: app.projectId // Link back to project
                    });
                } else {
                    // Feature: Add new member to existing Group
                    await updateDoc(groupRef, {
                        members: arrayUnion(app.applicantUid)
                    });
                }

                console.log("Project Membership & Group Configured for:", app.applicantUid);

            } catch (e) {
                console.warn("Failed to configure project membership/group:", e);
                // We don't throw here to avoid rolling back the acceptance status update
                // which has already succeeded.
            }

        } else {
            title = "Application Update";
            body = `Your application for ${app.roleTitle} at ${app.projectTitle} was not selected.`;
        }

        // MOVED TO CLOUD FUNCTIONS
        // await createNotification(app.applicantUid, {
        //     type: 'project_alert',
        //     title,
        //     body,
        //     link: `/projects/${app.projectId}`,
        //     senderId: founderUid,
        //     isAnonymous: false,
        //     metadata: {
        //         projectId: app.projectId,
        //         status
        //     }
        // });

        return status;
    } catch (e) {
        console.warn("[ProjectsDB] updateApplicationStatus error:", e);
        throw e;
    }
};
