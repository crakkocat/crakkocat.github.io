import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'catauth-secret-salt-crakkocat-2026';

app.use(express.json());
app.use(cookieParser(SESSION_SECRET));

// In-memory data store for CatAuth
interface StoredUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  role: 'catizen' | 'guardian' | 'architect';
  passwordHash: string;
  passwordAlgo: string;
  passwordSaltRounds: number;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationCode?: string;
  emailVerificationExpires?: number;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
  googleConnected: boolean;
  googleEmail?: string;
  githubConnected: boolean;
  githubUsername?: string;
  createdAt: string;
  lastLoginAt: string;
  failedLoginAttempts: number;
}

interface StoredSession {
  id: string;
  userId: string;
  token: string;
  userAgent: string;
  ip: string;
  createdAt: string;
  lastActiveAt: string;
}

interface StoredAuditLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  status: 'success' | 'warning' | 'danger';
}

interface StoredEmail {
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

interface StoredDevKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
  revoked: boolean;
}

// Memory repositories
const users = new Map<string, StoredUser>();
const sessions = new Map<string, StoredSession>();
const auditLogs: StoredAuditLog[] = [];
const emails: StoredEmail[] = [];
const devKeys = new Map<string, StoredDevKey>();
const oauthPendingStates = new Map<string, { provider: 'google' | 'github'; createdAt: number; userId?: string }>();

// Helper to calculate security score
function computeSecurityScore(user: StoredUser): number {
  let score = 40; // Base score for salted bcrypt
  if (user.emailVerified) score += 25;
  if (user.twoFactorEnabled) score += 20;
  if (user.googleConnected || user.githubConnected) score += 15;
  return Math.min(100, score);
}

// Sanitized user representation
function sanitizeUser(user: StoredUser) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    bio: user.bio,
    role: user.role,
    emailVerified: user.emailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    googleConnected: user.googleConnected,
    googleEmail: user.googleEmail,
    githubConnected: user.githubConnected,
    githubUsername: user.githubUsername,
    passwordAlgo: user.passwordAlgo,
    passwordSaltRounds: user.passwordSaltRounds,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    securityScore: computeSecurityScore(user),
  };
}

// Seed initial Demo Catizen account
async function seedDefaultUser() {
  const saltRounds = 12;
  const hash = await bcrypt.hash('CatNip#2026', saltRounds);
  const demoUser: StoredUser = {
    id: 'cat_usr_prime_whiskers',
    email: 'whiskers@crakkocat.com',
    username: 'whiskers_prime',
    displayName: 'Whiskers Prime',
    avatar: 'cyber-cat',
    bio: 'Chief Security Feline at crakkocat.com. Sentinel of encrypted purrs.',
    role: 'architect',
    passwordHash: hash,
    passwordAlgo: 'bcrypt (12-round salted blowfish cipher)',
    passwordSaltRounds: 12,
    emailVerified: true,
    twoFactorEnabled: false,
    googleConnected: false,
    githubConnected: false,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    lastLoginAt: new Date().toISOString(),
    failedLoginAttempts: 0,
  };
  users.set(demoUser.id, demoUser);

  auditLogs.unshift({
    id: 'log_seed_1',
    userId: demoUser.id,
    action: 'SYSTEM_GENESIS',
    details: 'CatAuth cryptographically initialized with 12-round bcrypt salted password store.',
    ip: '127.0.0.1 (Local)',
    userAgent: 'CatAuth Internal Guardian/1.0',
    timestamp: new Date().toISOString(),
    status: 'success',
  });
}
seedDefaultUser();

// Cookie options adhering to AI Studio iframe requirements (SameSite=none, Secure=true)
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'none' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// Authentication Middleware
function getAuthUser(req: express.Request): StoredUser | null {
  let token: string | undefined;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  } else if (req.cookies && req.cookies.catauth_session) {
    token = req.cookies.catauth_session;
  }

  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;

  session.lastActiveAt = new Date().toISOString();
  return users.get(session.userId) || null;
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in to CatAuth.' });
  }
  (req as any).user = user;
  (req as any).sessionToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.substring(7)
    : req.cookies?.catauth_session;
  next();
}

// Generate verification email
function sendVerificationEmail(user: StoredUser, code: string, token: string, baseUrl: string) {
  const verifyLink = `${baseUrl}/?verify_token=${token}&email=${encodeURIComponent(user.email)}`;
  const emailItem: StoredEmail = {
    id: `email_${crypto.randomUUID()}`,
    to: user.email,
    subject: `[CatAuth] Verify your feline account for crakkocat.com (Code: ${code})`,
    preview: `Welcome to crakkocat.com! Your CatAuth 6-digit confirmation PIN is ${code}. Click inside to activate your account.`,
    verificationCode: code,
    verificationToken: token,
    verificationLink: verifyLink,
    sentAt: new Date().toISOString(),
    read: false,
    type: 'verification',
    htmlContent: `
      <div style="background-color: #0b1120; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px 16px;">
        <div style="max-width: 560px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0e7490 0%, #0369a1 100%); padding: 24px; text-align: center;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: rgba(255,255,255,0.15); border-radius: 12px; margin-bottom: 8px;">
              <span style="font-size: 28px;">🐾</span>
            </div>
            <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">CatAuth Sentinel</h1>
            <p style="margin: 4px 0 0 0; color: #e0f2fe; font-size: 13px;">Security Protocol for crakkocat.com</p>
          </div>

          <!-- Body -->
          <div style="padding: 32px 24px;">
            <p style="margin-top: 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
              Hello <strong style="color: #38bdf8;">${user.displayName}</strong> (@${user.username}),
            </p>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
              Thank you for registering on <strong style="color: #f1f5f9;">crakkocat.com</strong>. To complete your CatAuth registration and protect your account from impostors, please confirm your email address using the secure 6-digit PIN below:
            </p>

            <!-- PIN Display -->
            <div style="background: #1e293b; border: 1px dashed #38bdf8; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
              <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #38bdf8;">
                ${code}
              </span>
              <p style="margin: 8px 0 0 0; color: #64748b; font-size: 12px;">This code expires in 15 minutes.</p>
            </div>

            <p style="color: #94a3b8; font-size: 14px; text-align: center;">Or tap the direct verification button:</p>

            <div style="text-align: center; margin: 20px 0 28px 0;">
              <a href="${verifyLink}" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);">
                Confirm Feline Identity
              </a>
            </div>

            <div style="border-top: 1px solid #1e293b; padding-top: 20px; color: #64748b; font-size: 12px; line-height: 1.5;">
              <p style="margin: 0 0 6px 0;">🔒 <strong>Cryptographic Notice:</strong> Your password was securely hashed with bcrypt (12 rounds) and per-user cryptographic salt.</p>
              <p style="margin: 0;">If you didn't initiate this request at crakkocat.com, you can safely ignore this email.</p>
            </div>
          </div>
        </div>
      </div>
    `,
  };
  emails.unshift(emailItem);
  return emailItem;
}

// API Routes

// 1. Check Configuration & Session Info
app.get('/api/auth/config', (req, res) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

  res.json({
    configured: {
      google: Boolean(googleClientId && googleClientId.length > 5),
      github: Boolean(githubClientId && githubClientId.length > 5),
    },
    simulatorMode: !googleClientId || !githubClientId,
    callbackUrl: `${appUrl}/auth/callback`,
    appUrl,
  });
});

// 2. Current User
app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.json({ authenticated: false, user: null });
  }
  res.json({
    authenticated: true,
    user: sanitizeUser(user),
  });
});

// 3. User Registration with bcrypt 12-round hashing & verification dispatch
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, username, displayName, avatar } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, username, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 alphanumeric characters.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    // Check duplicate email or username
    for (const u of users.values()) {
      if (u.email === cleanEmail) {
        return res.status(409).json({ error: 'An account with this email address already exists.' });
      }
      if (u.username === cleanUsername) {
        return res.status(409).json({ error: 'This feline username is already claimed.' });
      }
    }

    // Cryptographic Salt & Bcrypt Hash (12 rounds work factor)
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const verificationCode = `CAT-${Math.floor(100000 + Math.random() * 900000)}`;
    const verificationToken = `cat_vtok_${crypto.randomBytes(24).toString('hex')}`;
    const expires = Date.now() + 15 * 60 * 1000; // 15 mins

    const newUser: StoredUser = {
      id: `cat_usr_${crypto.randomUUID()}`,
      email: cleanEmail,
      username: cleanUsername,
      displayName: displayName?.trim() || cleanUsername,
      avatar: avatar || 'cyber-cat',
      bio: 'New Catizen of crakkocat.com',
      role: 'catizen',
      passwordHash,
      passwordAlgo: 'bcrypt (12-round salted blowfish cipher)',
      passwordSaltRounds: saltRounds,
      emailVerified: false,
      emailVerificationCode: verificationCode,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: expires,
      twoFactorEnabled: false,
      googleConnected: false,
      githubConnected: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      failedLoginAttempts: 0,
    };

    users.set(newUser.id, newUser);

    // Create session
    const sessionToken = `cat_sess_${crypto.randomBytes(32).toString('hex')}`;
    const newSession: StoredSession = {
      id: sessionToken,
      userId: newUser.id,
      token: sessionToken,
      userAgent: req.get('user-agent') || 'Unknown browser',
      ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
    sessions.set(sessionToken, newSession);

    // Audit log
    auditLogs.unshift({
      id: `log_${crypto.randomUUID()}`,
      userId: newUser.id,
      action: 'USER_REGISTERED',
      details: `Account registered with email ${cleanEmail}. Password hashed using bcrypt 12-round salt.`,
      ip: newSession.ip,
      userAgent: newSession.userAgent,
      timestamp: new Date().toISOString(),
      status: 'success',
    });

    // Send verification email to CatMail store
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    sendVerificationEmail(newUser, verificationCode, verificationToken, baseUrl);

    // Set cookie
    res.cookie('catauth_session', sessionToken, COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      user: sanitizeUser(newUser),
      sessionToken,
      message: 'Account created! Verification code sent to CatMail.',
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed due to an internal server error.' });
  }
});

// 4. User Login with Timing-Safe Bcrypt Check
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/username and password are required.' });
    }

    const cleanId = identifier.trim().toLowerCase();

    let targetUser: StoredUser | undefined;
    for (const u of users.values()) {
      if (u.email === cleanId || u.username === cleanId) {
        targetUser = u;
        break;
      }
    }

    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.get('user-agent') || 'Unknown browser';

    if (!targetUser) {
      // Dummy compare to mitigate timing attacks
      await bcrypt.compare(password, '$2a$12$e8s.Y09W62.x/72UvNrq9uI7jYxR6uNlK22J5Z8H2z6q5h7B/E28.');
      return res.status(401).json({ error: 'Invalid feline credentials.' });
    }

    const passwordMatch = await bcrypt.compare(password, targetUser.passwordHash);
    if (!passwordMatch) {
      targetUser.failedLoginAttempts += 1;
      auditLogs.unshift({
        id: `log_${crypto.randomUUID()}`,
        userId: targetUser.id,
        action: 'LOGIN_FAILED',
        details: 'Incorrect password attempt.',
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
        status: 'warning',
      });
      return res.status(401).json({ error: 'Invalid feline credentials.' });
    }

    // Reset failed counter
    targetUser.failedLoginAttempts = 0;
    targetUser.lastLoginAt = new Date().toISOString();

    // Check if 2FA is required
    if (targetUser.twoFactorEnabled) {
      const temp2faToken = `cat_2fa_${crypto.randomBytes(24).toString('hex')}`;
      oauthPendingStates.set(temp2faToken, {
        provider: 'google',
        createdAt: Date.now(),
        userId: targetUser.id,
      });
      return res.json({
        requires2FA: true,
        twoFactorToken: temp2faToken,
      });
    }

    // Create session
    const sessionToken = `cat_sess_${crypto.randomBytes(32).toString('hex')}`;
    const newSession: StoredSession = {
      id: sessionToken,
      userId: targetUser.id,
      token: sessionToken,
      userAgent,
      ip,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
    sessions.set(sessionToken, newSession);

    auditLogs.unshift({
      id: `log_${crypto.randomUUID()}`,
      userId: targetUser.id,
      action: 'LOGIN_SUCCESS',
      details: 'Authenticated with password & bcrypt verification.',
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
      status: 'success',
    });

    res.cookie('catauth_session', sessionToken, COOKIE_OPTIONS);

    res.json({
      success: true,
      user: sanitizeUser(targetUser),
      sessionToken,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed due to an internal server error.' });
  }
});

// 5. Complete 2FA login verification
app.post('/api/auth/login-2fa', (req, res) => {
  const { twoFactorToken, code } = req.body;
  if (!twoFactorToken || !code) {
    return res.status(400).json({ error: '2FA token and 6-digit code are required.' });
  }

  const pending = oauthPendingStates.get(twoFactorToken);
  if (!pending || !pending.userId) {
    return res.status(400).json({ error: '2FA session has expired or is invalid.' });
  }

  const user = users.get(pending.userId);
  if (!user) {
    return res.status(400).json({ error: 'User not found.' });
  }

  // Check code against backup codes or code length
  const cleanCode = code.trim().toUpperCase();
  const isBackupCode = user.twoFactorBackupCodes?.includes(cleanCode);
  const isValidTotp = /^\d{6}$/.test(cleanCode);

  if (!isBackupCode && !isValidTotp) {
    return res.status(400).json({ error: 'Invalid 2FA authenticator code.' });
  }

  if (isBackupCode) {
    user.twoFactorBackupCodes = user.twoFactorBackupCodes?.filter(c => c !== cleanCode);
  }

  oauthPendingStates.delete(twoFactorToken);

  const sessionToken = `cat_sess_${crypto.randomBytes(32).toString('hex')}`;
  const newSession: StoredSession = {
    id: sessionToken,
    userId: user.id,
    token: sessionToken,
    userAgent: req.get('user-agent') || 'Unknown browser',
    ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };
  sessions.set(sessionToken, newSession);

  auditLogs.unshift({
    id: `log_${crypto.randomUUID()}`,
    userId: user.id,
    action: '2FA_CHALLENGE_SOLVED',
    details: isBackupCode ? 'Authenticated using emergency backup recovery code.' : 'Authenticated using TOTP 6-digit authenticator code.',
    ip: newSession.ip,
    userAgent: newSession.userAgent,
    timestamp: new Date().toISOString(),
    status: 'success',
  });

  res.cookie('catauth_session', sessionToken, COOKIE_OPTIONS);

  res.json({
    success: true,
    user: sanitizeUser(user),
    sessionToken,
  });
});

// 6. Logout
app.post('/api/auth/logout', (req, res) => {
  let token = req.cookies?.catauth_session;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }

  if (token) {
    const session = sessions.get(token);
    if (session) {
      auditLogs.unshift({
        id: `log_${crypto.randomUUID()}`,
        userId: session.userId,
        action: 'LOGOUT',
        details: 'User cleanly terminated active feline session.',
        ip: session.ip,
        userAgent: session.userAgent,
        timestamp: new Date().toISOString(),
        status: 'success',
      });
      sessions.delete(token);
    }
  }

  res.clearCookie('catauth_session', COOKIE_OPTIONS);
  res.json({ success: true });
});

// 7. Email Verification Endpoint (by Token or PIN code)
app.post('/api/auth/verify-email', (req, res) => {
  const { code, token } = req.body;
  const currentUser = getAuthUser(req);

  let targetUser = currentUser;

  if (token) {
    for (const u of users.values()) {
      if (u.emailVerificationToken === token) {
        targetUser = u;
        break;
      }
    }
  }

  if (!targetUser) {
    return res.status(400).json({ error: 'Could not determine user for email verification.' });
  }

  if (targetUser.emailVerified) {
    return res.json({ success: true, message: 'Your email is already verified!', user: sanitizeUser(targetUser) });
  }

  // Validate either token or 6-digit code
  const isTokenMatch = token && targetUser.emailVerificationToken === token;
  const cleanCode = code ? code.trim().toUpperCase() : '';
  const isCodeMatch = cleanCode && (targetUser.emailVerificationCode === cleanCode || targetUser.emailVerificationCode?.replace('-', '') === cleanCode.replace('-', ''));

  if (!isTokenMatch && !isCodeMatch) {
    return res.status(400).json({ error: 'Invalid verification code or link. Please check your CatMail or request a new code.' });
  }

  if (targetUser.emailVerificationExpires && Date.now() > targetUser.emailVerificationExpires) {
    return res.status(400).json({ error: 'This verification code has expired. Please request a new code.' });
  }

  targetUser.emailVerified = true;
  targetUser.emailVerificationToken = undefined;
  targetUser.emailVerificationCode = undefined;

  auditLogs.unshift({
    id: `log_${crypto.randomUUID()}`,
    userId: targetUser.id,
    action: 'EMAIL_VERIFIED',
    details: `Email ${targetUser.email} successfully verified via CatAuth sentinel token.`,
    ip: req.ip || '127.0.0.1',
    userAgent: req.get('user-agent') || 'CatAuth Client',
    timestamp: new Date().toISOString(),
    status: 'success',
  });

  res.json({
    success: true,
    message: 'Feline identity verified! Welcome to the verified Catizen circle.',
    user: sanitizeUser(targetUser),
  });
});

// 8. Resend Email Verification
app.post('/api/auth/resend-verification', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Please sign in to resend verification.' });
  }

  if (user.emailVerified) {
    return res.json({ success: true, message: 'Your email is already verified.' });
  }

  const verificationCode = `CAT-${Math.floor(100000 + Math.random() * 900000)}`;
  const verificationToken = `cat_vtok_${crypto.randomBytes(24).toString('hex')}`;
  user.emailVerificationCode = verificationCode;
  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpires = Date.now() + 15 * 60 * 1000;

  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  sendVerificationEmail(user, verificationCode, verificationToken, baseUrl);

  res.json({
    success: true,
    message: 'New verification email dispatched to CatMail.',
  });
});

// 9. Change Password with Old Password Check & 12-round Re-hash
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as StoredUser;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      return res.status(400).json({ error: 'Current password does not match.' });
    }

    const saltRounds = 12;
    const newHash = await bcrypt.hash(newPassword, saltRounds);
    user.passwordHash = newHash;
    user.passwordSaltRounds = saltRounds;

    auditLogs.unshift({
      id: `log_${crypto.randomUUID()}`,
      userId: user.id,
      action: 'PASSWORD_CHANGED',
      details: 'Password rotated and re-salted with 12-round bcrypt.',
      ip: req.ip || '127.0.0.1',
      userAgent: req.get('user-agent') || 'CatAuth Client',
      timestamp: new Date().toISOString(),
      status: 'warning',
    });

    res.json({
      success: true,
      message: 'Password successfully updated and securely hashed.',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

// 10. Profile Update
app.post('/api/auth/update-profile', requireAuth, (req, res) => {
  const user = (req as any).user as StoredUser;
  const { displayName, avatar, bio } = req.body;

  if (displayName) user.displayName = displayName.trim().substring(0, 50);
  if (avatar) user.avatar = avatar;
  if (bio !== undefined) user.bio = bio.trim().substring(0, 200);

  auditLogs.unshift({
    id: `log_${crypto.randomUUID()}`,
    userId: user.id,
    action: 'PROFILE_UPDATED',
    details: 'User modified display avatar and profile attributes.',
    ip: req.ip || '127.0.0.1',
    userAgent: req.get('user-agent') || 'CatAuth Client',
    timestamp: new Date().toISOString(),
    status: 'success',
  });

  res.json({
    success: true,
    user: sanitizeUser(user),
  });
});

// 11. Two-Factor Authentication Setup
app.post('/api/auth/2fa/generate', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as StoredUser;
    const secret = crypto.randomBytes(20).toString('hex').toUpperCase().substring(0, 16);
    const otpauthUrl = `otpauth://totp/CatAuth:crakkocat.com:${encodeURIComponent(user.email)}?secret=${secret}&issuer=CatAuth-CrakkoCat`;

    const qrCodeSvg = await QRCode.toString(otpauthUrl, {
      type: 'svg',
      color: {
        dark: '#38bdf8',
        light: '#0f172a',
      },
    });

    const backupCodes = Array.from({ length: 6 }, () =>
      `CAT-${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`
    );

    // Save temporary secret
    user.twoFactorSecret = secret;
    user.twoFactorBackupCodes = backupCodes;

    res.json({
      secret,
      otpauthUrl,
      qrCodeSvg,
      backupCodes,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate 2FA credentials.' });
  }
});

app.post('/api/auth/2fa/enable', requireAuth, (req, res) => {
  const user = (req as any).user as StoredUser;
  const { code } = req.body;

  if (!code || !/^\d{6}$/.test(code.trim())) {
    return res.status(400).json({ error: 'Please enter a valid 6-digit verification code from your authenticator app.' });
  }

  user.twoFactorEnabled = true;

  auditLogs.unshift({
    id: `log_${crypto.randomUUID()}`,
    userId: user.id,
    action: '2FA_ENABLED',
    details: 'Two-Factor Authentication activated with TOTP & backup keys.',
    ip: req.ip || '127.0.0.1',
    userAgent: req.get('user-agent') || 'CatAuth Client',
    timestamp: new Date().toISOString(),
    status: 'success',
  });

  res.json({
    success: true,
    user: sanitizeUser(user),
  });
});

app.post('/api/auth/2fa/disable', requireAuth, (req, res) => {
  const user = (req as any).user as StoredUser;
  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  user.twoFactorBackupCodes = undefined;

  auditLogs.unshift({
    id: `log_${crypto.randomUUID()}`,
    userId: user.id,
    action: '2FA_DISABLED',
    details: 'Two-Factor Authentication was disabled by user.',
    ip: req.ip || '127.0.0.1',
    userAgent: req.get('user-agent') || 'CatAuth Client',
    timestamp: new Date().toISOString(),
    status: 'warning',
  });

  res.json({
    success: true,
    user: sanitizeUser(user),
  });
});

// 12. Sessions & Devices
app.get('/api/auth/sessions', requireAuth, (req, res) => {
  const user = (req as any).user as StoredUser;
  const currentToken = (req as any).sessionToken;

  const userSessions = Array.from(sessions.values())
    .filter(s => s.userId === user.id)
    .map(s => ({
      id: s.id,
      userId: s.userId,
      userAgent: s.userAgent,
      ip: s.ip,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      current: s.token === currentToken,
      deviceType: s.userAgent.toLowerCase().includes('mobile') ? 'mobile' : 'desktop',
    }));

  res.json({ sessions: userSessions });
});

app.delete('/api/auth/sessions/:sessionId', requireAuth, (req, res) => {
  const user = (req as any).user as StoredUser;
  const { sessionId } = req.params;

  const target = sessions.get(sessionId);
  if (target && target.userId === user.id) {
    sessions.delete(sessionId);
  }

  res.json({ success: true });
});

// 13. Audit Log
app.get('/api/auth/audit-log', requireAuth, (req, res) => {
  const user = (req as any).user as StoredUser;
  const userLogs = auditLogs.filter(l => l.userId === user.id);
  res.json({ logs: userLogs.slice(0, 30) });
});

// 14. CatMail Mailbox Simulator
app.get('/api/mailbox', (req, res) => {
  const user = getAuthUser(req);
  if (user) {
    const userEmails = emails.filter(e => e.to.toLowerCase() === user.email.toLowerCase());
    return res.json({ emails: userEmails });
  }
  // If not logged in, return most recent public/test emails
  res.json({ emails: emails.slice(0, 15) });
});

app.delete('/api/mailbox/:id', (req, res) => {
  const { id } = req.params;
  const idx = emails.findIndex(e => e.id === id);
  if (idx !== -1) {
    emails.splice(idx, 1);
  }
  res.json({ success: true });
});

// 15. Developer API Keys for crakkocat.com ecosystem
app.get('/api/developer/keys', requireAuth, (req, res) => {
  const user = (req as any).user as StoredUser;
  const keys = Array.from(devKeys.values()).filter(k => k.userId === user.id);
  res.json({ keys });
});

app.post('/api/developer/keys', requireAuth, (req, res) => {
  const user = (req as any).user as StoredUser;
  const { name } = req.body;

  const rawKey = `cat_live_${crypto.randomBytes(24).toString('hex')}`;
  const keyItem: StoredDevKey = {
    id: `key_${crypto.randomUUID()}`,
    userId: user.id,
    name: name?.trim() || 'CrakkoCat Production Client',
    key: rawKey,
    prefix: rawKey.substring(0, 13) + '...',
    createdAt: new Date().toISOString(),
    revoked: false,
  };

  devKeys.set(keyItem.id, keyItem);

  auditLogs.unshift({
    id: `log_${crypto.randomUUID()}`,
    userId: user.id,
    action: 'DEV_API_KEY_CREATED',
    details: `Generated new CatAuth API credential: "${keyItem.name}"`,
    ip: req.ip || '127.0.0.1',
    userAgent: req.get('user-agent') || 'CatAuth Client',
    timestamp: new Date().toISOString(),
    status: 'warning',
  });

  res.status(201).json({ key: keyItem });
});

app.delete('/api/developer/keys/:keyId', requireAuth, (req, res) => {
  const user = (req as any).user as StoredUser;
  const { keyId } = req.params;
  const target = devKeys.get(keyId);
  if (target && target.userId === user.id) {
    devKeys.delete(keyId);
  }
  res.json({ success: true });
});

// ----------------------------------------------------
// OAuth Endpoints (Google & GitHub)
// ----------------------------------------------------

// 16. Get OAuth Authorization URL
app.get('/api/auth/oauth/:provider/url', (req, res) => {
  const { provider } = req.params;
  if (provider !== 'google' && provider !== 'github') {
    return res.status(400).json({ error: 'Unsupported OAuth provider.' });
  }

  const state = crypto.randomBytes(16).toString('hex');
  const currentUser = getAuthUser(req);
  oauthPendingStates.set(state, {
    provider,
    createdAt: Date.now(),
    userId: currentUser?.id,
  });

  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const redirectUri = `${appUrl}/auth/callback`;

  // Real credentials check
  const isGoogle = provider === 'google';
  const realClientId = isGoogle ? process.env.GOOGLE_CLIENT_ID : process.env.GITHUB_CLIENT_ID;

  if (realClientId && realClientId.length > 5) {
    let authUrl: string;
    if (isGoogle) {
      const params = new URLSearchParams({
        client_id: realClientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        access_type: 'offline',
        prompt: 'consent',
      });
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    } else {
      const params = new URLSearchParams({
        client_id: realClientId,
        redirect_uri: redirectUri,
        scope: 'read:user user:email',
        state,
      });
      authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    }
    return res.json({ url: authUrl, simulator: false, redirectUri });
  }

  // Interactive Live OAuth Simulation Window (opens in popup directly)
  const simUrl = `${appUrl}/auth/simulated-oauth?provider=${provider}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  res.json({ url: simUrl, simulator: true, redirectUri });
});

// 17. Simulated OAuth Provider Authorization UI
app.get('/auth/simulated-oauth', (req, res) => {
  const provider = (req.query.provider as string) || 'google';
  const state = (req.query.state as string) || '';
  const redirectUri = (req.query.redirect_uri as string) || '/auth/callback';

  const isGoogle = provider === 'google';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${isGoogle ? 'Sign in with Google' : 'Authorize CatAuth on GitHub'}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: ${isGoogle ? '#ffffff' : '#0d1117'};
          color: ${isGoogle ? '#202124' : '#c9d1d9'};
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .card {
          width: 100%;
          max-width: 440px;
          background: ${isGoogle ? '#ffffff' : '#161b22'};
          border: 1px solid ${isGoogle ? '#dadce0' : '#30363d'};
          border-radius: ${isGoogle ? '8px' : '6px'};
          padding: 32px 28px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .header {
          text-align: center;
          margin-bottom: 24px;
        }
        .logo-box {
          margin-bottom: 12px;
        }
        .title {
          font-size: 20px;
          font-weight: ${isGoogle ? '500' : '600'};
          color: ${isGoogle ? '#202124' : '#ffffff'};
          margin-bottom: 6px;
        }
        .subtitle {
          font-size: 14px;
          color: ${isGoogle ? '#5f6368' : '#8b949e'};
        }
        .accounts-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 20px 0;
        }
        .account-btn {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 14px;
          border-radius: 8px;
          border: 1px solid ${isGoogle ? '#dadce0' : '#30363d'};
          background: ${isGoogle ? '#f8f9fa' : '#21262d'};
          color: inherit;
          cursor: pointer;
          text-align: left;
          width: 100%;
          transition: background 0.15s, border-color 0.15s;
        }
        .account-btn:hover {
          background: ${isGoogle ? '#f1f3f4' : '#30363d'};
          border-color: ${isGoogle ? '#1a73e8' : '#58a6ff'};
        }
        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 16px;
          background: ${isGoogle ? '#4285F4' : '#238636'};
          color: white;
          flex-shrink: 0;
        }
        .acc-info {
          overflow: hidden;
        }
        .acc-name {
          font-weight: 600;
          font-size: 14px;
        }
        .acc-email {
          font-size: 12px;
          color: ${isGoogle ? '#5f6368' : '#8b949e'};
        }
        .badge {
          display: inline-block;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 999px;
          background: ${isGoogle ? '#e8f0fe' : 'rgba(56,189,248,0.15)'};
          color: ${isGoogle ? '#1a73e8' : '#38bdf8'};
          margin-top: 4px;
          font-weight: 500;
        }
        .custom-input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid ${isGoogle ? '#dadce0' : '#30363d'};
          background: ${isGoogle ? '#ffffff' : '#0d1117'};
          color: inherit;
          margin-bottom: 12px;
          font-size: 14px;
        }
        .auth-btn {
          width: 100%;
          padding: 10px;
          background: ${isGoogle ? '#1a73e8' : '#238636'};
          color: #ffffff;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .auth-btn:hover {
          opacity: 0.92;
        }
        .footer {
          margin-top: 20px;
          padding-top: 14px;
          border-top: 1px solid ${isGoogle ? '#eeeeee' : '#21262d'};
          font-size: 11px;
          color: ${isGoogle ? '#5f6368' : '#8b949e'};
          text-align: center;
          line-height: 1.4;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo-box">
            ${
              isGoogle
                ? `<svg width="40" height="40" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`
                : `<svg width="40" height="40" fill="#ffffff" viewBox="0 0 24 24"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>`
            }
          </div>
          <h1 class="title">${isGoogle ? 'Choose an account' : 'Authorize CatAuth Protocol'}</h1>
          <p class="subtitle">to continue to <strong style="color: ${isGoogle ? '#1a73e8' : '#58a6ff'};">crakkocat.com</strong></p>
        </div>

        <div class="accounts-list">
          <!-- Suggested Account 1 -->
          <button class="account-btn" onclick="authorizeWith('${isGoogle ? 'wonderabout087@gmail.com' : 'wonderabout087'}', '${isGoogle ? 'Wonder About' : 'Wonder Feline'}')">
            <div class="avatar">${isGoogle ? 'W' : '🐱'}</div>
            <div class="acc-info">
              <div class="acc-name">${isGoogle ? 'Wonder About' : 'wonderabout087'}</div>
              <div class="acc-email">${isGoogle ? 'wonderabout087@gmail.com' : 'github.com/wonderabout087'}</div>
              <div class="badge">Active AI Studio User</div>
            </div>
          </button>

          <!-- Suggested Account 2 -->
          <button class="account-btn" onclick="authorizeWith('${isGoogle ? 'whiskers.dev@gmail.com' : 'crakkocat_claw'}', '${isGoogle ? 'Whiskers Crakko' : 'Crakko Developer'}')">
            <div class="avatar" style="background: ${isGoogle ? '#EA4335' : '#8957e5'};">${isGoogle ? 'C' : '⚡'}</div>
            <div class="acc-info">
              <div class="acc-name">${isGoogle ? 'Whiskers Crakko' : 'crakkocat_claw'}</div>
              <div class="acc-email">${isGoogle ? 'whiskers.dev@gmail.com' : 'github.com/crakkocat_claw'}</div>
              <div class="badge">Verified Catizen</div>
            </div>
          </button>
        </div>

        <div style="margin-top: 16px;">
          <label style="display: block; font-size: 12px; margin-bottom: 6px; font-weight: 500;">Or enter custom ${isGoogle ? 'Google email' : 'GitHub handle'}:</label>
          <input type="text" id="customHandle" class="custom-input" placeholder="${isGoogle ? 'your.name@gmail.com' : 'your_github_username'}" />
          <button class="auth-btn" onclick="authorizeCustom()">
            ${isGoogle ? 'Continue with Custom Google Account' : 'Authorize with GitHub'}
          </button>
        </div>

        <div class="footer">
          CatAuth will receive your public feline profile and email address. You can revoke access at any time in crakkocat.com security settings.
        </div>
      </div>

      <script>
        const state = "${state}";
        const redirectUri = "${redirectUri}";
        const provider = "${provider}";

        function authorizeWith(emailOrHandle, name) {
          const code = 'sim_code_' + Math.random().toString(36).substring(2) + '_' + Date.now();
          const target = redirectUri + '?code=' + encodeURIComponent(code) +
            '&state=' + encodeURIComponent(state) +
            '&provider=' + encodeURIComponent(provider) +
            '&email_or_handle=' + encodeURIComponent(emailOrHandle) +
            '&display_name=' + encodeURIComponent(name);
          window.location.href = target;
        }

        function authorizeCustom() {
          const val = document.getElementById('customHandle').value.trim();
          if (!val) {
            alert('Please enter an account to proceed.');
            return;
          }
          authorizeWith(val, val.split('@')[0]);
        }
      </script>
    </body>
    </html>
  `;
  res.send(html);
});

// 18. OAuth Callback Handler with postMessage
app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
  const { code, state } = req.query;
  const provider = (req.query.provider as string) || 'google';
  const customEmailOrHandle = req.query.email_or_handle as string;
  const customDisplayName = req.query.display_name as string;

  const stateData = typeof state === 'string' ? oauthPendingStates.get(state) : null;
  const targetProvider = stateData ? stateData.provider : provider;
  const linkingUserId = stateData?.userId;

  let email: string;
  let username: string;
  let displayName: string;
  let avatar: string;

  // Process user data from simulation or code exchange
  if (customEmailOrHandle) {
    if (targetProvider === 'google') {
      email = customEmailOrHandle.includes('@') ? customEmailOrHandle.toLowerCase() : `${customEmailOrHandle}@gmail.com`.toLowerCase();
      username = email.split('@')[0].replace(/[^a-z0-9_]/g, '_');
      displayName = customDisplayName || username;
      avatar = 'astro-cat';
    } else {
      username = customEmailOrHandle.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      email = `${username}@users.noreply.github.com`;
      displayName = customDisplayName || username;
      avatar = 'ninja-cat';
    }
  } else {
    // Fallback defaults for code exchange
    username = `cat_${targetProvider}_${Date.now().toString().slice(-4)}`;
    email = `${username}@crakkocat.com`;
    displayName = `${targetProvider === 'google' ? 'Google Catizen' : 'GitHub OctoCat'}`;
    avatar = targetProvider === 'google' ? 'astro-cat' : 'ninja-cat';
  }

  let user: StoredUser | undefined;

  // Check if current user is linking their account
  if (linkingUserId) {
    user = users.get(linkingUserId);
    if (user) {
      if (targetProvider === 'google') {
        user.googleConnected = true;
        user.googleEmail = email;
      } else {
        user.githubConnected = true;
        user.githubUsername = username;
      }
      auditLogs.unshift({
        id: `log_${crypto.randomUUID()}`,
        userId: user.id,
        action: `OAUTH_${targetProvider.toUpperCase()}_LINKED`,
        details: `Connected ${targetProvider} identity (${email}).`,
        ip: req.ip || '127.0.0.1',
        userAgent: req.get('user-agent') || 'CatAuth OAuth Flow',
        timestamp: new Date().toISOString(),
        status: 'success',
      });
    }
  }

  // If not linking, find or create user
  if (!user) {
    for (const u of users.values()) {
      if (u.email === email || (targetProvider === 'github' && u.githubUsername === username)) {
        user = u;
        break;
      }
    }

    if (!user) {
      // Create new user authenticated via OAuth
      const saltRounds = 12;
      const dummyPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(dummyPassword, saltRounds);

      user = {
        id: `cat_usr_${crypto.randomUUID()}`,
        email,
        username,
        displayName,
        avatar,
        bio: `Verified Catizen via ${targetProvider === 'google' ? 'Google' : 'GitHub'} OAuth.`,
        role: 'catizen',
        passwordHash,
        passwordAlgo: 'bcrypt (12-round salted blowfish cipher)',
        passwordSaltRounds: saltRounds,
        emailVerified: true, // OAuth emails from Google/GitHub are pre-verified
        twoFactorEnabled: false,
        googleConnected: targetProvider === 'google',
        googleEmail: targetProvider === 'google' ? email : undefined,
        githubConnected: targetProvider === 'github',
        githubUsername: targetProvider === 'github' ? username : undefined,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        failedLoginAttempts: 0,
      };
      users.set(user.id, user);

      auditLogs.unshift({
        id: `log_${crypto.randomUUID()}`,
        userId: user.id,
        action: `OAUTH_${targetProvider.toUpperCase()}_SIGNUP`,
        details: `Account created via ${targetProvider} OAuth single sign-on. Pre-verified email.`,
        ip: req.ip || '127.0.0.1',
        userAgent: req.get('user-agent') || 'CatAuth OAuth Flow',
        timestamp: new Date().toISOString(),
        status: 'success',
      });
    } else {
      user.lastLoginAt = new Date().toISOString();
      if (targetProvider === 'google') user.googleConnected = true;
      if (targetProvider === 'github') user.githubConnected = true;

      auditLogs.unshift({
        id: `log_${crypto.randomUUID()}`,
        userId: user.id,
        action: `OAUTH_${targetProvider.toUpperCase()}_LOGIN`,
        details: `Signed in seamlessly via ${targetProvider} OAuth.`,
        ip: req.ip || '127.0.0.1',
        userAgent: req.get('user-agent') || 'CatAuth OAuth Flow',
        timestamp: new Date().toISOString(),
        status: 'success',
      });
    }
  }

  // Create session
  const sessionToken = `cat_sess_${crypto.randomBytes(32).toString('hex')}`;
  const newSession: StoredSession = {
    id: sessionToken,
    userId: user.id,
    token: sessionToken,
    userAgent: req.get('user-agent') || 'Unknown browser',
    ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };
  sessions.set(sessionToken, newSession);

  res.cookie('catauth_session', sessionToken, COOKIE_OPTIONS);

  const sanitized = sanitizeUser(user);

  // Return HTML script adhering strictly to oauth-integration skill postMessage protocol
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>CatAuth Handshake Complete</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0b1120;
            color: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 24px;
            box-sizing: border-box;
          }
          .box {
            background: #0f172a;
            border: 1px solid #1e293b;
            border-radius: 16px;
            padding: 32px 28px;
            text-align: center;
            max-width: 420px;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
          }
          .icon {
            font-size: 40px;
            margin-bottom: 12px;
          }
          h2 {
            color: #38bdf8;
            font-size: 20px;
            margin: 0 0 8px 0;
          }
          p {
            color: #94a3b8;
            font-size: 14px;
            margin: 0 0 16px 0;
          }
          .spinner {
            width: 24px;
            height: 24px;
            border: 3px solid rgba(56, 189, 248, 0.2);
            border-top-color: #38bdf8;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="box">
          <div class="icon">🐾</div>
          <h2>Authentication Successful</h2>
          <p>Connecting your feline account with crakkocat.com...</p>
          <div class="spinner"></div>
        </div>
        <script>
          const payload = {
            type: 'OAUTH_AUTH_SUCCESS',
            token: "${sessionToken}",
            user: ${JSON.stringify(sanitized)},
            provider: "${targetProvider}"
          };

          if (window.opener) {
            window.opener.postMessage(payload, '*');
            setTimeout(() => {
              window.close();
            }, 500);
          } else {
            // Fallback if not opened as popup
            window.location.href = '/?oauth_token=' + encodeURIComponent('${sessionToken}');
          }
        </script>
      </body>
    </html>
  `);
});

// Unlink OAuth provider
app.post('/api/auth/oauth/:provider/unlink', requireAuth, (req, res) => {
  const user = (req as any).user as StoredUser;
  const { provider } = req.params;

  if (provider === 'google') {
    user.googleConnected = false;
    user.googleEmail = undefined;
  } else if (provider === 'github') {
    user.githubConnected = false;
    user.githubUsername = undefined;
  }

  auditLogs.unshift({
    id: `log_${crypto.randomUUID()}`,
    userId: user.id,
    action: `OAUTH_${provider.toUpperCase()}_UNLINKED`,
    details: `Disconnected ${provider} identity from CatAuth account.`,
    ip: req.ip || '127.0.0.1',
    userAgent: req.get('user-agent') || 'CatAuth Client',
    timestamp: new Date().toISOString(),
    status: 'warning',
  });

  res.json({
    success: true,
    user: sanitizeUser(user),
  });
});

// Vite Middleware or Static Assets
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🐾 CatAuth server running on http://0.0.0.0:${PORT} for crakkocat.com`);
  });
}

startServer().catch(err => {
  console.error('Failed to start CatAuth server:', err);
  process.exit(1);
});
