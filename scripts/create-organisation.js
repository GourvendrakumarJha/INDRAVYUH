import { db } from '../server/db.js';
import { now, randomToken } from '../server/security.js';

const [name, contactEmail, plan = 'Coordination Pilot', address = ''] = process.argv.slice(2);
if (!name || !contactEmail || !/^\S+@\S+\.\S+$/.test(contactEmail)) {
  console.error('Usage: npm run create-organisation -- <organisation-name> <contact-email> [plan] [address]');
  process.exit(1);
}
const id = `org-${randomToken(7)}`;
db.prepare('INSERT INTO organisations (id,name,type,plan,status,address,contact_email,created_at) VALUES (?,?,?,?,?,?,?,?)')
  .run(id, name, 'Institutional customer', plan, 'Active', address, contactEmail, now());
console.log(`Created organisation "${name}" with ID: ${id}`);
console.log(`Next: npm run create-user -- business <login-id> <display-name> <password-min-12-chars> ${id}`);
db.close();
