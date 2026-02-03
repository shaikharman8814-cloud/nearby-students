'use client';

import React from 'react';

interface FadeInProps {
    children: React.ReactNode;
    show?: boolean;
    className?: string;
}

export function FadeIn({ children, show = true, className = "" }: FadeInProps) {
    return (
        <div
            className={`transition-opacity duration-700 ease-in-out ${show ? 'opacity-100' : 'opacity-0'} ${className}`}
        >
            {children}
        </div>
    );
}
