import React from 'react';

export interface AvatarOption {
  id: string;
  name: string;
  color: string;
  emoji: string;
  border: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'cyber-cat', name: 'Cyber Cat', color: 'from-cyan-500 to-blue-600', emoji: '🐱‍💻', border: 'border-cyan-400' },
  { id: 'ninja-cat', name: 'Ninja Cat', color: 'from-purple-500 to-indigo-600', emoji: '🐱‍👤', border: 'border-purple-400' },
  { id: 'astro-cat', name: 'Astro Cat', color: 'from-amber-400 to-orange-500', emoji: '🐱‍🚀', border: 'border-amber-400' },
  { id: 'wizard-cat', name: 'Wizard Cat', color: 'from-emerald-400 to-teal-600', emoji: '🧙‍♂️', border: 'border-emerald-400' },
  { id: 'samurai-cat', name: 'Samurai Cat', color: 'from-rose-500 to-red-600', emoji: '⚔️', border: 'border-rose-400' },
  { id: 'royal-cat', name: 'Royal Cat', color: 'from-yellow-400 to-amber-600', emoji: '👑', border: 'border-yellow-400' },
  { id: 'hacker-cat', name: 'Hacker Cat', color: 'from-green-400 to-emerald-700', emoji: '🐾', border: 'border-green-400' },
  { id: 'pirate-cat', name: 'Captain Cat', color: 'from-slate-600 to-slate-800', emoji: '🏴‍☠️', border: 'border-slate-400' },
];

export const CatAvatarIcon: React.FC<{ avatarId: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }> = ({
  avatarId,
  size = 'md',
  className = '',
}) => {
  const opt = AVATAR_OPTIONS.find(a => a.id === avatarId) || AVATAR_OPTIONS[0];

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-2xl',
    xl: 'w-20 h-20 text-4xl',
  }[size];

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br ${opt.color} shadow-lg ring-1 ring-white/20 select-none ${sizeClasses} ${className}`}
    >
      <span>{opt.emoji}</span>
    </div>
  );
};
