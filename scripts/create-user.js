import bcrypt from 'bcryptjs';
import { db } from '../server/db.js';
import { now, randomToken } from '../server/security.js';

const [portal, loginId, name, password, organisationId = ''] = process.argv.slice(2);
const roles = { welfare: 'welfare_admin', business: 'business_admin', employee: 'employee_admin' };
if (!roles[portal] || !loginId || !name || !password || password.length < 12) {
  console.error('Usage: npm run create-user -- <welfare|business|employee> <login-id> <display-name> <password-min-12-chars> [organisation-id]');
  process.exit(1);
}
if (portal === 'business' && !db.prepare('SELECT id FROM organisations WHERE id=?').get(organisationId)) {
  console.error('A valid existing organisation ID is required for a business administrator.');
  process.exit(1);
}
try {
  const id = `user-${randomToken(9)}`;
  db.prepare('INSERT INTO users (id,login_id,password_hash,name,role,portal,organisation_id,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, loginId, bcrypt.hashSync(password, 12), name, roles[portal], portal, organisationId || null, now());
  console.log(`Created ${portal} administrator: ${loginId}`);
} catch (error) {
  console.error(error.message.includes('UNIQUE') ? 'That login ID already exists.' : error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
