import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  ShieldCheck,
  Lock,
  Globe,
  Mail,
  Smartphone,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Key,
  Layers,
  Cpu,
  Terminal,
} from 'lucide-react';

export const LandingHero: React.FC = () => {
  const { startOAuth, setIsAuthModalOpen, setAuthModalMode, login, showToast, setIsMailboxOpen } = useAuth();

  // Interactive Bcrypt Visualizer Sandbox
  const [testPassword, setTestPassword] = useState('MyFelineSecret#2026');

  // Simulated live hash preview based on input
  const getSimulatedBcrypt = (text: string) => {
    // Generate deterministic-looking 22-char salt and 31-char hash
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    const saltPart = 'e8s.Y09W62.x/72UvNrq9u';
    const hashPart = Math.abs(hash).toString(36).padEnd(31, 'I7jYxR6uNlK22J5Z8H2z6q5h7B/E28.');
    return `$2a$12$${saltPart}${hashPart.substring(0, 31)}`;
  };

  const currentSimulatedHash = getSimulatedBcrypt(testPassword);

  const handleDemoSignIn = async () => {
    try {
      await login({ identifier: 'whiskers@crakkocat.com', password: 'CatNip#2026' });
      showToast('Logged in as Whiskers Prime!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Demo login failed', 'error');
    }
  };

  return (
    <div className="relative overflow-hidden py-12 sm:py-16 lg:py-20">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500/15 via-sky-500/10 to-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-6 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Official Auth Protocol for crakkocat.com</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight sm:leading-none">
            Feline-Grade Security.{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              Zero Friction.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed">
            CatAuth provides hardened account architecture with 12-round salted bcrypt hashing, seamless Google &amp; GitHub OAuth single sign-on, automated CatMail email verification, and TOTP 2FA.
          </p>

          {/* Quick Action CTA Bar */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {/* Google OAuth Button */}
            <button
              onClick={() => startOAuth('google')}
              className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-sm shadow-lg shadow-white/5 transition cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Sign in with Google</span>
            </button>

            {/* GitHub OAuth Button */}
            <button
              onClick={() => startOAuth('github')}
              className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm border border-slate-700 shadow-lg shadow-black/30 transition cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0 fill-white" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>Sign in with GitHub</span>
            </button>

            {/* Standard Register / Sign In */}
            <button
              onClick={() => {
                setAuthModalMode('signup');
                setIsAuthModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 transition cursor-pointer"
            >
              <span>Create Catizen Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* 1-Click Demo */}
            <button
              onClick={handleDemoSignIn}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-sm border border-slate-800 transition cursor-pointer"
              title="Sign in instantly with seeded architect account"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>1-Click Demo</span>
            </button>
          </div>
        </div>

        {/* Feature 1: Live Interactive Bcrypt Hashing Playground */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 mb-12 shadow-2xl relative">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider font-mono">
                <Cpu className="w-4 h-4" />
                Live Cryptographic Inspector
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                How CatAuth Hashes Your Password
              </h2>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              Algorithm: bcrypt (12 rounds)
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Test Passphrase (Type to see real-time hashing structure):
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={testPassword}
                    onChange={e => setTestPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                    placeholder="Enter password..."
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Cryptographic Salt:</span>
                  <span className="font-mono text-amber-300">$2a$12$e8s.Y09W62.x/72UvNrq9u</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Iterations (Cost Factor):</span>
                  <span className="font-mono text-cyan-300">2^12 = 4,096 rounds</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Rainbow Table Vulnerability:</span>
                  <span className="font-semibold text-emerald-400">0% (Per-user unique salt)</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Simulated Persisted Ciphertext (What gets stored in DB):
              </label>
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-cyan-300 break-all select-all leading-relaxed shadow-inner">
                {currentSimulatedHash}
              </div>
              <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
                Notice: Even if an attacker gains read access to the database, reversible decryption is mathematically infeasible. Timing-safe constant-time evaluation is enforced on login.
              </p>
            </div>
          </div>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: OAuth Popups */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Seamless OAuth Popups
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect via Google or GitHub without leaving the applet. Uses cross-origin <code className="text-cyan-400 font-mono">postMessage</code> handshakes tailored for preview iframes.
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => startOAuth('google')}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Google
              </button>
              <button
                onClick={() => startOAuth('github')}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                GitHub
              </button>
            </div>
          </div>

          {/* Card 2: Email Verification */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                CatMail Verification Flow
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every new email registration generates a cryptographic token and 6-digit confirmation PIN. Inspect messages live in our CatMail inbox simulator.
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800">
              <button
                onClick={() => setIsMailboxOpen(true)}
                className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Open CatMail Simulator
              </button>
            </div>
          </div>

          {/* Card 3: 2FA TOTP Protection */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                RFC 6238 TOTP 2FA
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Generate authenticator QR codes and emergency backup keys. When enabled, logins challenge the user for dynamic one-time tokens.
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setAuthModalMode('signin');
                  setIsAuthModalOpen(true);
                }}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Test 2FA Login Flow
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
