import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { EmailVerificationBanner } from './components/EmailVerificationModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { CatMailDrawer } from './components/CatMailDrawer.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { LandingHero } from './components/LandingHero.tsx';
import { ShieldCheck, CheckCircle2, AlertCircle, Info, Heart } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading, toast } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl mb-4 animate-bounce">
          🐾
        </div>
        <p className="text-xs font-mono text-cyan-400">Loading CatAuth Sentinel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-xs font-semibold shadow-2xl backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/30 text-rose-200'
                : 'bg-slate-900/90 border-cyan-500/30 text-cyan-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar />

      {/* Email Verification Persistent Alert if user is unverified */}
      <EmailVerificationBanner />

      {/* Main Container */}
      <main className="flex-1">
        {user ? <Dashboard /> : <LandingHero />}
      </main>

      {/* Global Modals & Drawers */}
      <AuthModal />
      <CatMailDrawer />

      {/* Feline Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🐾</span>
            <span className="font-bold text-slate-400">CatAuth</span>
            <span>— The Feline Identity Protocol for</span>
            <span className="font-mono text-cyan-400 font-semibold">crakkocat.com</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Salted Bcrypt (12 Rounds)</span>
            <span>•</span>
            <span>OAuth 2.0 (Google &amp; GitHub)</span>
            <span>•</span>
            <span>RFC 6238 TOTP</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
