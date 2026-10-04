import { User, UserSession, AuditLogItem, EmailMessage, DeveloperKey, TwoFactorSetupData, OAuthConfig } from '../types.ts';

const TOKEN_KEY = 'catauth_session_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  async getConfig(): Promise<OAuthConfig> {
    return request<OAuthConfig>('/api/auth/config');
  },

  async getMe(): Promise<{ authenticated: boolean; user: User | null }> {
    return request<{ authenticated: boolean; user: User | null }>('/api/auth/me');
  },

  async register(body: { email: string; password: string; username: string; displayName?: string; avatar?: string }): Promise<{ success: boolean; user: User; sessionToken: string; message: string }> {
    const res = await request<{ success: boolean; user: User; sessionToken: string; message: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (res.sessionToken) {
      setStoredToken(res.sessionToken);
    }
    return res;
  },

  async login(body: { identifier: string; password: string }): Promise<{ success?: boolean; user?: User; sessionToken?: string; requires2FA?: boolean; twoFactorToken?: string }> {
    const res = await request<{ success?: boolean; user?: User; sessionToken?: string; requires2FA?: boolean; twoFactorToken?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (res.sessionToken) {
      setStoredToken(res.sessionToken);
    }
    return res;
  },

  async login2FA(twoFactorToken: string, code: string): Promise<{ success: boolean; user: User; sessionToken: string }> {
    const res = await request<{ success: boolean; user: User; sessionToken: string }>('/api/auth/login-2fa', {
      method: 'POST',
      body: JSON.stringify({ twoFactorToken, code }),
    });
    if (res.sessionToken) {
      setStoredToken(res.sessionToken);
    }
    return res;
  },

  async logout(): Promise<{ success: boolean }> {
    try {
      await request<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
    return { success: true };
  },

  async verifyEmail(params: { code?: string; token?: string }): Promise<{ success: boolean; message: string; user: User }> {
    return request<{ success: boolean; message: string; user: User }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async resendVerification(): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/api/auth/resend-verification', {
      method: 'POST',
    });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async updateProfile(data: { displayName?: string; avatar?: string; bio?: string }): Promise<{ success: boolean; user: User }> {
    return request<{ success: boolean; user: User }>('/api/auth/update-profile', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async generate2FA(): Promise<TwoFactorSetupData> {
    return request<TwoFactorSetupData>('/api/auth/2fa/generate', { method: 'POST' });
  },

  async enable2FA(code: string): Promise<{ success: boolean; user: User }> {
    return request<{ success: boolean; user: User }>('/api/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  async disable2FA(): Promise<{ success: boolean; user: User }> {
    return request<{ success: boolean; user: User }>('/api/auth/2fa/disable', {
      method: 'POST',
    });
  },

  async getSessions(): Promise<{ sessions: UserSession[] }> {
    return request<{ sessions: UserSession[] }>('/api/auth/sessions');
  },

  async revokeSession(sessionId: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/auth/sessions/${sessionId}`, { method: 'DELETE' });
  },

  async getAuditLog(): Promise<{ logs: AuditLogItem[] }> {
    return request<{ logs: AuditLogItem[] }>('/api/auth/audit-log');
  },

  async getOAuthUrl(provider: 'google' | 'github'): Promise<{ url: string; simulator: boolean; redirectUri: string }> {
    return request<{ url: string; simulator: boolean; redirectUri: string }>(`/api/auth/oauth/${provider}/url`);
  },

  async unlinkOAuth(provider: 'google' | 'github'): Promise<{ success: boolean; user: User }> {
    return request<{ success: boolean; user: User }>(`/api/auth/oauth/${provider}/unlink`, { method: 'POST' });
  },

  async getMailbox(): Promise<{ emails: EmailMessage[] }> {
    return request<{ emails: EmailMessage[] }>('/api/mailbox');
  },

  async deleteMail(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/mailbox/${id}`, { method: 'DELETE' });
  },

  async getDevKeys(): Promise<{ keys: DeveloperKey[] }> {
    return request<{ keys: DeveloperKey[] }>('/api/developer/keys');
  },

  async createDevKey(name: string): Promise<{ key: DeveloperKey }> {
    return request<{ key: DeveloperKey }>('/api/developer/keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async deleteDevKey(keyId: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/developer/keys/${keyId}`, { method: 'DELETE' });
  },
};
