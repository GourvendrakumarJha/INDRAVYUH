import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { daysFromNow, hoursAgo, now, sha256 } from './security.js';
import { riskColumns } from './risk.js';

fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(path.join(config.dataDir, 'uploads'), { recursive: true });

export const db = new Database(path.join(config.dataDir, 'indravyuh.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.exec(`
CREATE TABLE IF NOT EXISTS organisations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'institution',
  plan TEXT NOT NULL DEFAULT 'Pilot',
  status TEXT NOT NULL DEFAULT 'Active',
  address TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  login_id TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('welfare_admin','welfare_operator','business_admin','business_member','employee_admin','employee')),
  portal TEXT NOT NULL CHECK(portal IN ('welfare','business','employee')),
  organisation_id TEXT REFERENCES organisations(id),
  job_title TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  tracking_hash TEXT NOT NULL,
  is_sos INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  location_text TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  observed_at TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '',
  people_count INTEGER,
  photo_path TEXT,
  photo_name TEXT,
  photo_mime TEXT,
  status TEXT NOT NULL DEFAULT 'Submitted',
  verification TEXT NOT NULL DEFAULT 'Unverified',
  priority TEXT NOT NULL DEFAULT 'Normal',
  assigned_team TEXT,
  is_public INTEGER NOT NULL DEFAULT 0,
  simulated INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, simulated, is_sos);
CREATE TABLE IF NOT EXISTS report_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_en TEXT NOT NULL,
  title_hi TEXT NOT NULL,
  body_en TEXT NOT NULL,
  body_hi TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'Information',
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  published_at TEXT,
  expires_at TEXT,
  simulated INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS shelters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  capacity INTEGER NOT NULL DEFAULT 0,
  occupied INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Unconfirmed',
  accessibility TEXT NOT NULL DEFAULT 'Not recorded',
  source TEXT NOT NULL,
  last_confirmed TEXT,
  simulated INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Unavailable',
  members INTEGER NOT NULL DEFAULT 0,
  latitude REAL,
  longitude REAL,
  last_checkin TEXT,
  simulated INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS relief (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  location TEXT NOT NULL,
  min_stock REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  simulated INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL REFERENCES organisations(id),
  number TEXT NOT NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  due_date TEXT NOT NULL,
  issued_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organisation_id TEXT NOT NULL REFERENCES organisations(id),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open',
  priority TEXT NOT NULL DEFAULT 'Normal',
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS implementation_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organisation_id TEXT NOT NULL REFERENCES organisations(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Not started',
  due_date TEXT,
  owner TEXT NOT NULL DEFAULT '',
  completed_at TEXT
);
CREATE TABLE IF NOT EXISTS employee_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'To do',
  priority TEXT NOT NULL DEFAULT 'Normal',
  due_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  report_id INTEGER REFERENCES reports(id) ON DELETE SET NULL,
  assigned_by TEXT REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS coordination_requests (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL REFERENCES organisations(id),
  report_id INTEGER REFERENCES reports(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  details TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Normal',
  status TEXT NOT NULL DEFAULT 'Requested',
  created_by TEXT REFERENCES users(id),
  updated_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  simulated INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_coordination_org ON coordination_requests(organisation_id, simulated, updated_at);
CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'employee',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS leave_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id),
  portal TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  ip TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_portal ON audit_logs(portal, created_at);
CREATE TABLE IF NOT EXISTS family_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  access_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Safe',
  area TEXT NOT NULL,
  shelter_id TEXT REFERENCES shelters(id),
  note TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  simulated INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_family_checkins ON family_checkins(simulated, updated_at);
CREATE TABLE IF NOT EXISTS relief_deliveries (
  id TEXT PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES relief(id),
  quantity REAL NOT NULL,
  destination TEXT NOT NULL,
  area TEXT NOT NULL,
  people_reached INTEGER,
  status TEXT NOT NULL DEFAULT 'In transit',
  note TEXT NOT NULL DEFAULT '',
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  simulated INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_relief_deliveries ON relief_deliveries(simulated, status, updated_at);
`);

const employeeTaskColumns = new Set(db.prepare('PRAGMA table_info(employee_tasks)').all().map((column) => column.name));
if (!employeeTaskColumns.has('report_id')) db.exec('ALTER TABLE employee_tasks ADD COLUMN report_id INTEGER REFERENCES reports(id) ON DELETE SET NULL');
if (!employeeTaskColumns.has('assigned_by')) db.exec('ALTER TABLE employee_tasks ADD COLUMN assigned_by TEXT REFERENCES users(id)');

const addColumn = (table, column, definition) => {
  const columns = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((item) => item.name));
  if (!columns.has(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
};
[
  ['task_type', "TEXT NOT NULL DEFAULT 'general'"], ['result_note', "TEXT NOT NULL DEFAULT ''"],
  ['completion_outcome', 'TEXT'], ['completed_at', 'TEXT'], ['delivery_id', 'TEXT REFERENCES relief_deliveries(id) ON DELETE SET NULL'],
].forEach(([column, definition]) => addColumn('employee_tasks', column, definition));
[
  ['gps_accuracy', 'REAL'], ['gps_captured_at', 'TEXT'], ['source', "TEXT NOT NULL DEFAULT 'Citizen'"], ['reporter_name', "TEXT NOT NULL DEFAULT ''"],
  ['created_by', 'TEXT REFERENCES users(id)'], ['response_stage', 'TEXT'], ['people_assisted', 'INTEGER'],
  ['water_level_cm', 'REAL'], ['flow_velocity_ms', 'REAL'], ['rainfall_1h_mm', 'REAL'],
  ['rainfall_24h_mm', 'REAL'], ['rise_rate_cmh', 'REAL'], ['people_trapped', 'INTEGER'],
  ['vulnerable_count', 'INTEGER'], ['access_condition', 'TEXT'], ['risk_score', 'INTEGER'],
  ['risk_band', 'TEXT'], ['risk_confidence', 'TEXT'],
].forEach(([column, definition]) => addColumn('reports', column, definition));
[
  ['area', "TEXT NOT NULL DEFAULT ''"], ['landmark', "TEXT NOT NULL DEFAULT ''"],
  ['route_status', "TEXT NOT NULL DEFAULT 'Not specified'"],
].forEach(([column, definition]) => addColumn('alerts', column, definition));
db.prepare(`UPDATE reports SET response_stage=CASE status
  WHEN 'Resolved' THEN 'Resolved' WHEN 'Closed' THEN 'Resolved' WHEN 'In progress' THEN 'Responding'
  WHEN 'Assigned' THEN 'Dispatched' WHEN 'Under review' THEN 'Acknowledged' ELSE 'Received' END
  WHERE is_sos=1 AND response_stage IS NULL`).run();

const insertDemoData = db.transaction(() => {
  const timestamp = now();
  const hash = bcrypt.hashSync('Supaul@2026', 12);
  const addOrg = db.prepare(`INSERT INTO organisations (id,name,type,plan,status,address,contact_email,created_at) VALUES (?,?,?,?,?,?,?,?)`);
  addOrg.run('org-demo', 'Supaul Partner Organisation', 'Institutional partner', 'Coordination Pilot', 'Active', 'Supaul, Bihar', 'partner@example.invalid', timestamp);

  const addUser = db.prepare(`INSERT INTO users (id,login_id,password_hash,name,role,portal,organisation_id,job_title,department,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`);
  addUser.run('demo-welfare-admin', 'WELFARE-DEMO', hash, 'Chief Administrator', 'welfare_admin', 'welfare', null, 'District operations administrator', 'Chief Administration', timestamp);
  addUser.run('demo-welfare-operator', 'OPERATOR-DEMO', hash, 'Chief Operations Operator', 'welfare_operator', 'welfare', null, 'Incident and risk operator', 'Chief Administration', timestamp);
  addUser.run('demo-business-admin', 'BUSINESS-DEMO', hash, 'Business Administrator', 'business_admin', 'business', 'org-demo', 'Account administrator', 'Supaul Partner Organisation', timestamp);
  addUser.run('demo-employee-admin', 'EMPLOYEE-DEMO', hash, 'Specialized Action Officer', 'employee_admin', 'employee', null, 'Field coordination specialist', 'Specialized Action', timestamp);

  const addShelter = db.prepare(`INSERT INTO shelters (id,name,area,latitude,longitude,address,capacity,occupied,status,accessibility,source,last_confirmed,simulated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)`);
  [
    ['SH-DEMO-01','Supaul Relief Centre','Supaul',26.1260,86.6050,'Supaul coordination point',240,86,'Confirm locally','Ground-floor access','INDRAVYUH coordination record',hoursAgo(2)],
    ['SH-DEMO-02','Birpur Relief Centre','Birpur',26.5151843,87.0084605,'Birpur coordination point',180,42,'Confirm locally','Accessibility not assessed','INDRAVYUH coordination record',hoursAgo(8)],
    ['SH-DEMO-03','Nirmali Relief Centre','Nirmali',26.3070921,86.5738696,'Nirmali coordination point',150,150,'At capacity','Ground-floor access','INDRAVYUH coordination record',hoursAgo(28)],
    ['SH-DEMO-04','Triveniganj Relief Centre','Triveniganj',26.1270382,86.8872792,'Triveniganj coordination point',200,65,'Confirm locally','Accessibility not assessed','INDRAVYUH coordination record',hoursAgo(4)],
  ].forEach((row) => addShelter.run(...row));

  const addAlert = db.prepare(`INSERT INTO alerts (title_en,title_hi,body_en,body_hi,severity,source,status,published_at,expires_at,simulated,created_by,created_at,area,landmark,route_status) VALUES (?,?,?,?,?,?,?,?,?,1,?,?,?,?,?)`);
  addAlert.run('Water reaching Supaul College of Engineering','सुपौल अभियंत्रण महाविद्यालय तक पानी पहुँचा','Water has reached the Supaul College of Engineering approach. Avoid the campus gate and use the authorised coordination point.','सुपौल अभियंत्रण महाविद्यालय के आगमन मार्ग तक पानी पहुँचा है। परिसर के गेट से बचें और अधिकृत समन्वय केंद्र का उपयोग करें।','Urgent','INDRAVYUH coordination desk','Published',hoursAgo(1),daysFromNow(1),'demo-welfare-admin',hoursAgo(2),'Supaul','Supaul College of Engineering','Restricted');
  addAlert.run('All routes blocked in Raghopur','राघोपुर के सभी मार्ग अवरुद्ध','All listed approach routes in Raghopur are marked blocked in the coordination record. Do not attempt travel through the area; await an authorised route update.','समन्वय अभिलेख में राघोपुर के सभी सूचीबद्ध आगमन मार्ग अवरुद्ध हैं। क्षेत्र में यात्रा न करें; अधिकृत मार्ग अद्यतन की प्रतीक्षा करें।','Urgent','INDRAVYUH coordination desk','Published',hoursAgo(2),daysFromNow(1),'demo-welfare-admin',hoursAgo(3),'Raghopur','','Blocked');
  addAlert.run('Prepare your household go-bag','अपना घरेलू आपातकालीन बैग तैयार रखें','Keep drinking water, essential medicines, documents and a torch ready. Follow instructions from authorised local sources.','पीने का पानी, आवश्यक दवाएँ, दस्तावेज़ और टॉर्च तैयार रखें। अधिकृत स्थानीय स्रोतों के निर्देशों का पालन करें।','Preparedness','INDRAVYUH preparedness desk','Published',hoursAgo(3),daysFromNow(7),'demo-welfare-admin',hoursAgo(4),'Supaul district','','Not specified');
  addAlert.run('Road observation exercise near Nirmali','निर्मली के पास सड़क अवलोकन अभ्यास','Review local access observations with the coordination team before planning movement.','यात्रा की योजना से पहले समन्वय टीम के साथ स्थानीय पहुँच अवलोकन देखें।','Advisory','INDRAVYUH coordination desk','Published',hoursAgo(20),daysFromNow(2),'demo-welfare-admin',hoursAgo(21),'Nirmali','Nirmali Railway Station','Under review');

  const addTeam = db.prepare(`INSERT INTO teams (id,name,type,status,members,latitude,longitude,last_checkin,simulated) VALUES (?,?,?,?,?,?,?,?,1)`);
  [
    ['TEAM-DEMO-01','Response Team 01','Rescue','Available',6,26.128,86.610,hoursAgo(1)],
    ['TEAM-DEMO-02','Response Team 02','Rescue','On task',5,26.3071,86.5739,hoursAgo(2)],
    ['TEAM-DEMO-03','Medical Team 03','Medical','Assigned',4,26.5152,87.0085,hoursAgo(3)],
    ['TEAM-DEMO-04','Relief Team 04','Relief','Unavailable',8,26.1270,86.8873,hoursAgo(30)],
  ].forEach((row) => addTeam.run(...row));

  const addReport = db.prepare(`INSERT INTO reports (reference,tracking_hash,is_sos,category,description,location_text,latitude,longitude,observed_at,contact,people_count,status,verification,priority,assigned_team,is_public,simulated,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`);
  const demoTrack = 'DEMO-TRACK-26';
  const reports = [
    ['IV-SUP-DEMO01',sha256(demoTrack),0,'waterlogging','Water rising near the college approach and restricting access.','Supaul College of Engineering',26.1080847,86.6033095,hoursAgo(6),'',76,'Under review','Unverified','Critical',null,0,hoursAgo(5),hoursAgo(4)],
    ['IV-SUP-DEMO02',sha256('DEMO-TRACK-02'),1,'flooding','Household requesting assistance.','Raghopur coordination point',26.2979997,86.8359681,hoursAgo(3),'Restricted callback',4,'Assigned','Verified','Critical','TEAM-DEMO-02',0,hoursAgo(3),hoursAgo(1)],
    ['IV-SUP-DEMO03',sha256('DEMO-TRACK-03'),0,'road_blocked','Fallen obstruction requiring verification and assignment.','Nirmali coordination point',26.3070921,86.5738696,hoursAgo(12),'',null,'Verified','Verified','High',null,1,hoursAgo(11),hoursAgo(7)],
    ['IV-SUP-DEMO04',sha256('DEMO-TRACK-04'),0,'infrastructure','Damaged culvert observation.','Kishanpur coordination point',26.212938,86.6808402,hoursAgo(20),'',null,'Resolved','Verified','Normal','TEAM-DEMO-01',1,hoursAgo(19),hoursAgo(8)],
    ['IV-SUP-DEMO05',sha256('DEMO-TRACK-05'),1,'flooding','Assistance request awaiting review.','Birpur coordination point',26.5151843,87.0084605,hoursAgo(1),'Restricted callback',2,'Submitted','Unverified','High',null,0,hoursAgo(1),hoursAgo(1)],
    ['IV-SUP-DEMO06',sha256('DEMO-TRACK-06'),0,'embankment','Embankment observation for coordination review.','Basantpur coordination point',26.4719652,86.9763441,hoursAgo(30),'',null,'In progress','Verified','High','TEAM-DEMO-03',0,hoursAgo(29),hoursAgo(2)],
    ['IV-SUP-DEMO07',sha256('DEMO-TRACK-07'),0,'waterlogging','Citizen observation of water entering the lane near the ward coordination point.','Supaul ward coordination point',26.126,86.605,hoursAgo(2),'Restricted citizen callback',9,'Submitted','Unverified','Normal',null,0,hoursAgo(2),hoursAgo(2)],
    ['IV-SUP-DEMO08',sha256('DEMO-TRACK-08'),0,'road_blocked','Citizen observation of a blocked hospital approach requiring verification.','Sadar Hospital approach',26.1186584,86.6016281,hoursAgo(4),'',3,'Under review','Unverified','High',null,0,hoursAgo(4),hoursAgo(3)],
  ];
  reports.forEach((row) => addReport.run(...row));
  db.prepare(`UPDATE reports SET response_stage=CASE status WHEN 'Resolved' THEN 'Resolved' WHEN 'Closed' THEN 'Resolved'
    WHEN 'In progress' THEN 'Responding' WHEN 'Assigned' THEN 'Dispatched' WHEN 'Under review' THEN 'Acknowledged' ELSE 'Received' END
    WHERE is_sos=1 AND response_stage IS NULL`).run();
  const riskFixtures = [
    ['IV-SUP-DEMO01', { waterLevelCm: 148, flowVelocityMs: 1.9, rainfall1hMm: 64, rainfall24hMm: 118, riseRateCmh: 15, peopleCount: 76, peopleTrapped: 11, vulnerableCount: 18, accessCondition: 'Restricted' }],
    ['IV-SUP-DEMO03', { waterLevelCm: 126, flowVelocityMs: 1.5, rainfall1hMm: 54, rainfall24hMm: 102, riseRateCmh: 13, peopleCount: 54, peopleTrapped: 7, vulnerableCount: 19, accessCondition: 'Blocked' }],
    ['IV-SUP-DEMO04', { waterLevelCm: 76, flowVelocityMs: 0.7, rainfall1hMm: 32, rainfall24hMm: 68, riseRateCmh: 6, peopleCount: 22, peopleTrapped: 0, vulnerableCount: 8, accessCondition: 'Open' }],
  ];
  const riskKeys = Object.keys(riskColumns({}));
  const updateRisk = db.prepare(`UPDATE reports SET ${riskKeys.map((key) => `${key}=@${key}`).join(',')} WHERE reference=@reference`);
  riskFixtures.forEach(([reference, values]) => updateRisk.run({ ...riskColumns(values), reference }));
  db.prepare("UPDATE reports SET source='Chief Administration field report' WHERE reference IN ('IV-SUP-DEMO01','IV-SUP-DEMO03','IV-SUP-DEMO04')").run();
  db.prepare("UPDATE reports SET reporter_name='Citizen reporter 07' WHERE reference='IV-SUP-DEMO07'").run();
  const reportRows = db.prepare('SELECT id, reference FROM reports').all();
  const addEvent = db.prepare('INSERT INTO report_events (report_id,actor_id,action,note,created_at) VALUES (?,?,?,?,?)');
  reportRows.forEach((r) => addEvent.run(r.id, null, 'Report created', 'Created in the coordination queue.', r.reference === 'IV-SUP-DEMO01' ? hoursAgo(5) : hoursAgo(3)));

  const addRelief = db.prepare('INSERT INTO relief (item,category,quantity,unit,location,min_stock,updated_at,simulated) VALUES (?,?,?,?,?,?,?,1)');
  [
    ['Packaged drinking water','Water',420,'litres','Relief store · Supaul',500,hoursAgo(2)],
    ['Dry ration packets','Food',260,'packets','Relief store · Supaul',200,hoursAgo(5)],
    ['Oral rehydration salts','Medical',180,'boxes','Relief store · Nirmali',75,hoursAgo(7)],
    ['Tarpaulin sheets','Shelter',90,'sheets','Relief store · Birpur',100,hoursAgo(1)],
  ].forEach((row) => addRelief.run(...row));
  const demoReliefItem = db.prepare("SELECT id FROM relief WHERE item='Packaged drinking water'").get();
  db.prepare(`INSERT INTO relief_deliveries (id,item_id,quantity,destination,area,people_reached,status,note,created_by,created_at,updated_at,simulated)
    VALUES ('IV-SUP-DLV-DEMO01',?,20,'Supaul College of Engineering coordination point','Supaul',40,'In transit','Drinking water allocation for the college coordination point.','demo-welfare-admin',?,?,1)`)
    .run(demoReliefItem.id, hoursAgo(1), hoursAgo(1));
  db.prepare(`INSERT INTO family_checkins (reference,access_hash,name,status,area,shelter_id,note,contact,simulated,created_by,created_at,updated_at)
    VALUES ('IV-SUP-FAM-DEMO01',?,'Family Member 01','At shelter','Supaul','SH-DEMO-01','Checked in at the listed coordination point.','Restricted contact',1,'demo-welfare-admin',?,?)`)
    .run(sha256('DEMO-FAMILY-26'), hoursAgo(2), hoursAgo(1));

  const addInvoice = db.prepare('INSERT INTO invoices (id,organisation_id,number,description,amount,status,due_date,issued_at) VALUES (?,?,?,?,?,?,?,?)');
  addInvoice.run('INV-DEMO-001','org-demo','IV/2026/DEMO/001','Coordination pilot · implementation fee',60000,'Paid',daysFromNow(-15).slice(0,10),daysFromNow(-45).slice(0,10));
  addInvoice.run('INV-DEMO-002','org-demo','IV/2026/DEMO/002','Coordination subscription · quarterly service',45000,'Due soon',daysFromNow(12).slice(0,10),daysFromNow(-18).slice(0,10));

  const addTask = db.prepare('INSERT INTO implementation_tasks (organisation_id,title,description,status,due_date,owner,completed_at) VALUES (?,?,?,?,?,?,?)');
  addTask.run('org-demo','Confirm operating procedures','Review escalation roles with the authorised programme owner.','Completed',daysFromNow(-10).slice(0,10),'Programme administrator',daysFromNow(-12));
  addTask.run('org-demo','Confirm staff workflow access','Bilingual interface access check.','In progress',daysFromNow(4).slice(0,10),'Programme administrator',null);
  addTask.run('org-demo','Sign off data retention policy','Approve retention, access review and deletion responsibilities.','Not started',daysFromNow(9).slice(0,10),'Programme owner',null);

  const addTicket = db.prepare('INSERT INTO tickets (organisation_id,subject,body,category,status,priority,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)');
  addTicket.run('org-demo','Review relief coordination window','Confirm the next partner coordination window for relief support.','Coordination','In progress','Normal','demo-business-admin',hoursAgo(30),hoursAgo(5));

  const addEmpTask = db.prepare('INSERT INTO employee_tasks (user_id,title,description,status,priority,due_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)');
  const addSpecializedTask = (title, description, status, priority, dueDays, type, reportReference = null, deliveryId = null, age = 5) => {
    const result = addEmpTask.run('demo-employee-admin', title, description, status, priority, daysFromNow(dueDays).slice(0,10), hoursAgo(age + 2), hoursAgo(age));
    const report = reportReference ? db.prepare('SELECT id FROM reports WHERE reference=?').get(reportReference) : null;
    db.prepare('UPDATE employee_tasks SET report_id=?,assigned_by=?,task_type=?,delivery_id=? WHERE id=?')
      .run(report?.id || null, 'demo-welfare-admin', type, deliveryId, result.lastInsertRowid);
    return result.lastInsertRowid;
  };
  const completedMonitoring = addSpecializedTask('Monitor the college approach', 'Record the next authorised observation and access update for the college coordination point.', 'Completed', 'High', -1, 'monitoring', 'IV-SUP-DEMO01', null, 4);
  db.prepare("UPDATE employee_tasks SET result_note='Approach remains restricted; the next monitoring check is queued.',completed_at=?,updated_at=? WHERE id=?").run(hoursAgo(1), hoursAgo(1), completedMonitoring);
  addSpecializedTask('Verify ward citizen report', 'Review the shared citizen observation and submit a verification outcome to Chief Administration.', 'In progress', 'Critical', 1, 'citizen_verification', 'IV-SUP-DEMO07', null, 3);
  addSpecializedTask('Coordinate hospital communication', 'Confirm the latest access message with the authorised coordination point.', 'In progress', 'High', 1, 'communication', 'IV-SUP-DEMO02', null, 6);
  addSpecializedTask('Complete college relief supply', 'Track the assigned drinking-water delivery and submit its completion result.', 'To do', 'Critical', 1, 'relief_supply', 'IV-SUP-DEMO01', 'IV-SUP-DLV-DEMO01', 2);
  addSpecializedTask('Track Raghopur response update', 'Follow the linked response record and return the latest tracking note.', 'To do', 'High', 2, 'tracking', 'IV-SUP-DEMO04', null, 7);
  addSpecializedTask('Push shelter capacity notification', 'Send the latest listed shelter capacity note to the internal action network.', 'To do', 'Normal', 2, 'notification', null, null, 8);
  const linkedReport = db.prepare("SELECT id FROM reports WHERE reference='IV-SUP-DEMO02'").get();
  db.prepare(`INSERT INTO coordination_requests (id,organisation_id,report_id,title,category,details,priority,status,created_by,created_at,updated_at,simulated)
    VALUES ('CR-SUP-01','org-demo',?,'Drinking water transport support','Logistics','Confirm vehicle availability for the Nirmali coordination point.','Normal','Requested','demo-welfare-admin',?,?,1)`).run(linkedReport.id, hoursAgo(4), hoursAgo(4));

  db.prepare('INSERT INTO notices (title,body,audience,created_at) VALUES (?,?,?,?)').run('Coordination reminder','Review your assigned tasks and update their status.','employee',hoursAgo(8));
  db.prepare('INSERT INTO notices (title,body,audience,created_at) VALUES (?,?,?,?)').run('Security review on Friday','Complete the access review before the coordination session.','employee',hoursAgo(30));
  db.prepare('INSERT INTO leave_requests (user_id,start_date,end_date,reason,status,created_at) VALUES (?,?,?,?,?,?)').run('demo-employee-admin',daysFromNow(8).slice(0,10),daysFromNow(8).slice(0,10),'Personal leave','Pending',hoursAgo(12));
});

if (db.prepare('SELECT COUNT(*) AS count FROM users').get().count === 0 && config.demoMode) {
  insertDemoData();
  console.log('INDRAVYUH: demo database initialised with simulated fixtures.');
}

if (config.demoMode) {
  // Upgrade an existing demo database without deleting its sessions or records.
  db.prepare("UPDATE users SET name='Chief Administrator',job_title='District operations administrator',department='Chief Administration' WHERE id='demo-welfare-admin'").run();
  db.prepare("UPDATE users SET name='Chief Operations Operator',job_title='Incident and risk operator',department='Chief Administration' WHERE id='demo-welfare-operator'").run();
  db.prepare("UPDATE users SET name='Specialized Action Officer',job_title='Field coordination specialist',department='Specialized Action' WHERE id='demo-employee-admin'").run();
  db.prepare("UPDATE tickets SET subject='Review relief coordination window',body='Confirm the next partner coordination window for relief support.',category='Coordination' WHERE organisation_id='org-demo' AND subject='Request Hindi training session'").run();
  db.prepare("DELETE FROM employee_tasks WHERE user_id='demo-employee-admin' AND title IN ('Update Hindi glossary','Archive training material')").run();
  const ensureAlert = (title, values) => {
    if (db.prepare('SELECT id FROM alerts WHERE title_en=? AND simulated=1').get(title)) return;
    db.prepare(`INSERT INTO alerts (title_en,title_hi,body_en,body_hi,severity,source,status,published_at,expires_at,simulated,created_by,created_at,area,landmark,route_status)
      VALUES (?,?,?,?,?,'INDRAVYUH coordination desk','Published',?,?,1,'demo-welfare-admin',?,?,?,?)`).run(...values);
  };
  ensureAlert('Water reaching Supaul College of Engineering', [
    'Water reaching Supaul College of Engineering','सुपौल अभियंत्रण महाविद्यालय तक पानी पहुँचा','Water has reached the Supaul College of Engineering approach. Avoid the campus gate and use the authorised coordination point.','सुपौल अभियंत्रण महाविद्यालय के आगमन मार्ग तक पानी पहुँचा है। परिसर के गेट से बचें और अधिकृत समन्वय केंद्र का उपयोग करें।','Urgent',hoursAgo(1),daysFromNow(1),hoursAgo(2),'Supaul','Supaul College of Engineering','Restricted',
  ]);
  ensureAlert('All routes blocked in Raghopur', [
    'All routes blocked in Raghopur','राघोपुर के सभी मार्ग अवरुद्ध','All listed approach routes in Raghopur are marked blocked in the coordination record. Do not attempt travel through the area; await an authorised route update.','समन्वय अभिलेख में राघोपुर के सभी सूचीबद्ध आगमन मार्ग अवरुद्ध हैं। क्षेत्र में यात्रा न करें; अधिकृत मार्ग अद्यतन की प्रतीक्षा करें।','Urgent',hoursAgo(2),daysFromNow(1),hoursAgo(3),'Raghopur','','Blocked',
  ]);
  db.prepare("UPDATE family_checkins SET name='Family Member 01' WHERE reference='IV-SUP-FAM-DEMO01' AND name='Demo family member'").run();
  if (!db.prepare("SELECT id FROM family_checkins WHERE reference='IV-SUP-FAM-DEMO01'").get()) {
    db.prepare(`INSERT INTO family_checkins (reference,access_hash,name,status,area,shelter_id,note,contact,simulated,created_by,created_at,updated_at)
      VALUES ('IV-SUP-FAM-DEMO01',?,'Family Member 01','At shelter','Supaul','SH-DEMO-01','Checked in at the listed coordination point.','Restricted contact',1,'demo-welfare-admin',?,?)`)
      .run(sha256('DEMO-FAMILY-26'), hoursAgo(2), hoursAgo(1));
  }
  const water = db.prepare("SELECT id FROM relief WHERE item='Packaged drinking water' AND simulated=1").get();
  if (water && !db.prepare("SELECT id FROM relief_deliveries WHERE id='IV-SUP-DLV-DEMO01'").get()) {
    db.prepare(`INSERT INTO relief_deliveries (id,item_id,quantity,destination,area,people_reached,status,note,created_by,created_at,updated_at,simulated)
      VALUES ('IV-SUP-DLV-DEMO01',?,20,'Supaul College of Engineering coordination point','Supaul',40,'In transit','Drinking water allocation for the college coordination point.','demo-welfare-admin',?,?,1)`)
      .run(water.id, hoursAgo(1), hoursAgo(1));
  }
  db.prepare("UPDATE reports SET location_text='Supaul College of Engineering',latitude=26.1080847,longitude=86.6033095,description='Water rising near the college approach and restricting access.',people_count=76,priority='Critical' WHERE reference='IV-SUP-DEMO01' AND simulated=1").run();
  const demoRisk = [
    ['IV-SUP-DEMO01', { waterLevelCm: 148, flowVelocityMs: 1.9, rainfall1hMm: 64, rainfall24hMm: 118, riseRateCmh: 15, peopleCount: 76, peopleTrapped: 11, vulnerableCount: 18, accessCondition: 'Restricted' }],
    ['IV-SUP-DEMO03', { waterLevelCm: 126, flowVelocityMs: 1.5, rainfall1hMm: 54, rainfall24hMm: 102, riseRateCmh: 13, peopleCount: 54, peopleTrapped: 7, vulnerableCount: 19, accessCondition: 'Blocked' }],
  ];
  const keys = Object.keys(riskColumns({}));
  const update = db.prepare(`UPDATE reports SET ${keys.map((key) => `${key}=@${key}`).join(',')} WHERE reference=@reference AND risk_score IS NULL`);
  demoRisk.forEach(([reference, values]) => update.run({ ...riskColumns(values), reference }));
}

if (!config.demoMode) {
  db.prepare("UPDATE users SET active = 0 WHERE id LIKE 'demo-%'").run();
}
