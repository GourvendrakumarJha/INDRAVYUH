import { db } from './db.js';
import { clientIp, now } from './security.js';

export function audit(req, action, entityType, entityId = null, details = {}) {
  db.prepare(`INSERT INTO audit_logs (user_id, portal, action, entity_type, entity_id, ip, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    req.user?.id || null,
    req.user?.portal || 'public',
    action,
    entityType,
    entityId == null ? null : String(entityId),
    clientIp(req),
    JSON.stringify(details).slice(0, 4000),
    now(),
  );
}
