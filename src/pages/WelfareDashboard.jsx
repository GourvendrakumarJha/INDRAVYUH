import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowRight, BellRing, Boxes, CheckCircle2, ChevronRight, ClipboardCheck, Download, FileClock, FilePlus2, Filter, HandHelping, Landmark, MapPin, MessageSquareWarning, PackageMinus, Pencil, RefreshCw, Search, ShieldCheck, Siren, UsersRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useFetch } from '../lib/useFetch';
import { api, categoryLabel, downloadFile, formatDate, relativeTime } from '../lib/api';
import { EmptyState, ErrorState, Loading, Modal, PageHeader, StatCard, StatusBadge } from '../components/UI';
import { WorkspaceHeading, MiniBars } from '../components/WorkspaceComponents';
import { SupaulMap } from '../components/SupaulMap';
import { WelfareReportModal } from '../components/WelfareReportModal';
import { FieldReportComposer } from '../components/FieldReportComposer';
import { CommandResponseBoard } from '../components/ResponseBoard';
import { RiskAnalyticsPanel } from '../components/RiskDetails';
import { FamilySafetyManager } from '../components/FamilySafety';
import { LogisticsPanel } from '../components/LogisticsPanel';
import { ChiefCoordination } from '../components/ChiefCoordination';
import { SpecializedActionFeed } from '../components/SpecializedActionFeed';

const validSections = new Set(['', 'map', 'sos', 'reports', 'coordination', 'rescue', 'shelters', 'relief', 'alerts', 'analytics', 'audit']);

function ReportTable({ reports, onSelect }) {
  const { language, t } = useLanguage();
  if (!reports.length) return <EmptyState />;
  return <div className="table-wrap"><table className="data-table report-table"><thead><tr><th>Reference</th><th>Category</th><th>Location</th><th>{t('status')}</th><th>{t('priority')}</th><th>{t('updated')}</th><th><span className="sr-only">{t('actions')}</span></th></tr></thead><tbody>{reports.map((report) => <tr key={report.id} className={report.is_sos ? 'sos-row' : ''}><td data-label="Reference"><button className="reference-button" onClick={() => onSelect(report)}>{report.reference}</button>{Boolean(report.is_sos) && <span className="table-sos-label">SOS</span>}{report.risk_score != null && <small className="risk-table-score">{report.risk_score}/100 · {report.risk_band}</small>}</td><td data-label="Category">{categoryLabel(report.category, language)}<small className="table-subline">{report.source || 'Citizen'}</small></td><td data-label="Location">{report.location_text}</td><td data-label={t('status')}><StatusBadge status={report.status}>{report.status}</StatusBadge><small className="verification-small">{report.verification}</small></td><td data-label={t('priority')}><StatusBadge status={report.priority}>{report.priority}</StatusBadge></td><td data-label={t('updated')}>{relativeTime(report.updated_at, language)}</td><td><button className="icon-button" onClick={() => onSelect(report)} aria-label={`${t('details')} ${report.reference}`}><ChevronRight size={18} /></button></td></tr>)}</tbody></table></div>;
}

function Overview() {
  const { t, language } = useLanguage();
  const { data, loading, error, refresh } = useFetch('/api/welfare/overview');
  const [selected, setSelected] = useState(null);
  if (loading) return <Loading />; if (error) return <ErrorState message={error} onRetry={refresh} />;
  const { stats, shelter, recent, teams } = data;
  return <><WorkspaceHeading eyebrow="OPERATIONS OVERVIEW" title="Chief Administration command center" copy="A complete district view from citizen signal and measured risk to rescue, relief and recovery." actions={<button className="btn btn-outline btn-small" onClick={refresh}><RefreshCw size={15} />{t('refresh')}</button>} /><div className="stats-grid six-stats"><StatCard icon={Activity} label="Open incidents" value={stats.openIncidents} tone="teal" note="Not resolved or closed" /><StatCard icon={MessageSquareWarning} label="Awaiting review" value={stats.awaitingReview} tone="amber" note="Submitted / under review" /><StatCard icon={Siren} label="Open SOS queue" value={stats.sosQueue} tone="red" note="Authorised access only" /><StatCard icon={CheckCircle2} label="Verified & open" value={stats.verified} tone="blue" /><StatCard icon={UsersRound} label="Teams listed active" value={stats.activeTeams} tone="violet" note="Latest check-in" /><StatCard icon={Boxes} label="Low-stock items" value={stats.lowStock} tone="amber" note="Below configured minimum" /></div><div className="overview-grid"><section className="panel panel-large"><div className="panel-head"><div><span className="eyebrow">LATEST ACTIVITY</span><h2>Operational queue</h2></div><Link to="/welfare/reports" className="text-link">Open incident desk<ArrowRight size={16} /></Link></div><ReportTable reports={recent} onSelect={setSelected} /><WelfareReportModal report={selected} onClose={() => setSelected(null)} onSaved={refresh} /></section><div className="overview-side"><section className="panel"><div className="panel-head"><h2>Shelter status</h2><Landmark size={19} /></div><div className="shelter-capacity-ring" style={{ '--capacity': `${shelter.capacity ? Math.round(shelter.occupied / shelter.capacity * 100) : 0}%` }}><div><strong>{shelter.capacity ? Math.round(shelter.occupied / shelter.capacity * 100) : 0}%</strong><span>listed occupancy</span></div></div><div className="capacity-summary"><span><b>{shelter.occupied}</b> occupied</span><span><b>{shelter.capacity - shelter.occupied}</b> shown available</span></div><Link to="/welfare/shelters" className="btn btn-outline btn-block btn-small">Review shelter status</Link></section><section className="panel"><div className="panel-head"><h2>Team check-ins</h2><span className="panel-note">CHECK-INS</span></div><div className="team-mini-list">{teams.slice(0, 4).map((team) => <div key={team.id}><span className="team-avatar">{team.name.slice(-2)}</span><div><strong>{team.name}</strong><small>{relativeTime(team.last_checkin, language)}</small></div><StatusBadge status={team.status}>{team.status}</StatusBadge></div>)}</div></section></div></div><CommandResponseBoard /><SpecializedActionFeed items={data.specialized || []} compact /></>;
}

function IncidentDesk({ type }) {
  const { t } = useLanguage();
  const { data, loading, error, refresh } = useFetch(`/api/welfare/reports?type=${type}`);
  const [selected, setSelected] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [reportSource, setReportSource] = useState('all');
  const reports = useMemo(() => (data?.reports || []).filter((r) => (status === 'all' || r.status === status) && (reportSource === 'all' || (reportSource === 'citizen' ? r.source === 'Citizen' : r.source === 'Chief Administration field report')) && `${r.reference} ${r.location_text} ${r.description}`.toLowerCase().includes(search.toLowerCase())), [data, search, status, reportSource]);
  const isSos = type === 'sos';
  return <><WorkspaceHeading eyebrow={isSos ? 'RESTRICTED SOS QUEUE' : 'INCIDENT DESK'} title={isSos ? 'Active SOS' : 'Citizen & field reports'} copy={isSos ? 'Review, prioritise and coordinate requests with a complete event trail.' : 'Separate citizen observations from Chief Administration measured field reports; verify, prioritise, assign and publish eligible records.'} actions={<>{!isSos && <button className="btn btn-primary btn-small" onClick={() => setComposerOpen(true)}><FilePlus2 size={15} />New measured field report</button>}<button className="btn btn-outline btn-small" onClick={refresh}><RefreshCw size={15} />{t('refresh')}</button></>} />{!isSos && <div className="report-type-switch" role="group" aria-label="Report submission type">{[['all','All reports'],['citizen','Citizen submissions'],['field','Measured field reports']].map(([value,label]) => <button key={value} className={reportSource === value ? 'active' : ''} onClick={() => setReportSource(value)}>{label}</button>)}</div>}{isSos && <div className="restricted-banner"><Siren size={20} /><div><strong>Restricted SOS queue</strong><p>Personal details, exact points and attachments must never appear on public layers.</p></div></div>}<div className="list-toolbar workspace-toolbar"><label className="search-field"><Search size={17} /><input placeholder="Search reference, location or description" value={search} onChange={(e) => setSearch(e.target.value)} /></label><label className="select-filter"><Filter size={16} /><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option>{['Submitted','Under review','Verified','Assigned','In progress','Resolved','Closed'].map((v) => <option key={v}>{v}</option>)}</select></label><span className="record-count">{reports.length} records</span></div><section className="panel table-panel">{loading ? <Loading /> : error ? <ErrorState message={error} onRetry={refresh} /> : <ReportTable reports={reports} onSelect={setSelected} />}</section>{composerOpen && <FieldReportComposer onClose={() => setComposerOpen(false)} onSaved={refresh} />}<WelfareReportModal report={selected} onClose={() => setSelected(null)} onSaved={refresh} /></>;
}

function OperationsMap() {
  const { t } = useLanguage();
  const reports = useFetch('/api/welfare/reports');
  const teams = useFetch('/api/welfare/teams');
  const shelters = useFetch('/api/welfare/shelters');
  const risk = useFetch('/api/welfare/risk-analytics');
  const [layers, setLayers] = useState({ incidents: true, shelters: true, teams: false });
  const [selected, setSelected] = useState(null);
  const loading = reports.loading || teams.loading || shelters.loading;
  const error = reports.error || teams.error || shelters.error;
  return <><WorkspaceHeading eyebrow="RESTRICTED OPERATIONS LAYER" title={t('operationsMap')} copy="Precise report and SOS points are visible only in this authorised workspace. Team positions are hidden until selected." /><div className="ops-map-toolbar"><div><label><input type="checkbox" checked={layers.incidents} onChange={(e) => setLayers({ ...layers, incidents: e.target.checked })} /><i className="legend-dot incident-dot" />Incidents & SOS <b>{reports.data?.reports?.length || 0}</b></label><label><input type="checkbox" checked={layers.shelters} onChange={(e) => setLayers({ ...layers, shelters: e.target.checked })} /><i className="legend-dot shelter-dot" />Shelters <b>{shelters.data?.shelters?.length || 0}</b></label><label><input type="checkbox" checked={layers.teams} onChange={(e) => setLayers({ ...layers, teams: e.target.checked })} /><i className="legend-dot team-dot" />Teams <b>{teams.data?.teams?.length || 0}</b></label></div><span className="map-boundary-label">SUPAUL BOUNDS</span></div><section className="panel ops-map-panel">{loading ? <Loading /> : error ? <ErrorState message={error} /> : <SupaulMap incidents={reports.data.reports} teams={teams.data.teams} shelters={shelters.data.shelters} showIncidents={layers.incidents} showShelters={layers.shelters} showTeams={layers.teams} onSelect={(record) => { if (!record.type) setSelected(record); }} />}<div className="ops-map-footer"><span><ShieldCheck size={15} />Restricted precise locations</span><span>Boundary & localities © OpenStreetMap contributors</span></div></section>{risk.data ? <RiskAnalyticsPanel data={risk.data} onOpenReport={setSelected} /> : risk.loading ? <Loading label="Loading risk analysis…" /> : <ErrorState message={risk.error} onRetry={risk.refresh} />}<WelfareReportModal report={selected} onClose={() => setSelected(null)} onSaved={() => { reports.refresh(); risk.refresh(); }} /></>;
}

function Coordination() { return <ChiefCoordination />; }

function RescueTeams() {
  const { language } = useLanguage();
  const { data, loading, error, refresh } = useFetch('/api/welfare/teams');
  const update = async (id, status) => { await api(`/api/welfare/teams/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); refresh(); };
  return <><WorkspaceHeading eyebrow="RESOURCE COORDINATION" title="Rescue teams & assignments" copy="Update availability and assignments. Every change is audited." />{loading ? <Loading /> : error ? <ErrorState message={error} onRetry={refresh} /> : <><div className="rescue-team-grid">{data.teams.map((team) => <article className="rescue-team-card" key={team.id}><div className="team-card-head"><span className="team-avatar large">{team.name.slice(-2)}</span><StatusBadge status={team.status}>{team.status}</StatusBadge></div><h2>{team.name}</h2><p>{team.type} · {team.members} members</p><div className="team-checkin">Last check-in <strong>{formatDate(team.last_checkin, language)}</strong></div><label className="field"><span>Operational status</span><select value={team.status} onChange={(e) => update(team.id, e.target.value)}>{['Available','Assigned','En route','On task','Unavailable'].map((v) => <option key={v}>{v}</option>)}</select></label><div className="assigned-tasks"><h3>Assigned open tasks</h3>{data.tasks.filter((task) => task.assigned_team === team.id).map((task) => <div key={task.id}><span>{task.reference}</span><StatusBadge status={task.priority}>{task.priority}</StatusBadge></div>)}{!data.tasks.some((task) => task.assigned_team === team.id) && <p>No open assigned tasks.</p>}</div></article>)}</div><div className="info-callout"><AlertTriangle size={19} /><p>Precise team positions stay inside the authorised operations workspace.</p></div></>}</>;
}

function Shelters() {
  const { language } = useLanguage();
  const { data, loading, error, refresh } = useFetch('/api/welfare/shelters');
  const [mode, setMode] = useState('shelters');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [saveError, setSaveError] = useState('');
  const open = (s) => { setEditing(s); setForm({ capacity: s.capacity, occupied: s.occupied, status: s.status, accessibility: s.accessibility }); setSaveError(''); };
  const save = async (e) => {
    e.preventDefault();
    try { await api(`/api/welfare/shelters/${editing.id}`, { method: 'PATCH', body: JSON.stringify({ ...form, capacity: Number(form.capacity), occupied: Number(form.occupied) }) }); setEditing(null); refresh(); }
    catch (err) { setSaveError(err.message); }
  };
  return <>
    <WorkspaceHeading eyebrow="SHELTER & FAMILY OPERATIONS" title="Shelters and family safety" copy="Update listed shelter capacity, accessibility and privacy-protected family check-ins." />
    <div className="coordination-actions" role="group" aria-label="Shelter workspace">
      <button className={`btn ${mode === 'shelters' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMode('shelters')}><Landmark size={17} />Shelter network</button>
      <button className={`btn ${mode === 'family' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMode('family')}><UsersRound size={17} />Family check-ins</button>
    </div>
    {mode === 'family' ? <FamilySafetyManager shelters={data?.shelters || []} /> : loading ? <Loading /> : error ? <ErrorState message={error} onRetry={refresh} /> : <div className="ops-shelter-grid">{data.shelters.map((shelter) => <article className="panel ops-shelter-card" key={shelter.id}><div className="panel-head"><span className="shelter-icon"><Landmark size={21} /></span></div><span className="eyebrow">{shelter.id} · {shelter.area}</span><h2>{shelter.name}</h2><StatusBadge status={shelter.status}>{shelter.status}</StatusBadge><div className="ops-capacity"><div><strong>{shelter.occupied}</strong><span>occupied</span></div><div><strong>{shelter.capacity - shelter.occupied}</strong><span>shown available</span></div><div><strong>{shelter.capacity}</strong><span>capacity</span></div></div><p>{shelter.accessibility}</p><small>Last confirmed {formatDate(shelter.last_confirmed, language)}</small><button className="btn btn-outline btn-block" onClick={() => open(shelter)}><Pencil size={15} />Update shelter</button></article>)}</div>}
    <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={`Update ${editing?.name || ''}`}><form className="modal-form" onSubmit={save}><div className="form-grid"><label className="field"><span>Capacity</span><input type="number" min="0" value={form?.capacity ?? ''} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required /></label><label className="field"><span>Occupied</span><input type="number" min="0" value={form?.occupied ?? ''} onChange={(e) => setForm({ ...form, occupied: e.target.value })} required /></label></div><label className="field"><span>Status label</span><input value={form?.status || ''} onChange={(e) => setForm({ ...form, status: e.target.value })} required /></label><label className="field"><span>Accessibility note</span><textarea rows="3" value={form?.accessibility || ''} onChange={(e) => setForm({ ...form, accessibility: e.target.value })} /></label>{saveError && <div className="form-error">{saveError}</div>}<button className="btn btn-primary btn-block">Save shelter update</button></form></Modal>
  </>;
}
function Relief() {
  const { language } = useLanguage();
  const { data, loading, error, refresh } = useFetch('/api/welfare/logistics');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ adjustment: '', note: '' });
  const [saveError, setSaveError] = useState('');
  const save = async (e) => { e.preventDefault(); try { await api(`/api/welfare/relief/${editing.id}`, { method: 'PATCH', body: JSON.stringify({ adjustment: Number(form.adjustment), note: form.note }) }); setEditing(null); setForm({ adjustment: '', note: '' }); refresh(); } catch (err) { setSaveError(err.message); } };
  return <><WorkspaceHeading eyebrow="RELIEF TRACKING" title="Relief inventory" copy="Record stock additions or distributions. Negative stock is rejected; every adjustment is audited." />{loading && !data ? <Loading /> : error ? <ErrorState message={error} onRetry={refresh} /> : <><section className="panel table-panel"><div className="table-wrap"><table className="data-table"><thead><tr><th>Item</th><th>Category</th><th>Location</th><th>Current stock</th><th>Minimum</th><th>Updated</th><th>Action</th></tr></thead><tbody>{data.relief.map((item) => <tr key={item.id}><td data-label="Item"><strong>{item.item}</strong>{item.quantity < item.min_stock && <StatusBadge status="Low stock">Low stock</StatusBadge>}</td><td data-label="Category">{item.category}</td><td data-label="Location">{item.location}</td><td data-label="Current stock"><strong>{item.quantity} {item.unit}</strong></td><td data-label="Minimum">{item.min_stock} {item.unit}</td><td data-label="Updated">{relativeTime(item.updated_at, language)}</td><td><button className="btn btn-small btn-outline" onClick={() => { setEditing(item); setSaveError(''); }}><PackageMinus size={14} />Adjust</button></td></tr>)}</tbody></table></div></section><LogisticsPanel data={data} refresh={refresh} /></>}<Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={`Adjust ${editing?.item || ''}`}><form className="modal-form" onSubmit={save}><p>Current stock: <strong>{editing?.quantity} {editing?.unit}</strong></p><label className="field"><span>Adjustment (use a negative number for distribution)</span><input type="number" step="any" value={form.adjustment} onChange={(e) => setForm({ ...form, adjustment: e.target.value })} required placeholder="-20" /></label><label className="field"><span>Reason / distribution note</span><textarea rows="3" minLength="3" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} required /></label>{saveError && <div className="form-error">{saveError}</div>}<button className="btn btn-primary btn-block">Record stock adjustment</button></form></Modal></>;
}

function Alerts() {
  const { language, field } = useLanguage();
  const { user } = useAuth();
  const { data, loading, error, refresh } = useFetch('/api/welfare/alerts');
  const [open, setOpen] = useState(false);
  const blank = { titleEn: '', titleHi: '', bodyEn: '', bodyHi: '', area: 'Supaul', landmark: '', routeStatus: 'Not specified', severity: 'Information', source: 'Authorised operating organisation', publish: false };
  const [form, setForm] = useState(blank);
  const [saveError, setSaveError] = useState('');
  const save = async (e) => { e.preventDefault(); try { await api('/api/welfare/alerts', { method: 'POST', body: JSON.stringify(form) }); setOpen(false); setForm(blank); refresh(); } catch (err) { setSaveError(err.message); } };
  const publish = async (id) => { await api(`/api/welfare/alerts/${id}/publish`, { method: 'PATCH' }); refresh(); };
  const admin = user.role.endsWith('_admin');
  return <><WorkspaceHeading eyebrow="PUBLIC COMMUNICATION" title="Alerts & advisories" copy="Draft in English and Hindi. Publication requires a Chief Administrator and records an audit event." actions={<button className="btn btn-primary" onClick={() => setOpen(true)}><FilePlus2 size={16} />New advisory</button>} />{loading ? <Loading /> : error ? <ErrorState message={error} onRetry={refresh} /> : <div className="ops-alert-list">{data.alerts.map((alert) => <article className="panel ops-alert" key={alert.id}><div><StatusBadge status={alert.severity}>{alert.severity}</StatusBadge><StatusBadge status={alert.status}>{alert.status}</StatusBadge></div><span className="alert-area-line"><MapPin size={14} />{alert.area}{alert.landmark ? ` · ${alert.landmark}` : ''}{alert.route_status && alert.route_status !== 'Not specified' ? ` · Routes: ${alert.route_status}` : ''}</span><h2>{field(alert, 'title')}</h2><p>{field(alert, 'body')}</p><small>{alert.source} · {formatDate(alert.published_at || alert.created_at, language)}</small>{alert.status === 'Draft' && admin && <button className="btn btn-small btn-primary" onClick={() => publish(alert.id)}>Publish advisory</button>}</article>)}</div>}<Modal open={open} onClose={() => setOpen(false)} title="Create bilingual advisory" wide><form className="modal-form" onSubmit={save}><div className="form-grid"><label className="field"><span>English title</span><input value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} required /></label><label className="field"><span>हिन्दी शीर्षक</span><input value={form.titleHi} onChange={(e) => setForm({ ...form, titleHi: e.target.value })} required /></label><label className="field"><span>Affected area *</span><input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} minLength="3" required placeholder="e.g. Raghopur" /></label><label className="field"><span>Specific landmark</span><input value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} placeholder="e.g. Supaul College of Engineering" /></label><label className="field"><span>Route condition *</span><select value={form.routeStatus} onChange={(e) => setForm({ ...form, routeStatus: e.target.value })}>{['Not specified','Open','Restricted','Blocked','Under review'].map((value) => <option key={value}>{value}</option>)}</select></label><label className="field"><span>English notice</span><textarea rows="5" value={form.bodyEn} onChange={(e) => setForm({ ...form, bodyEn: e.target.value })} required /></label><label className="field"><span>हिन्दी सूचना</span><textarea rows="5" value={form.bodyHi} onChange={(e) => setForm({ ...form, bodyHi: e.target.value })} required /></label><label className="field"><span>Severity</span><select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>{['Information','Preparedness','Advisory','Urgent'].map((v) => <option key={v}>{v}</option>)}</select></label><label className="field"><span>Source / responsible organisation</span><input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} required /></label></div>{admin && <label className="toggle-field"><input type="checkbox" checked={form.publish} onChange={(e) => setForm({ ...form, publish: e.target.checked })} /><span><strong>Publish immediately</strong><small>Leave off to save as draft for later review.</small></span></label>}{saveError && <div className="form-error">{saveError}</div>}<button className="btn btn-primary">Create advisory</button></form></Modal></>;
}

function Analytics() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useFetch('/api/welfare/analytics');
  const risk = useFetch('/api/welfare/risk-analytics');
  const [selected, setSelected] = useState(null);
  const [exportError, setExportError] = useState('');
  const exportCsv = async () => { setExportError(''); try { await downloadFile('/api/welfare/export/reports.csv', 'indravyuh-report-register.csv'); } catch (requestError) { setExportError(requestError.message); } };
  if (loading) return <Loading />; if (error) return <ErrorState message={error} onRetry={refresh} />;
  return <><WorkspaceHeading eyebrow="DESCRIPTIVE ANALYTICS" title="Situation analytics" copy={data.note} actions={user.role.endsWith('_admin') && <button className="btn btn-outline" onClick={exportCsv}><Download size={16} />Export de-identified CSV</button>} />{exportError && <div className="form-error">{exportError}</div>}<div className="analytics-summary"><StatCard icon={ClipboardCheck} label="Average resolution time" value={data.timing.average_hours == null ? '—' : `${data.timing.average_hours}h`} note="Not a service-level commitment" /><StatCard icon={MessageSquareWarning} label="Total reports" value={data.categories.reduce((sum, row) => sum + row.count, 0)} /><StatCard icon={CheckCircle2} label="Verified records" value={data.verification.find((v) => v.verification === 'Verified')?.count || 0} /></div><div className="analytics-grid"><section className="panel"><div className="panel-head"><h2>Reports by category</h2></div><MiniBars data={data.categories} labelKey="category" /></section><section className="panel"><div className="panel-head"><h2>Workflow status</h2></div><MiniBars data={data.statuses} labelKey="status" color="blue" /></section><section className="panel"><div className="panel-head"><h2>Verification state</h2></div><MiniBars data={data.verification} labelKey="verification" color="amber" /></section><section className="panel"><div className="panel-head"><h2>Daily submission volume</h2></div><MiniBars data={data.daily} labelKey="date" color="violet" /></section></div>{risk.data ? <RiskAnalyticsPanel data={risk.data} onOpenReport={setSelected} /> : risk.loading ? <Loading label="Loading risk analytics…" /> : <ErrorState message={risk.error} onRetry={risk.refresh} />}<WelfareReportModal report={selected} onClose={() => setSelected(null)} onSaved={() => { refresh(); risk.refresh(); }} /></>;
}

function Audit() {
  const { language } = useLanguage();
  const { data, loading, error, refresh } = useFetch('/api/welfare/audit');
  return <><WorkspaceHeading eyebrow="ADMINISTRATOR ONLY" title="Audit history" copy="Sensitive actions, authentication and operational changes. Public submissions appear without a signed-in user." />{loading ? <Loading /> : error ? <ErrorState message={error} onRetry={refresh} /> : <section className="panel table-panel"><div className="table-wrap"><table className="data-table"><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>IP</th><th>Details</th></tr></thead><tbody>{data.logs.map((log) => <tr key={log.id}><td>{formatDate(log.created_at, language)}</td><td>{log.user_name || 'System / public'}</td><td><strong>{log.action}</strong></td><td>{log.entity_type} {log.entity_id && <small>· {log.entity_id}</small>}</td><td><code>{log.ip}</code></td><td><details><summary>View</summary><pre>{log.details}</pre></details></td></tr>)}</tbody></table></div></section>}</>;
}

export default function WelfareDashboard() {
  const { section = '' } = useParams();
  if (!validSections.has(section)) return <Navigate to="/welfare" replace />;
  switch (section) {
    case 'map': return <OperationsMap />;
    case 'sos': return <IncidentDesk type="sos" />;
    case 'reports': return <IncidentDesk type="reports" />;
    case 'coordination': return <Coordination />;
    case 'rescue': return <RescueTeams />;
    case 'shelters': return <Shelters />;
    case 'relief': return <Relief />;
    case 'alerts': return <Alerts />;
    case 'analytics': return <Analytics />;
    case 'audit': return <Audit />;
    default: return <Overview />;
  }
}
