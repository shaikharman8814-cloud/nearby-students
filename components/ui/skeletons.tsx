import { Skeleton } from "@/components/ui/skeleton";

export function FeedSkeleton() {
    return (
        <div className="space-y-4 max-w-2xl mx-auto w-full">
            {/* Header / Filter bar skeleton */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-8 w-20 rounded-full flex-shrink-0" />
                ))}
            </div>

            {/* Post/Card Skeletons */}
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 border border-border/40 rounded-2xl space-y-3">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[90%]" />
                    </div>
                    <Skeleton className="h-32 w-full rounded-xl" />
                </div>
            ))}
        </div>
    );
}

export function MobileShellSkeleton() {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Mobile Header Skeleton */}
            <div className="h-14 border-b border-border flex items-center px-4 justify-between lg:hidden">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>

            {/* Content area */}
            <div className="flex-1 p-4">
                <FeedSkeleton />
            </div>

            {/* Mobile Bottom Nav Skeleton */}
            <div className="h-16 border-t border-border mt-auto flex justify-around items-center px-4 lg:hidden">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-8 w-8 rounded-md" />
                ))}
            </div>
        </div>
    );
}
