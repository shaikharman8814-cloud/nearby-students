'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth-context';
import { db } from './firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

export type LayoutType = 'header' | 'sidebar';

interface LayoutContextType {
    layout: LayoutType;
    toggleLayout: () => void;
    setLayout: (layout: LayoutType) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [layout, setLayoutState] = useState<LayoutType>('header');
    const [isInitialized, setIsInitialized] = useState(false);

    // 1. Initial Load
    useEffect(() => {
        const loadLayout = async () => {
            // Priority 1: LocalStorage (Fastest)
            const saved = localStorage.getItem('app-layout') as LayoutType;
            if (saved === 'header' || saved === 'sidebar') {
                setLayoutState(saved);
            }

            // Priority 2: Firestore (Source of Truth)
            if (user) {
                try {
                    const userRef = doc(db, 'users', user.uid);
                    const snap = await getDoc(userRef);
                    if (snap.exists()) {
                        const data = snap.data();
                        if (data.preferredLayout && (data.preferredLayout === 'header' || data.preferredLayout === 'sidebar')) {
                            setLayoutState(data.preferredLayout);
                            try {
                                localStorage.setItem('app-layout', data.preferredLayout);
                            } catch (e) { }
                        }
                    }
                } catch (e) {
                    console.warn("Error loading layout from Firestore:", e);
                }
            }
            setIsInitialized(true);
        };

        loadLayout();
    }, [user]);

    // 2. Persist Changes
    const setLayout = async (newLayout: LayoutType) => {
        setLayoutState(newLayout);
        try {
            localStorage.setItem('app-layout', newLayout);
        } catch (e) { }

        if (user) {
            try {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                    preferredLayout: newLayout
                });
            } catch (e) {
                console.warn("Error saving layout to Firestore:", e);
            }
        }
    };

    const toggleLayout = () => {
        const next = layout === 'header' ? 'sidebar' : 'header';
        setLayout(next);
    };

    return (
        <LayoutContext.Provider value={{ layout, toggleLayout, setLayout }}>
            {/* Avoid flash of unstyled content if possible, or just render default */}
            <div className={isInitialized ? 'layout-ready' : 'layout-initializing'}>
                {children}
            </div>
        </LayoutContext.Provider>
    );
}

export const useLayout = () => {
    const context = useContext(LayoutContext);
    if (!context) throw new Error('useLayout must be used within a LayoutProvider');
    return context;
};
