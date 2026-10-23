import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from './db.js';
import { config } from './config.js';
import { SESSION_COOKIE, cleanExpiredSessions, requestSessionTokens } from './auth.js';
import { audit } from './audit.js';
import { clientIp, now, randomToken, safeUser, sha256 } from './security.js';

export const authRouter = Router();

const loginSchema = z.object({
  portal: z.enum(['welfare', 'business', 'employee']),
  loginId: z.string().trim().min(3).max(80),
  password: z.string().min(8).max(200),
});

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: config.cookieSameSite,
  secure: config.cookieSecure || config.cookieSameSite === 'none',
  partitioned: config.cookiePartitioned && config.cookieSameSite === 'none',
  path: '/',
  maxAge: config.sessionHours * 3600000,
});

authRouter.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid portal ID and password.', code: 'VALIDATION_ERROR' });
  const { portal, loginId, password } = parsed.data;
  const user = db.prepare(`SELECT u.*, o.name AS organisation_name FROM users u
    LEFT JOIN organisations o ON o.id = u.organisation_id
    WHERE u.login_id COLLATE NOCASE = ? AND u.active = 1`).get(loginId);
  const valid = user && bcrypt.compareSync(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid ID or password.', code: 'INVALID_LOGIN' });
  if (user.portal !== portal) return res.status(403).json({ error: 'This ID is not authorised for the selected portal.', code: 'WRONG_PORTAL' });

  cleanExpiredSessions();
  const token = randomToken();
  const expiresAt = new Date(Date.now() + config.sessionHours * 3600000).toISOString();
  db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at,created_at,ip,user_agent) VALUES (?,?,?,?,?,?)')
    .run(sha256(token), user.id, expiresAt, now(), clientIp(req), (req.get('user-agent') || '').slice(0, 300));
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now(), user.id);
  req.user = user;
  audit(req, 'Signed in', 'session', null, { portal });
  res.cookie(SESSION_COOKIE, token, cookieOptions());
  res.json({ user: safeUser(user), demoMode: config.demoMode, expiresAt, ...(config.authBearerFallback ? { sessionToken: token } : {}) });
});

authRouter.post('/logout', (req, res) => {
  for (const token of requestSessionTokens(req)) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
  if (req.user) audit(req, 'Signed out', 'session');
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined });
  res.json({ ok: true });
});

authRouter.get('/me', (req, res) => {
  res.json({ user: safeUser(req.user), demoMode: config.demoMode });
});
