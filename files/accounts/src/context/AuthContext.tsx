import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, EmailMessage, OAuthConfig } from '../types.ts';
import { api, setStoredToken } from '../lib/api.ts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  config: OAuthConfig | null;
  mailbox: EmailMessage[];
  unreadMailCount: number;
  isMailboxOpen: boolean;
  setIsMailboxOpen: (open: boolean) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'signin' | 'signup' | 'forgot';
  setAuthModalMode: (mode: 'signin' | 'signup' | 'forgot') => void;
  toast: { text: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  refreshUser: () => Promise<void>;
  refreshMailbox: () => Promise<void>;
  login: (data: { identifier: string; password: string }) => Promise<{ requires2FA?: boolean; twoFactorToken?: string }>;
  login2FA: (twoFactorToken: string, code: string) => Promise<void>;
  register: (data: { email: string; password: string; username: string; displayName?: string; avatar?: string }) => Promise<void>;
  logout: () => Promise<void>;
  startOAuth: (provider: 'google' | 'github') => Promise<void>;
  verifyEmail: (params: { code?: string; token?: string }) => Promise<void>;
  resendVerification: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<OAuthConfig | null>(null);
  const [mailbox, setMailbox] = useState<EmailMessage[]>([]);
  const [isMailboxOpen, setIsMailboxOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(prev => (prev?.text === text ? null : prev));
    }, 4500);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.getMe();
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  const refreshMailbox = useCallback(async () => {
    try {
      const data = await api.getMailbox();
      setMailbox(data.emails || []);
    } catch {
      // Ignore
    }
  }, []);

  // Initial bootstrap
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const [cfg] = await Promise.all([
          api.getConfig().catch(() => null),
          refreshUser(),
          refreshMailbox(),
        ]);
        if (mounted && cfg) setConfig(cfg);

        // Check for URL query params (e.g. ?verify_token=... or ?oauth_token=...)
        const urlParams = new URLSearchParams(window.location.search);
        const verifyToken = urlParams.get('verify_token');
        const oauthToken = urlParams.get('oauth_token');

        if (oauthToken) {
          setStoredToken(oauthToken);
          await refreshUser();
          showToast('Signed in via OAuth handshake!', 'success');
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (verifyToken) {
          try {
            const res = await api.verifyEmail({ token: verifyToken });
            setUser(res.user);
            showToast('Email successfully verified! Feline access elevated.', 'success');
          } catch (err: any) {
            showToast(err.message || 'Email verification failed.', 'error');
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();

    return () => {
      mounted = false;
    };
  }, [refreshUser, refreshMailbox, showToast]);

  // Handle postMessage from OAuth popup per oauth-integration skill
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      // Allow localhost, run.app preview domains, and current window origin
      if (
        !origin.endsWith('.run.app') &&
        !origin.includes('localhost') &&
        origin !== window.location.origin
      ) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const providerName = event.data.provider === 'google' ? 'Google' : 'GitHub';
        if (event.data.token) {
          setStoredToken(event.data.token);
        }
        if (event.data.user) {
          setUser(event.data.user);
        }
        setIsAuthModalOpen(false);
        showToast(`Signed in seamlessly with ${providerName}!`, 'success');
        await Promise.all([refreshUser(), refreshMailbox()]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [refreshUser, refreshMailbox, showToast]);

  const login = async (data: { identifier: string; password: string }) => {
    const res = await api.login(data);
    if (res.requires2FA) {
      return { requires2FA: true, twoFactorToken: res.twoFactorToken };
    }
    if (res.user) {
      setUser(res.user);
      setIsAuthModalOpen(false);
      showToast(`Welcome back, ${res.user.displayName}!`, 'success');
      await refreshMailbox();
    }
    return {};
  };

  const login2FA = async (twoFactorToken: string, code: string) => {
    const res = await api.login2FA(twoFactorToken, code);
    setUser(res.user);
    setIsAuthModalOpen(false);
    showToast(`2FA Verified. Welcome, ${res.user.displayName}!`, 'success');
    await refreshMailbox();
  };

  const register = async (data: { email: string; password: string; username: string; displayName?: string; avatar?: string }) => {
    const res = await api.register(data);
    setUser(res.user);
    setIsAuthModalOpen(false);
    showToast('Account created! A verification code was sent to CatMail.', 'success');
    await refreshMailbox();
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    showToast('Signed out of CatAuth successfully.', 'info');
  };

  const startOAuth = async (provider: 'google' | 'github') => {
    try {
      const { url } = await api.getOAuthUrl(provider);

      // Open OAuth in centered popup window
      const width = 560;
      const height = 680;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const authWindow = window.open(
        url,
        `catauth_oauth_${provider}`,
        `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
      );

      if (!authWindow) {
        showToast('Please allow popups to continue OAuth sign-in.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to initiate OAuth.', 'error');
    }
  };

  const verifyEmail = async (params: { code?: string; token?: string }) => {
    const res = await api.verifyEmail(params);
    setUser(res.user);
    showToast(res.message || 'Email verified successfully!', 'success');
    await refreshMailbox();
  };

  const resendVerification = async () => {
    const res = await api.resendVerification();
    showToast(res.message || 'Verification email resent.', 'success');
    await refreshMailbox();
  };

  const unreadMailCount = mailbox.filter(m => !m.read).length;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        config,
        mailbox,
        unreadMailCount,
        isMailboxOpen,
        setIsMailboxOpen,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        toast,
        showToast,
        refreshUser,
        refreshMailbox,
        login,
        login2FA,
        register,
        logout,
        startOAuth,
        verifyEmail,
        resendVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
