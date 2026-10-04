export type CatRole = 'catizen' | 'guardian' | 'architect';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  role: CatRole;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  googleConnected: boolean;
  googleEmail?: string;
  githubConnected: boolean;
  githubUsername?: string;
  passwordAlgo: string;
  passwordSaltRounds: number;
  createdAt: string;
  lastLoginAt: string;
  securityScore: number;
}

export interface UserSession {
  id: string;
  userId: string;
  userAgent: string;
  ip: string;
  createdAt: string;
  lastActiveAt: string;
  current: boolean;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot';
}

export interface AuditLogItem {
  id: string;
  userId: string;
  action: string;
  details: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  status: 'success' | 'warning' | 'danger';
}

export interface EmailMessage {
  id: string;
  to: string;
  subject: string;
  preview: string;
  htmlContent: string;
  verificationCode?: string;
  verificationToken?: string;
  verificationLink?: string;
  sentAt: string;
  read: boolean;
  type: 'verification' | 'security' | 'welcome' | 'oauth_linked';
}

export interface DeveloperKey {
  id: string;
  name: string;
  key: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
  revoked: boolean;
}

export interface TwoFactorSetupData {
  secret: string;
  otpauthUrl: string;
  qrCodeSvg: string;
  backupCodes: string[];
}

export interface OAuthConfig {
  configured: {
    google: boolean;
    github: boolean;
  };
  simulatorMode: boolean;
  callbackUrl: string;
}
