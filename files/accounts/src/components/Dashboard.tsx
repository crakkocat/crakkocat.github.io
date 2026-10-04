import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { AVATAR_OPTIONS, CatAvatarIcon } from './CatAvatars.tsx';
import { api } from '../lib/api.ts';
import {
  User,
  UserSession,
  AuditLogItem,
  DeveloperKey,
  TwoFactorSetupData,
} from '../types.ts';
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  Lock,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  QrCode,
  Globe,
  Terminal,
  Copy,
  Check,
  Trash2,
  Plus,
  Sparkles,
  Layers,
  Code2,
  Sliders,
  Laptop,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, refreshUser, startOAuth, setIsMailboxOpen, showToast } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'oauth' | 'developer'>('profile');

  // Profile Form State
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || 'cyber-cat');
  const [savingProfile, setSavingProfile] = useState(false);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // 2FA Setup State
  const [twoFactorData, setTwoFactorData] = useState<TwoFactorSetupData | null>(null);
  const [twoFactorVerifyCode, setTwoFactorVerifyCode] = useState('');
  const [settingUp2FA, setSettingUp2FA] = useState(false);

  // Sessions and Audit Logs
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingSecurityData, setLoadingSecurityData] = useState(false);

  // Developer Keys
  const [devKeys, setDevKeys] = useState<DeveloperKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);

  // Interactive embedded widget test state
  const [widgetAuthResult, setWidgetAuthResult] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  // Sync state on user change
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setBio(user.bio || '');
      setAvatar(user.avatar);
    }
  }, [user]);

  // Load tab-specific data
  useEffect(() => {
    if (activeTab === 'security') {
      loadSecurityDetails();
    } else if (activeTab === 'developer') {
      loadDeveloperKeys();
    }
  }, [activeTab]);

  const loadSecurityDetails = async () => {
    setLoadingSecurityData(true);
    try {
      const [sessRes, logsRes] = await Promise.all([
        api.getSessions().catch(() => ({ sessions: [] })),
        api.getAuditLog().catch(() => ({ logs: [] })),
      ]);
      setSessions(sessRes.sessions);
      setAuditLogs(logsRes.logs);
    } finally {
      setLoadingSecurityData(false);
    }
  };

  const loadDeveloperKeys = async () => {
    try {
      const res = await api.getDevKeys();
      setDevKeys(res.keys);
    } catch {
      // Ignore
    }
  };

  if (!user) return null;

  // Handle Profile Update
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.updateProfile({ displayName, bio, avatar });
      await refreshUser();
      showToast('Feline profile updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Password Rotation
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters.', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password securely rotated and re-salted with 12-round bcrypt.', 'success');
      loadSecurityDetails();
    } catch (err: any) {
      showToast(err.message || 'Failed to change password.', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  // 2FA Handlers
  const handleInitiate2FA = async () => {
    try {
      const data = await api.generate2FA();
      setTwoFactorData(data);
      setSettingUp2FA(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to initialize 2FA', 'error');
    }
  };

  const handleConfirm2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.enable2FA(twoFactorVerifyCode);
      await refreshUser();
      setSettingUp2FA(false);
      setTwoFactorData(null);
      setTwoFactorVerifyCode('');
      showToast('Two-Factor Authentication is now active on your account!', 'success');
      loadSecurityDetails();
    } catch (err: any) {
      showToast(err.message || 'Invalid 2FA code', 'error');
    }
  };

  const handleDisable2FA = async () => {
    try {
      await api.disable2FA();
      await refreshUser();
      showToast('Two-Factor Authentication disabled.', 'info');
      loadSecurityDetails();
    } catch (err: any) {
      showToast(err.message || 'Failed to disable 2FA', 'error');
    }
  };

  // Revoke session
  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.revokeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      showToast('Session revoked.', 'info');
    } catch {
      showToast('Failed to revoke session.', 'error');
    }
  };

  // Developer Keys
  const handleCreateDevKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const res = await api.createDevKey(newKeyName.trim());
      setDevKeys(prev => [res.key, ...prev]);
      setNewKeyName('');
      showToast(`Generated API key for ${res.key.name}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to create key', 'error');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleDeleteDevKey = async (id: string) => {
    try {
      await api.deleteDevKey(id);
      setDevKeys(prev => prev.filter(k => k.id !== id));
      showToast('API Key revoked.', 'info');
    } catch {
      showToast('Failed to revoke API key.', 'error');
    }
  };

  // OAuth Unlink
  const handleUnlinkOAuth = async (provider: 'google' | 'github') => {
    try {
      await api.unlinkOAuth(provider);
      await refreshUser();
      showToast(`Disconnected ${provider} identity.`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to unlink account.', 'error');
    }
  };

  // Widget Copy
  const embedCodeSnippet = `<!-- CatAuth Feline Sign-In Widget for crakkocat.com Ecosystem -->
<script src="https://crakkocat.com/catauth-v2.js" async></script>
<div
  id="catauth-button"
  data-client-id="cat_live_crakko_${user.id.slice(-6)}"
  data-theme="dark"
  data-callback="onCatAuthSuccess"
></div>

<script>
  function onCatAuthSuccess(felineUser) {
    console.log("Authenticated Catizen:", felineUser.displayName, felineUser.email);
  }
</script>`;

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCodeSnippet);
    setCopiedScript(true);
    showToast('CatAuth embed snippet copied to clipboard!', 'info');
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      {/* Top Profile Summary Card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 mb-8 shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Avatar and Info */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <CatAvatarIcon avatarId={user.avatar} size="xl" />
              <div
                className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-slate-900 ${
                  user.emailVerified ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                title={user.emailVerified ? 'Verified Catizen' : 'Verification Required'}
              >
                {user.emailVerified ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                )}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  {user.displayName}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  @{user.username}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {user.role}
                </span>
              </div>

              <p className="text-xs text-slate-400 mt-1 max-w-lg">
                {user.bio || 'Feline Catizen navigating the encrypted boundaries of crakkocat.com.'}
              </p>

              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-400">
                <span className="font-mono text-slate-300">{user.email}</span>
                <span className="text-slate-600">•</span>
                <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Security Score Meter */}
          <div className="w-full md:w-64 bg-slate-950/70 border border-slate-800 rounded-2xl p-4 shrink-0">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Security Grade
              </span>
              <span className="font-bold font-mono text-cyan-300 text-sm">
                {user.securityScore}/100{' '}
                <span className="text-[11px] text-slate-400 font-normal">
                  ({user.securityScore >= 90 ? 'A+' : user.securityScore >= 70 ? 'B' : 'C'})
                </span>
              </span>
            </div>

            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  user.securityScore >= 80
                    ? 'bg-emerald-400'
                    : user.securityScore >= 60
                    ? 'bg-cyan-400'
                    : 'bg-amber-400'
                }`}
                style={{ width: `${user.securityScore}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-2.5 text-[10px] text-slate-400">
              <span className={user.emailVerified ? 'text-emerald-400' : 'text-slate-500'}>
                ✓ Email
              </span>
              <span className={user.twoFactorEnabled ? 'text-emerald-400' : 'text-slate-500'}>
                {user.twoFactorEnabled ? '✓ 2FA Active' : '○ 2FA Off'}
              </span>
              <span className={user.googleConnected || user.githubConnected ? 'text-emerald-400' : 'text-slate-500'}>
                {user.googleConnected || user.githubConnected ? '✓ OAuth Linked' : '○ No OAuth'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0 ${
            activeTab === 'profile'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <CatAvatarIcon avatarId={user.avatar} size="sm" />
          <span>Profile &amp; Identity</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0 ${
            activeTab === 'security'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Security &amp; Password Hashing</span>
        </button>

        <button
          onClick={() => setActiveTab('oauth')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0 ${
            activeTab === 'oauth'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>OAuth &amp; Linked Providers</span>
        </button>

        <button
          onClick={() => setActiveTab('developer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0 ${
            activeTab === 'developer'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>CatAuth SDK &amp; API Keys</span>
        </button>
      </div>

      {/* Tab 1: Profile & Identity */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm">
            <h2 className="text-lg font-bold text-white mb-1">Edit Feline Profile</h2>
            <p className="text-xs text-slate-400 mb-6">
              Customize how your identity appears across crakkocat.com services and connected subdomains.
            </p>

            <form onSubmit={handleProfileSave} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Feline Handle (Immutable)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`@${user.username}`}
                    className="w-full px-3.5 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-500 text-sm font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Bio &amp; Mission Statement
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell other Catizens about your claws and skills..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Select Feline Avatar
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {AVATAR_OPTIONS.map(av => (
                    <button
                      type="button"
                      key={av.id}
                      onClick={() => setAvatar(av.id)}
                      className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition cursor-pointer ${
                        avatar === av.id
                          ? 'border-cyan-400 bg-cyan-500/10 ring-2 ring-cyan-400/40'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <CatAvatarIcon avatarId={av.id} size="md" />
                      <span className="text-xs font-semibold text-slate-200">{av.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="py-2.5 px-5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl text-sm shadow-md shadow-cyan-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Side Info */}
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Catizen Credentials
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Unique User ID:</span>
                  <span className="font-mono text-slate-300 text-[11px] select-all bg-slate-950 px-2 py-1 rounded block mt-0.5 border border-slate-800">
                    {user.id}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Registered Email:</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-slate-300">{user.email}</span>
                    {user.emailVerified ? (
                      <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        Verified
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        Unverified
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block">Security Architecture:</span>
                  <span className="text-slate-300">
                    Bcrypt Work Factor 12 (4,096 cost iterations)
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-indigo-300 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Feline Verification Status
              </h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                {user.emailVerified
                  ? 'Your account is fully verified. You have authorized clearance to generate production CatAuth API keys and integrate CrakkoCat SSO.'
                  : 'Your email address has not been confirmed yet. Open CatMail to grab your 6-digit confirmation PIN.'}
              </p>
              {!user.emailVerified && (
                <button
                  onClick={() => setIsMailboxOpen(true)}
                  className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Open CatMail Simulator
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Security & Password Hashing */}
      {activeTab === 'security' && (
        <div className="space-y-8">
          {/* Bcrypt Architectural Explainer Card */}
          <div className="bg-gradient-to-r from-slate-950 via-cyan-950/30 to-slate-950 border border-cyan-500/30 rounded-2xl p-6 shadow-lg">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  Cryptographic Hashing Architecture
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  Blowfish-Based Salted Bcrypt (12 Rounds)
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Timing-Safe Constant Comparison Active
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
              CatAuth does not store plaintext passwords under any circumstances. When you register or update your secret password, a unique 128-bit cryptographically secure random salt is generated. The password and salt are hashed through 12 logarithmic rounds (2<sup>12</sup> = 4,096 cost iterations) resisting GPU and ASIC brute-force rainbow table attacks.
            </p>

            <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800/80 font-mono text-[11px] text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="text-cyan-400 font-semibold">Active Hash Format:</span>{' '}
                <span className="text-slate-300">$2a$12$[22-char salt][31-char cipher digest]</span>
              </div>
              <span className="text-[10px] text-slate-500">Node.js Crypto &amp; BcryptJS Engine</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Change Password Form */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm">
              <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                Rotate Feline Password
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                Verifies your old salted hash before computing and persisting the new 12-round bcrypt hash.
              </p>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    New Secret Password (min 8 chars)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="py-2.5 px-5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl text-sm shadow-md shadow-cyan-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {changingPassword ? 'Hashing with Bcrypt...' : 'Update & Re-Hash Password'}
                </button>
              </form>
            </div>

            {/* Two-Factor Authentication Setup */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-cyan-400" />
                    Two-Factor Authentication (2FA)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Adds an extra layer of feline security using standard TOTP algorithms (Google Authenticator, Authy, 1Password).
                  </p>
                </div>

                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                    user.twoFactorEnabled
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {user.twoFactorEnabled ? '2FA ENABLED' : 'DISABLED'}
                </span>
              </div>

              {user.twoFactorEnabled ? (
                <div className="space-y-4 mt-4">
                  <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold">Account Protected by TOTP:</strong>
                      Your account requires a 6-digit one-time code or backup key during password sign-in.
                    </div>
                  </div>

                  <button
                    onClick={handleDisable2FA}
                    className="py-2 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold transition cursor-pointer"
                  >
                    Disable Two-Factor Authentication
                  </button>
                </div>
              ) : settingUp2FA && twoFactorData ? (
                <div className="space-y-4 mt-4 animate-in fade-in">
                  <p className="text-xs text-slate-300">
                    1. Scan this QR code in your authenticator app, or manually enter the key:
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    {/* QR Code SVG */}
                    <div
                      className="w-36 h-36 bg-slate-900 p-2 rounded-lg border border-slate-700 shrink-0 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                      dangerouslySetInnerHTML={{ __html: twoFactorData.qrCodeSvg }}
                    />

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-500 block">Secret Key (Base32):</span>
                        <span className="font-mono text-cyan-400 font-bold text-sm tracking-wider select-all">
                          {twoFactorData.secret}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Compatible with Google Authenticator, Bitwarden, 1Password, Authy.
                      </p>
                    </div>
                  </div>

                  {/* Backup codes preview */}
                  <div>
                    <span className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Emergency Backup Recovery Codes:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] text-cyan-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                      {twoFactorData.backupCodes.map((code, idx) => (
                        <span key={idx}>{code}</span>
                      ))}
                    </div>
                  </div>

                  {/* Verification Form */}
                  <form onSubmit={handleConfirm2FA} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        2. Enter 6-digit verification code from app:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="123456"
                        maxLength={6}
                        value={twoFactorVerifyCode}
                        onChange={e => setTwoFactorVerifyCode(e.target.value)}
                        className="w-full text-center tracking-widest font-mono text-lg py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold rounded-xl text-xs transition cursor-pointer"
                      >
                        Confirm &amp; Activate 2FA
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettingUp2FA(false)}
                        className="px-3 py-2 bg-slate-800 text-slate-400 rounded-xl text-xs transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="mt-4">
                  <button
                    onClick={handleInitiate2FA}
                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white font-semibold rounded-xl text-xs transition cursor-pointer flex items-center gap-2"
                  >
                    <QrCode className="w-4 h-4 text-cyan-400" />
                    <span>Configure TOTP Authenticator</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Active Sessions & Devices */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-cyan-400" />
                  Active Feline Sessions &amp; Terminals
                </h3>
                <p className="text-xs text-slate-400">
                  Manage active browser tokens logged into your account.
                </p>
              </div>

              <button
                onClick={loadSecurityDetails}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title="Refresh sessions"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-slate-800">
              {sessions.map(sess => (
                <div
                  key={sess.id}
                  className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                      <Laptop className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white truncate max-w-xs">
                          {sess.userAgent}
                        </span>
                        {sess.current && (
                          <span className="text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
                            Current Device
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        IP: {sess.ip} • Last active: {new Date(sess.lastActiveAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {!sess.current && (
                    <button
                      onClick={() => handleRevokeSession(sess.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-medium transition cursor-pointer"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Audit Log */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Security Audit Event Log
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Immutable ledger of sign-ins, password rotations, and authorization handshakes.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-mono text-[11px]">
                    <th className="py-2.5 px-3">EVENT ACTION</th>
                    <th className="py-2.5 px-3">DETAILS</th>
                    <th className="py-2.5 px-3">IP ADDRESS</th>
                    <th className="py-2.5 px-3">TIMESTAMP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {auditLogs.slice(0, 10).map(log => (
                    <tr key={log.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-mono font-semibold text-cyan-400">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 max-w-sm truncate">
                        {log.details}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{log.ip}</td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Connected OAuth Providers */}
      {activeTab === 'oauth' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm">
            <h2 className="text-lg font-bold text-white mb-1">OAuth 2.0 Identity Providers</h2>
            <p className="text-xs text-slate-400 mb-6">
              Connect external services for instant 1-click single sign-on across the crakkocat.com ecosystem.
            </p>

            <div className="space-y-4">
              {/* Google Provider Card */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-md shrink-0">
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm">Google Account</h3>
                      {user.googleConnected ? (
                        <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          Connected
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                          Not Linked
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {user.googleConnected
                        ? `Linked as ${user.googleEmail || user.email}`
                        : 'Sign in to crakkocat.com with your Google credentials.'}
                    </p>
                  </div>
                </div>

                {user.googleConnected ? (
                  <button
                    onClick={() => handleUnlinkOAuth('google')}
                    className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-semibold transition cursor-pointer"
                  >
                    Disconnect Google
                  </button>
                ) : (
                  <button
                    onClick={() => startOAuth('google')}
                    className="py-2 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-2"
                  >
                    <span>Connect Google</span>
                  </button>
                )}
              </div>

              {/* GitHub Provider Card */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#24292e] flex items-center justify-center shadow-md shrink-0 border border-slate-700">
                    <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm">GitHub Account</h3>
                      {user.githubConnected ? (
                        <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          Connected
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                          Not Linked
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {user.githubConnected
                        ? `Linked as @${user.githubUsername || user.username}`
                        : 'Sign in to crakkocat.com with your GitHub profile.'}
                    </p>
                  </div>
                </div>

                {user.githubConnected ? (
                  <button
                    onClick={() => handleUnlinkOAuth('github')}
                    className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-semibold transition cursor-pointer"
                  >
                    Disconnect GitHub
                  </button>
                ) : (
                  <button
                    onClick={() => startOAuth('github')}
                    className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-2"
                  >
                    <span>Connect GitHub</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Developer Hub & CatAuth SDK */}
      {activeTab === 'developer' && (
        <div className="space-y-8">
          {/* API Keys */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm">
            <h2 className="text-lg font-bold text-white mb-1">Developer API Keys</h2>
            <p className="text-xs text-slate-400 mb-6">
              Use these live keys to authenticate requests from your external apps or crakkocat.com microservices.
            </p>

            <form onSubmit={handleCreateDevKey} className="flex gap-3 mb-6">
              <input
                type="text"
                placeholder="e.g. CrakkoCat Game Client, Mobile App"
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={creatingKey || !user.emailVerified}
                className="py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl text-xs shadow-md transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Generate Key</span>
              </button>
            </form>

            {!user.emailVerified && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>You must verify your email address before generating live API credentials.</span>
              </div>
            )}

            <div className="space-y-3">
              {devKeys.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  No API keys generated yet.
                </div>
              ) : (
                devKeys.map(k => (
                  <div
                    key={k.id}
                    className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{k.name}</div>
                      <div className="font-mono text-cyan-400 mt-0.5 text-xs select-all">
                        {k.key}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Created {new Date(k.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteDevKey(k.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      title="Revoke Key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Embeddable CatAuth Sign-In Widget Generator */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-cyan-400" />
                  Embeddable CatAuth Sign-In Widget
                </h3>
                <p className="text-xs text-slate-400">
                  Drop this 3-line snippet into any crakkocat.com subdomain or client app.
                </p>
              </div>

              <button
                onClick={copyEmbedCode}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 border border-slate-700"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? 'Copied!' : 'Copy Snippet'}</span>
              </button>
            </div>

            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
              {embedCodeSnippet}
            </pre>

            {/* Interactive Widget Simulator Sandbox */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-300 block mb-2">
                Interactive Test Sandbox (Try embedding CatAuth):
              </span>
              <div className="p-6 bg-slate-950/60 rounded-xl border border-slate-800/80 flex flex-col items-center justify-center text-center gap-3">
                <span className="text-xs text-slate-400">
                  Simulating third-party client: <strong className="text-cyan-400">app.crakkocat.com</strong>
                </span>

                <button
                  onClick={() => {
                    setWidgetAuthResult(`Successfully handshook with CatAuth as ${user.displayName} (${user.email})! Token active.`);
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 hover:opacity-95 text-white font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition cursor-pointer"
                >
                  <span>🐾 Sign In with CatAuth</span>
                </button>

                {widgetAuthResult && (
                  <div className="mt-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-lg animate-in fade-in">
                    ✓ {widgetAuthResult}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
