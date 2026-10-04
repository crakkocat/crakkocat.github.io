import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { CatAvatarIcon } from './CatAvatars.tsx';
import { ShieldCheck, Mail, LogIn, UserPlus, LogOut, Sparkles, Key, CheckCircle2 } from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    user,
    logout,
    startOAuth,
    setIsAuthModalOpen,
    setAuthModalMode,
    setIsMailboxOpen,
    mailbox,
    login,
    showToast,
  } = useAuth();

  const unverified = user && !user.emailVerified;
  const mailCount = mailbox.length;

  const handleDemoLogin = async () => {
    try {
      await login({ identifier: 'whiskers@crakkocat.com', password: 'CatNip#2026' });
      showToast('Logged in as Whiskers Prime (Demo Architect)!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Demo login failed', 'error');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo and Domain */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-indigo-600 shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
            <span className="text-xl">🐾</span>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                CatAuth
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  v2.4
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="font-mono text-slate-300">crakkocat.com</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Auth Online
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* CatMail Inbox Trigger */}
          <button
            onClick={() => setIsMailboxOpen(true)}
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-200 hover:text-white hover:bg-slate-800 transition-all text-xs sm:text-sm font-medium shadow-sm cursor-pointer"
            title="Open CatMail Inbox Simulator"
          >
            <Mail className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">CatMail</span>
            {mailCount > 0 && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-slate-950 bg-cyan-400 rounded-full">
                {mailCount}
              </span>
            )}
          </button>

          {!user ? (
            <>
              {/* Quick 1-Click Demo Login */}
              <button
                onClick={handleDemoLogin}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 text-xs font-medium transition cursor-pointer"
                title="1-Click sign in with demo credentials"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Demo Catizen</span>
              </button>

              {/* Quick OAuth Button Google */}
              <button
                onClick={() => startOAuth('google')}
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-slate-200 text-xs font-medium transition cursor-pointer hover:bg-slate-800"
                title="Sign in with Google OAuth"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Google</span>
              </button>

              {/* Sign In Button */}
              <button
                onClick={() => {
                  setAuthModalMode('signin');
                  setIsAuthModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-slate-400" />
                <span>Sign In</span>
              </button>

              {/* Sign Up Button */}
              <button
                onClick={() => {
                  setAuthModalMode('signup');
                  setIsAuthModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-cyan-500/20 transition cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Sign Up</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
                <CatAvatarIcon avatarId={user.avatar} size="sm" />
                <div className="hidden sm:block text-left">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-white leading-none">
                      {user.displayName}
                    </span>
                    {user.emailVerified ? (
                      <span title="Verified Feline Identity">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      </span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Unverified email" />
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">@{user.username}</span>
                </div>
              </div>

              <button
                onClick={logout}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition cursor-pointer"
                title="Sign out of CatAuth"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
