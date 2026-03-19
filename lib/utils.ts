import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSafeDisplayName(profile?: { displayName?: string; name?: string; fullName?: string; username?: string } | null): string {
  if (!profile) return 'Student One User';
  const name = (profile.name || profile.displayName || profile.fullName || profile.username || 'Student').trim();
  return name || 'Student';
}
