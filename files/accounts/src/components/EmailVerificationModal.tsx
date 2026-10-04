import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Mail, CheckCircle2, ShieldAlert, Sparkles, X, ArrowRight, RefreshCw } from 'lucide-react';

export const EmailVerificationModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { user, verifyEmail, resendVerification, setIsMailboxOpen, showToast } = useAuth();
  const [pinCode, setPinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyEmail({ code: pinCode });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerification();
      showToast('Fresh verification PIN sent to CatMail.', 'success');
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 overflow-hidden">
        {/* Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-cyan-500" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-3">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Verify Your Email Address</h3>
          <p className="text-xs text-slate-400 mt-1">
            We sent a secure 6-digit confirmation PIN to:
            <br />
            <strong className="text-cyan-400 font-mono text-sm">{user.email}</strong>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-center">
              Enter 6-Digit PIN (e.g. CAT-123456)
            </label>
            <input
              type="text"
              required
              autoFocus
              maxLength={10}
              placeholder="CAT-849201"
              value={pinCode}
              onChange={e => setPinCode(e.target.value.toUpperCase())}
              className="w-full text-center tracking-widest font-mono text-xl py-3 px-4 bg-slate-950 border border-slate-700 rounded-xl text-cyan-400 font-bold placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl text-sm shadow-md shadow-cyan-500/20 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{loading ? 'Verifying PIN...' : 'Verify Feline Identity'}</span>
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              setIsMailboxOpen(true);
            }}
            className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Check CatMail Simulator Inbox</span>
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-center text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5 transition cursor-pointer py-1"
          >
            <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
            <span>Didn't receive email? Resend code</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const EmailVerificationBanner: React.FC = () => {
  const { user, setIsMailboxOpen } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  if (!user || user.emailVerified) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-amber-950/80 via-amber-900/60 to-slate-900 border-b border-amber-500/30 px-4 py-2.5 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-200">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span>
              <strong>Feline Verification Pending:</strong> Check your CatMail for the 6-digit confirmation PIN for <span className="font-mono text-white font-semibold">{user.email}</span>.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setModalOpen(true)}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition cursor-pointer shadow-sm"
            >
              Enter Code
            </button>
            <button
              onClick={() => setIsMailboxOpen(true)}
              className="px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 text-amber-200 border border-amber-500/30 rounded-lg transition cursor-pointer"
            >
              Open CatMail
            </button>
          </div>
        </div>
      </div>

      <EmailVerificationModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
