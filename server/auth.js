import { db } from './db.js';
import { config } from './config.js';
import { safeUser, sha256, now } from './security.js';

export const SESSION_COOKIE = 'iv_session';

export function requestSessionTokens(req) {
  const authorization = req.get('authorization') || '';
  const bearer = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const secondary = String(req.get('x-indravyuh-session') || '').trim();
  const fallback = config.authBearerFallback ? [secondary, bearer] : [];
  // A stale stored token must not hide a valid cookie or secondary credential.
  return [...new Set([req.cookies?.[SESSION_COOKIE], ...fallback]
    .filter((token) => token && token.length <= 512))].slice(0, 3);
}

export function loadUser(req, _res, next) {
  req.user = null;
  for (const token of requestSessionTokens(req)) {
    const row = db.prepare(`SELECT u.*, o.name AS organisation_name
      FROM sessions s JOIN users u ON u.id = s.user_id
      LEFT JOIN organisations o ON o.id = u.organisation_id
      WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`).get(sha256(token), now());
    if (row) { req.user = row; break; }
  }
  next();
}

export function requirePortal(portal) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    if (req.user.portal !== portal) return res.status(403).json({ error: 'Access not authorised for this workspace', code: 'ACCESS_DENIED' });
    next();
  };
}

export function requireAdmin(req, res, next) {
  if (!req.user?.role?.endsWith('_admin')) return res.status(403).json({ error: 'Administrator permission required', code: 'ADMIN_REQUIRED' });
  next();
}

export function verifyOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next();
  const requestOrigin = `${req.protocol}://${req.host}`;
  const allowed = new Set([requestOrigin, config.appOrigin].filter(Boolean));
  if (!allowed.has(origin)) return res.status(403).json({ error: 'Request origin rejected', code: 'ORIGIN_REJECTED' });
  next();
}

export function cleanExpiredSessions() {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now());
}
