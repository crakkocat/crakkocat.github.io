import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { AVATAR_OPTIONS, CatAvatarIcon } from './CatAvatars.tsx';
import {
  X,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  KeyRound,
  Check,
  AlertCircle,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    login,
    login2FA,
    register,
    startOAuth,
    showToast,
  } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign up fields
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('cyber-cat');

  // 2FA state
  const [pending2FAToken, setPending2FAToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  // Loading & error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  // Password strength calculation
  const calculatePasswordStrength = (pwd: string) => {
    let score = 0;
    if (!pwd) return { score: 0, label: 'None', color: 'bg-slate-700', text: 'text-slate-400' };
    if (pwd.length >= 8) score += 25;
    if (pwd.length >= 12) score += 15;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 20;
    if (/\d/.test(pwd)) score += 20;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 20;

    if (score < 40) return { score, label: 'Weak (Vulnerable)', color: 'bg-rose-500', text: 'text-rose-400' };
    if (score < 70) return { score, label: 'Fair (Playful Kitten)', color: 'bg-amber-500', text: 'text-amber-400' };
    if (score < 90) return { score, label: 'Strong (Sharpened Claws)', color: 'bg-cyan-400', text: 'text-cyan-400' };
    return { score, label: 'Apex Feline Grade', color: 'bg-emerald-400', text: 'text-emerald-400' };
  };

  const strength = calculatePasswordStrength(password);

  const handleDemoFill = () => {
    setIdentifier('whiskers@crakkocat.com');
    setPassword('CatNip#2026');
    setError(null);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login({ identifier, password });
      if (res.requires2FA && res.twoFactorToken) {
        setPending2FAToken(res.twoFactorToken);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending2FAToken) return;
    setError(null);
    setLoading(true);
    try {
      await login2FA(pending2FAToken, twoFactorCode);
    } catch (err: any) {
      setError(err.message || 'Invalid 2FA code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await register({
        email,
        password,
        username: username || email.split('@')[0],
        displayName: displayName || username || 'Feline Catizen',
        avatar: selectedAvatar,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(`Password recovery link dispatched to ${email || 'your email'}. Check CatMail!`, 'success');
    setAuthModalMode('signin');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-cyan-950/30 overflow-hidden">
        {/* Decorative Top Gradient */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500" />

        {/* Close Button */}
        <button
          onClick={() => {
            setIsAuthModalOpen(false);
            setPending2FAToken(null);
            setError(null);
          }}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-7">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-3 shadow-inner">
              <span className="text-2xl">🐾</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {pending2FAToken
                ? 'Two-Factor Authentication'
                : authModalMode === 'signin'
                ? 'Sign in to CatAuth'
                : authModalMode === 'signup'
                ? 'Join crakkocat.com'
                : 'Reset Password'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {pending2FAToken
                ? 'Enter your 6-digit TOTP authenticator code or emergency backup key.'
                : 'Feline-grade cryptographic authentication for crakkocat.com'}
            </p>
          </div>

          {/* Mode Switcher Tabs (when not in 2FA) */}
          {!pending2FAToken && authModalMode !== 'forgot' && (
            <div className="grid grid-cols-2 p-1 bg-slate-950/70 border border-slate-800/80 rounded-xl mb-6 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('signin');
                  setError(null);
                }}
                className={`py-2 rounded-lg transition cursor-pointer ${
                  authModalMode === 'signin'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('signup');
                  setError(null);
                }}
                className={`py-2 rounded-lg transition cursor-pointer ${
                  authModalMode === 'signup'
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 2FA Challenge View */}
          {pending2FAToken ? (
            <form onSubmit={handle2FASubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  6-Digit Authenticator Code / Backup Key
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="123456 or CAT-XXXX-XXXX"
                    value={twoFactorCode}
                    onChange={e => setTwoFactorCode(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-cyan-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Verifying Challenge...' : 'Verify & Continue'}
              </button>

              <button
                type="button"
                onClick={() => setPending2FAToken(null)}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                Back to Password Login
              </button>
            </form>
          ) : authModalMode === 'forgot' ? (
            /* Forgot Password Form */
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="feline@crakkocat.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold rounded-xl text-sm transition cursor-pointer"
              >
                Send Recovery Link to CatMail
              </button>

              <button
                type="button"
                onClick={() => setAuthModalMode('signin')}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                Return to Sign In
              </button>
            </form>
          ) : (
            <>
              {/* Top OAuth Buttons */}
              <div className="space-y-2.5 mb-5">
                {/* Google Sign-In */}
                <button
                  type="button"
                  onClick={() => startOAuth('google')}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-xl text-sm transition shadow-sm cursor-pointer border border-slate-200"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>
                    {authModalMode === 'signin' ? 'Sign in with Google' : 'Sign up with Google'}
                  </span>
                </button>

                {/* GitHub Sign-In */}
                <button
                  type="button"
                  onClick={() => startOAuth('github')}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-slate-950 hover:bg-slate-850 text-white font-semibold rounded-xl text-sm transition border border-slate-800 shadow-sm cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0 fill-white" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>
                    {authModalMode === 'signin' ? 'Sign in with GitHub' : 'Sign up with GitHub'}
                  </span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex py-2 items-center mb-5">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-[11px] text-slate-500 font-medium uppercase tracking-wider">
                  or with feline password
                </span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              {/* Sign In Form */}
              {authModalMode === 'signin' ? (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Email or Feline Username
                      </label>
                      <button
                        type="button"
                        onClick={handleDemoFill}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        Fill Demo Credentials
                      </button>
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="whiskers@crakkocat.com"
                        value={identifier}
                        onChange={e => setIdentifier(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setAuthModalMode('forgot')}
                        className="text-[11px] text-slate-400 hover:text-slate-300 transition cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl text-sm shadow-md shadow-cyan-500/20 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>{loading ? 'Authenticating...' : 'Sign In to CatAuth'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                /* Sign Up Form */
                <form onSubmit={handleSignUp} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        placeholder="Whiskers Neo"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="cat_guardian"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="email"
                        required
                        placeholder="feline@crakkocat.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  {/* Avatar Picker */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Choose Feline Avatar
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {AVATAR_OPTIONS.slice(0, 4).map(av => (
                        <button
                          type="button"
                          key={av.id}
                          onClick={() => setSelectedAvatar(av.id)}
                          className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                            selectedAvatar === av.id
                              ? 'border-cyan-400 bg-cyan-500/10 ring-1 ring-cyan-400'
                              : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                          }`}
                        >
                          <CatAvatarIcon avatarId={av.id} size="sm" />
                          <span className="text-[10px] text-slate-300 truncate w-full text-center">
                            {av.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Password with Strength Meter */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Password
                      </label>
                      <span className={`text-[11px] font-medium ${strength.text}`}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Minimum 8 characters"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-8 pr-10 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Strength Bar */}
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div
                        className={`h-full transition-all duration-300 ${strength.color}`}
                        style={{ width: `${Math.max(password ? 15 : 0, strength.score)}%` }}
                      />
                    </div>

                    {/* Hashing explainer */}
                    <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1.5 bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>Hashed with bcrypt (12 rounds) & unique salt before persistence.</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl text-sm shadow-md shadow-cyan-500/20 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                  >
                    <span>{loading ? 'Creating Account...' : 'Complete CatAuth Sign Up'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </>
          )}

          {/* Footer Security Badges */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
              CatAuth v2.4
            </span>
            <span>crakkocat.com Sentinel</span>
          </div>
        </div>
      </div>
    </div>
  );
};
