import crypto from 'node:crypto';

export const now = () => new Date().toISOString();
export const hoursAgo = (hours) => new Date(Date.now() - hours * 3600000).toISOString();
export const daysFromNow = (days) => new Date(Date.now() + days * 86400000).toISOString();
export const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
export const referenceCode = (isSos = false) => `IV-SUP-${isSos ? 'SOS' : 'RPT'}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
export const trackingCode = () => crypto.randomBytes(6).toString('hex').toUpperCase();
export const safeUser = (user) => user ? ({
  id: user.id,
  loginId: user.login_id,
  name: user.name,
  role: user.role,
  portal: user.portal,
  organisationId: user.organisation_id,
  organisationName: user.organisation_name,
  jobTitle: user.job_title,
  department: user.department,
}) : null;
export const clientIp = (req) => req.ip || req.socket?.remoteAddress || 'unknown';
