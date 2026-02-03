'use client';

import { UserProfile } from '@/lib/db';
import { CheckCircle2, Circle, PartyPopper } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface ProfileCompletenessProps {
    profile: UserProfile;
}

export function ProfileCompleteness({ profile }: ProfileCompletenessProps) {
    const fields = [
        { key: 'photoURL', label: 'Profile Photo', weight: 20 },
        { key: 'bio', label: 'Bio', weight: 20 },
        { key: 'interests', label: 'Interests', weight: 20, check: (p: UserProfile) => p.interests && p.interests.length > 0 },
        { key: 'college', label: 'College', weight: 15 },
        { key: 'course', label: 'Course', weight: 15 },
        { key: 'year', label: 'Year', weight: 10 },
    ];

    const filledFields = fields.filter(f => {
        if (f.check) return f.check(profile);
        // @ts-ignore
        return !!profile[f.key];
    });

    const completionPercentage = filledFields.reduce((acc, curr) => acc + curr.weight, 0);
    const isComplete = completionPercentage === 100;

    // Trigger Reward Logic
    const [rewardAwarded, setRewardAwarded] = useState(false);
    useEffect(() => {
        if (isComplete && !rewardAwarded) {
            // Import dynamically or assume it's available via db
            import('@/lib/db').then(({ awardProfileXP }) => {
                awardProfileXP(profile.uid).then((awarded) => {
                    if (awarded) setRewardAwarded(true);
                });
            });
        }
    }, [isComplete, profile.uid, rewardAwarded]);

    if (isComplete) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 border border-yellow-200 dark:border-yellow-900/50 rounded-xl p-6 mb-6 shadow-sm relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <PartyPopper className="w-24 h-24 text-yellow-500" />
                </div>

                <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-full">
                        <CheckCircle2 className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-yellow-900 dark:text-yellow-100">Profile Completed!</h3>
                        <p className="text-sm text-yellow-800 dark:text-yellow-300">
                            You've earned <span className="font-bold">+50 XP</span> for setting up your profile.
                        </p>
                    </div>
                </div>
            </motion.div>
        );
    }

    const nextMissing = fields.find(f => {
        if (f.check) return !f.check(profile);
        // @ts-ignore
        return !profile[f.key];
    });

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4 mb-6 shadow-sm">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                    <PartyPopper className="w-4 h-4 text-indigo-500" />
                    Complete Profile
                </h3>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{completionPercentage}%</span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full bg-indigo-200 dark:bg-indigo-900/50 rounded-full overflow-hidden mb-3">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercentage}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-indigo-500 rounded-full"
                />
            </div>

            {nextMissing && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-indigo-800 dark:text-indigo-300">
                        Add <span className="font-semibold">{nextMissing.label}</span> to reach {(completionPercentage + nextMissing.weight)}%
                    </p>
                    <Link href="/profile/edit" className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                        Add {nextMissing.label}
                    </Link>
                </div>
            )}
        </div>
    );
}
