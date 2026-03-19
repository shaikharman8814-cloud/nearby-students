'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

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

    useEffect(() => {
        // If auth is not initialized (e.g. server-side or config missing), stop loading
        if (!auth) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Determine if we need to create a user document
                try {
                    // Safe logic to ensure db is available before use (it should be if auth is)
                    if (db) {
                        const userRef = doc(db, 'users', user.uid);
                        const docSnap = await getDoc(userRef);

                        if (!docSnap.exists()) {
                            await setDoc(userRef, {
                                uid: user.uid,
                                name: user.displayName || "New Student",
                                displayName: user.displayName || "New Student",
                                email: user.email || null,
                                photoURL: user.photoURL || null,
                                createdAt: serverTimestamp(),
                                profileCompleted: false
                            }, { merge: true });
                        }
                    }
                } catch (error) {
                    console.error("Error ensuring user document:", error);
                }
            }

            setUser(user);
            setLoading(false);
        }, (error: any) => {
            console.warn("[AuthContext] Firebase Auth Error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signOut = async () => {
        try {
            if (auth) {
                await firebaseSignOut(auth);
                setUser(null);
                router.push('/');
            }
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signOut, logout: signOut }}>
            {children}
        </AuthContext.Provider>
    );
}
