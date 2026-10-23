import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bool = (value, fallback = false) => value == null ? fallback : ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
const sameSiteValue = String(process.env.COOKIE_SAMESITE || 'strict').toLowerCase();
const demoMode = bool(process.env.DEMO_MODE, true);
const port = Number(process.env.PORT || (process.env.NODE_ENV === 'production' ? 3000 : 3001));
// Arena/E2B sandbox IDs can change when a workspace is resumed. Derive the
// current preview origin instead of retaining a retired hostname. Explicit
// APP_ORIGIN always wins for ordinary production/custom deployments.
const sandboxOrigin = process.env.E2B_SANDBOX_ID
  ? `https://${port}-${process.env.E2B_SANDBOX_ID}.e2b.app`
  : '';

export const config = {
  root,
  nodeEnv: process.env.NODE_ENV || 'development',
  port,
  appOrigin: (process.env.APP_ORIGIN || sandboxOrigin).replace(/\/+$/, ''),
  dataDir: path.resolve(root, process.env.DATA_DIR || './data'),
  demoMode,
  trustProxy: bool(process.env.TRUST_PROXY, false),
  cookieSecure: bool(process.env.COOKIE_SECURE, false),
  cookieSameSite: ['strict', 'lax', 'none'].includes(sameSiteValue) ? sameSiteValue : 'strict',
  cookiePartitioned: bool(process.env.COOKIE_PARTITIONED, false),
  // The token fallback is on for the demo so embedded previews survive blocked
  // third-party cookies. Live deployments default to cookie-only sessions.
  authBearerFallback: bool(process.env.AUTH_BEARER_FALLBACK, demoMode),
  sessionHours: Math.min(24, Math.max(1, Number(process.env.SESSION_HOURS || 8))),
};
