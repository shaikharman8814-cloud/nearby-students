'use client';

import { useLayout } from '@/lib/layout-context';
import { Layout, Sidebar as SidebarIcon, Columns } from 'lucide-react';

export function LayoutSwitcher() {
    const { layout, toggleLayout } = useLayout();

    return (
        <button
            onClick={toggleLayout}
            className="flex items-center gap-2 p-2 rounded-lg transition-all duration-200 hover:bg-secondary text-muted-foreground hover:text-foreground relative group"
            title={`Switch to ${layout === 'header' ? 'Sidebar' : 'Header'} layout`}
        >
            <div className="relative">
                {layout === 'header' ? (
                    <SidebarIcon className="h-4 w-4 transition-transform group-hover:rotate-12" />
                ) : (
                    <Layout className="h-4 w-4 transition-transform group-hover:rotate-12" />
                )}
            </div>
            <span className="text-xs font-semibold hidden md:inline uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity">
                {layout === 'header' ? 'Sidebar' : 'Header'}
            </span>

            {/* Tooltip hint */}
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-[10px] rounded border border-border opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                Shift Layout
            </span>
        </button>
    );
}
