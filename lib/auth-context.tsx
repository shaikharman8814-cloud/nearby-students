'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signOut: async () => { },
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Safety timeout to prevent infinite loading in restricted browsers (e.g. Chrome on IP)
        // Safety timeout to prevent infinite loading in restricted browsers
        const safetyTimeout = setTimeout(() => {
            setLoading(current => {
                if (current) {
                    console.warn("[AuthContext] Auth state took too long (10s). Forcing loading to false.");
                    return false;
                }
                return false;
            });
        }, 10000);

        const ensureUserDocument = async (authUser: User) => {
            try {
                const userRef = doc(db, 'users', authUser.uid);
                const docSnap = await getDoc(userRef);

                if (!docSnap.exists()) {
                    await setDoc(userRef, {
                        uid: authUser.uid,
                        name: authUser.displayName || "New Student",
                        displayName: authUser.displayName || "New Student", // Compatibility
                        email: authUser.email || null,
                        createdAt: serverTimestamp(),
                        // Safe defaults for app functionality
                        college: "",
                        course: "",
                        city: "",
                        location: null,
                        profileCompleted: false
                    }, { merge: true });
                }
            } catch (error) {
                // Silently fail as per "DO NOT: ... Add logs"
            }
        };

        const unsubscribe = onAuthStateChanged(auth,
            (user) => {
                clearTimeout(safetyTimeout);
                setUser(user);
                setLoading(false);
                if (user) {
                    ensureUserDocument(user);
                }
            },
            (error: any) => {
                clearTimeout(safetyTimeout);
                console.error("[AuthContext] Firebase Auth Error:", error);
                if (error.code === 'auth/operation-not-allowed') {
                    console.warn("⚠️ AUTH DISABLED: Email/Password provider is disabled in Firebase Console.");
                }
                setLoading(false);
            }
        );

        return () => {
            unsubscribe();
            clearTimeout(safetyTimeout);
        };
    }, []);

    const signOut = async () => {
        await firebaseSignOut(auth);
        router.push('/');
    };

    return (
        <AuthContext.Provider value={{ user, loading, signOut, logout: signOut }}>
            {children}
        </AuthContext.Provider>
    );
}
