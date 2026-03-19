'use client';

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";

interface Props {
    children?: ReactNode;
    isAdmin?: boolean;
}

interface State {
    hasError: boolean;
    error?: Error; // Store error for admin display
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // You can log the error to an error reporting service here
        // But we avoid console spamming per requirements
        if (this.props.isAdmin) {
            console.warn("ErrorBoundary caught error:", error, errorInfo);
        }
    }

    public render() {
        if (this.state.hasError) {
            // Admin / Owner View: Full Error Details
            if (this.props.isAdmin) {
                return (
                    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center animate-in fade-in duration-500">
                        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
                            <AlertCircle className="w-8 h-8 text-destructive" />
                        </div>
                        <h2 className="text-xl font-bold tracking-tight mb-2 text-destructive">Application Error</h2>
                        <p className="text-muted-foreground mb-4 font-mono text-xs bg-muted p-2 rounded max-w-lg overflow-auto">
                            {this.state.error?.message || "Unknown Error"}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="flex items-center gap-2 px-6 py-2 bg-destructive text-destructive-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Reload App
                        </button>
                    </div>
                );
            }

            // Normal User View: Friendly Fallback
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center animate-in fade-in duration-500">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                        <AlertCircle className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight mb-2">Something went wrong</h2>
                    <p className="text-muted-foreground mb-8 max-w-sm">
                        Please try again.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
