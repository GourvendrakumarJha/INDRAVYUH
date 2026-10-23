import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Activity, BellRing, CalendarDays, CheckCircle2, ClipboardCheck, Clock3, FileText, ListChecks, LocateFixed, PackageCheck, Plus, Radar, RadioTower, RefreshCw, Send, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useFetch } from '../lib/useFetch';
import { api, categoryLabel, formatDate } from '../lib/api';
import { EmptyState, ErrorState, Loading, Modal, StatCard, StatusBadge } from '../components/UI';
import { WorkspaceHeading } from '../components/WorkspaceComponents';

const valid = new Set(['', 'tasks', 'notices', 'leave', 'documents', 'profile']);
const taskStatuses = ['To do', 'In progress', 'Blocked', 'Completed'];
const taskMeta = {
  general: { label: 'General coordination', icon: ClipboardCheck },
  citizen_verification: { label: 'Citizen verification', icon: ShieldCheck },
  monitoring: { label: 'Monitoring', icon: Radar },
  communication: { label: 'Communication', icon: RadioTower },
  relief_supply: { label: 'Relief supply', icon: PackageCheck },
  tracking: { label: 'Tracking', icon: LocateFixed },
  notification: { label: 'Notification push', icon: Send },
};
const metaFor = (type) => taskMeta[type] || taskMeta.general;

function TaskList({ tasks, onUpdate, onComplete, compact = false }) {
  const { language } = useLanguage();
  if (!tasks.length) return <EmptyState title="No specialized actions in this view" />;
  return <div className="employee-task-list specialized-task-list">{tasks.map((task) => {
    const meta = metaFor(task.task_type);
    const Icon = meta.icon;
    return <article className={`employee-task specialized-task task-${task.task_type}`} key={task.id}>
      <div className="task-check"><Icon size={21} /></div>
      <div className="employee-task-content">
        <div className="specialized-task-labels"><span className="task-type-label">{meta.label}</span><StatusBadge status={task.priority}>{task.priority}</StatusBadge><span><CalendarDays size={14} />{formatDate(task.due_date, language, false)}</span></div>
        <h3>{task.title}</h3>
        <div className="task-links">{task.report_reference && <span className="task-report-ref">Report · {task.report_reference}</span>}{task.delivery_id && <span className="task-report-ref">Delivery · {task.delivery_id}</span>}</div>
        {!compact && <p>{task.description}</p>}
        {!compact && task.task_type === 'citizen_verification' && task.verification_description && <div className="citizen-verification-evidence"><span>{categoryLabel(task.verification_category, language)} · {task.verification_location}</span><p>{task.verification_description}</p><small>Current Chief Administration state: {task.report_verification}</small></div>}
        {!compact && task.task_type === 'relief_supply' && <div className="task-operation-detail"><PackageCheck size={16} />{task.delivery_quantity} {task.relief_unit} {task.relief_item} → {task.delivery_destination} · {task.delivery_status}</div>}
        {task.status === 'Completed' && <div className="task-completion-result"><CheckCircle2 size={16} /><div><strong>{task.completion_outcome || 'Completion submitted'}</strong><p>{task.result_note || 'Status updated.'}</p></div></div>}
      </div>
      <label className="task-status-select"><span className="sr-only">Status for {task.title}</span>{task.status === 'Completed' ? <StatusBadge status="Completed">Completed</StatusBadge> : <select value={task.status} onChange={(event) => event.target.value === 'Completed' && task.task_type !== 'general' ? onComplete(task) : onUpdate(task.id, event.target.value)}>{taskStatuses.map((status) => <option key={status}>{status}</option>)}</select>}</label>
    </article>;
  })}</div>;
}

function TaskWorkspace({ tasks, refresh, compact = false }) {
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState('Verified');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const update = async (id, status) => {
    setError(''); setMessage('');
    try { await api(`/api/employee/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); setMessage('Task status updated.'); refresh(); }
    catch (requestError) { setError(requestError.message); }
  };
  const openCompletion = (task) => { setSelected(task); setNote(''); setOutcome('Verified'); setError(''); setMessage(''); };
  const complete = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const response = await api(`/api/employee/tasks/${selected.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'Completed', resultNote: note, outcome: selected.task_type === 'citizen_verification' ? outcome : undefined }) });
      setSelected(null);
      setMessage(response.reportVerification ? `Verification submitted to Chief Administration · ${response.reportVerification}` : response.deliveryStatus ? 'Relief delivery marked Delivered in Chief Administration.' : response.notificationPushed ? 'Internal notification pushed to the action network.' : 'Completion updated in Chief Administration.');
      refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };
  return <>
    {(error || message) && <div className={error ? 'form-error' : 'inline-message'} role="status">{error || message}</div>}
    <TaskList tasks={tasks} onUpdate={update} onComplete={openCompletion} compact={compact} />
    <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={`Complete · ${selected ? metaFor(selected.task_type).label : ''}`}>
      {selected && <form className="modal-form" onSubmit={complete}>
        <div className="completion-task-summary"><span>{selected.title}</span>{selected.report_reference && <strong>{selected.report_reference}</strong>}{selected.delivery_id && <strong>{selected.delivery_id}</strong>}</div>
        {selected.task_type === 'citizen_verification' && <label className="field"><span>Verification outcome *</span><select value={outcome} onChange={(event) => setOutcome(event.target.value)}><option>Verified</option><option>Needs follow-up</option></select><small className="field-help">This outcome updates the linked report in Chief Administration.</small></label>}
        {selected.task_type === 'relief_supply' && <p className="form-intro"><PackageCheck size={17} />Completion marks the assigned in-transit delivery as Delivered.</p>}
        {selected.task_type === 'notification' && <p className="form-intro"><BellRing size={17} />Completion pushes your note as an internal notification.</p>}
        <label className="field"><span>Completion / verification note *</span><textarea rows="5" minLength="5" maxLength="1500" value={note} onChange={(event) => setNote(event.target.value)} required placeholder="Record what was checked, communicated, tracked or delivered" /></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="btn btn-primary btn-block" disabled={saving}><CheckCircle2 size={17} />{saving ? 'Submitting…' : 'Submit to Chief Administration'}</button>
      </form>}
    </Modal>
  </>;
}

function Overview() {
  const { language } = useLanguage();
  const { data, loading, error, refresh } = useFetch('/api/employee/overview');
  if (loading) return <Loading />; if (error) return <ErrorState message={error} onRetry={refresh} />;
  const count = (status) => data.taskStats.find((item) => item.status === status)?.count || 0;
  const typeCount = (type) => data.typeStats.find((item) => item.task_type === type)?.count || 0;
  return <>
    <WorkspaceHeading eyebrow="SPECIALIZED ACTION NETWORK" title="Specialized Action workspace" copy="Online assignments from Chief Administration: verify, monitor, communicate, track, notify and complete relief actions." actions={<Link to="/employee/tasks" className="btn btn-primary btn-small">Open live queue</Link>} />
    <div className="stats-grid employee-stats"><StatCard icon={ListChecks} label="To do" value={count('To do')} tone="blue" /><StatCard icon={Clock3} label="In progress" value={count('In progress')} tone="amber" /><StatCard icon={CheckCircle2} label="Completed" value={count('Completed')} tone="teal" /><StatCard icon={ShieldCheck} label="Citizen verification" value={typeCount('citizen_verification')} tone="violet" /></div>
    <div className="employee-overview-grid"><section className="employee-panel"><div className="employee-panel-head"><div><span className="eyebrow">PRIORITY ACTION</span><h2>My upcoming assignments</h2></div><Link to="/employee/tasks">View all</Link></div><TaskWorkspace tasks={data.tasks} refresh={refresh} compact /></section><div><section className="employee-panel"><div className="employee-panel-head"><h2>Latest notifications</h2><BellRing size={19} /></div><div className="notice-mini-list">{data.notices.slice(0, 3).map((notice) => <article key={notice.id}><span>{formatDate(notice.created_at, language, false)}</span><h3>{notice.title}</h3><p>{notice.body}</p></article>)}</div></section><section className="employee-panel staff-boundary-card"><ShieldCheck size={24} /><h3>Least-privilege action workspace</h3><p>Your Specialized Action role cannot call Chief Administration or Business APIs. You can update only your own assignments. Citizen contact, precise coordinates and attachments remain restricted.</p></section></div></div>
  </>;
}

function Tasks() {
  const { data, loading, error, refresh } = useFetch('/api/employee/tasks');
  const [filter, setFilter] = useState('all');
  useEffect(() => { const timer = setInterval(refresh, 20000); return () => clearInterval(timer); }, [refresh]);
  const tasks = useMemo(() => (data?.tasks || []).filter((task) => filter === 'all' || task.task_type === filter), [data, filter]);
  return <>
    <WorkspaceHeading eyebrow="LIVE SPECIALIZED ACTION QUEUE" title="Assignments & outcomes" copy="Start an online assignment, then submit its outcome to Chief Administration. Completed actions are locked against duplicate updates." actions={<button className="btn btn-outline btn-small" onClick={refresh}><RefreshCw size={15} />Refresh</button>} />
    <div className="task-filter-bar" role="group" aria-label="Filter action type">{['all', 'citizen_verification', 'monitoring', 'communication', 'relief_supply', 'tracking', 'notification', 'general'].map((type) => <button key={type} className={filter === type ? 'active' : ''} onClick={() => setFilter(type)}>{type === 'all' ? 'All actions' : metaFor(type).label}<span>{type === 'all' ? data?.tasks?.length || 0 : data?.tasks?.filter((task) => task.task_type === type).length || 0}</span></button>)}</div>
    <div className="live-queue-note"><Activity size={15} /><span>Online queue · refreshes every 20 seconds</span></div>
    {loading && !data ? <Loading /> : error ? <ErrorState message={error} onRetry={refresh} /> : <section className="employee-panel"><TaskWorkspace tasks={tasks} refresh={refresh} /></section>}
  </>;
}

function Notices() {
  const { language } = useLanguage();
  const { data, loading, error, refresh } = useFetch('/api/employee/notices');
  return <><WorkspaceHeading eyebrow="INTERNAL COMMUNICATION" title="Notifications" copy="Updates for your Specialized Action workspace, including completed notification assignments." />{loading ? <Loading /> : error ? <ErrorState message={error} onRetry={refresh} /> : <div className="employee-notice-grid">{data.notices.map((notice) => <article className="employee-panel notice-card" key={notice.id}><div><BellRing size={21} /><span>{formatDate(notice.created_at, language)}</span></div><h2>{notice.title}</h2><p>{notice.body}</p></article>)}</div>}</>;
}

function Leave() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { data, loading, error, refresh } = useFetch('/api/employee/leave');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [saveError, setSaveError] = useState('');
  const create = async (event) => { event.preventDefault(); try { await api('/api/employee/leave', { method: 'POST', body: JSON.stringify(form) }); setOpen(false); setForm({ startDate: '', endDate: '', reason: '' }); refresh(); } catch (err) { setSaveError(err.message); } };
  const review = async (id, status) => { await api(`/api/employee/leave/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); refresh(); };
  const admin = user.role === 'employee_admin';
  return <><WorkspaceHeading eyebrow="STAFF SELF-SERVICE" title="Leave requests" copy={admin ? 'Submit your own request and review staff requests.' : 'Submit and track your own leave requests.'} actions={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={16} />Request leave</button>} />{loading ? <Loading /> : error ? <ErrorState message={error} onRetry={refresh} /> : data.leave.length ? <section className="employee-panel table-panel"><div className="table-wrap"><table className="data-table"><thead><tr>{admin && <th>Employee</th>}<th>Dates</th><th>Reason</th><th>Requested</th><th>Status</th>{admin && <th>Review</th>}</tr></thead><tbody>{data.leave.map((leave) => <tr key={leave.id}>{admin && <td><strong>{leave.employee_name}</strong><small className="table-subline">{leave.department}</small></td>}<td>{formatDate(leave.start_date, language, false)} — {formatDate(leave.end_date, language, false)}</td><td>{leave.reason}</td><td>{formatDate(leave.created_at, language)}</td><td><StatusBadge status={leave.status}>{leave.status}</StatusBadge></td>{admin && <td><div className="table-actions"><button className="btn btn-small btn-outline" onClick={() => review(leave.id, 'Approved')}>Approve</button><button className="btn btn-small btn-ghost" onClick={() => review(leave.id, 'Declined')}>Decline</button></div></td>}</tr>)}</tbody></table></div></section> : <EmptyState />}<Modal open={open} onClose={() => setOpen(false)} title="Request leave"><form className="modal-form" onSubmit={create}><div className="form-grid"><label className="field"><span>Start date</span><input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required /></label><label className="field"><span>End date</span><input type="date" value={form.endDate} min={form.startDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} required /></label></div><label className="field"><span>Reason</span><textarea rows="4" minLength="5" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} required /></label>{saveError && <div className="form-error">{saveError}</div>}<button className="btn btn-primary btn-block">Submit leave request</button></form></Modal></>;
}

const documents = [
  { id: 1, icon: ShieldCheck, title: 'Data handling guide', type: 'INTERNAL GUIDE', copy: 'Protect citizen records, restrict access and follow the retention policy.', sections: ['Confirm the active deployment configuration.', 'Restrict citizen contact and incident details.', 'Do not screenshot restricted SOS or precise locations.', 'Record retention and deletion decisions before live use.'] },
  { id: 2, icon: ClipboardCheck, title: 'Verification protocol', type: 'ACTION GUIDE', copy: 'Review only the shared citizen evidence needed for your assignment.', sections: ['Open the assigned citizen verification task.', 'Review the category, area and citizen observation.', 'Choose Verified or Needs follow-up.', 'Add a factual completion note for Chief Administration.'] },
  { id: 3, icon: PackageCheck, title: 'Relief and notification protocol', type: 'ACTION GUIDE', copy: 'Complete delivery and internal notification assignments without duplicating outcomes.', sections: ['Confirm the assigned delivery or notification task.', 'Record the actual result in the completion note.', 'Submit only after the action is complete.', 'Check the updated state in Chief Administration.'] },
];
function Documents() {
  const [selected, setSelected] = useState(null);
  return <><WorkspaceHeading eyebrow="INTERNAL RESOURCES" title="Action guides" copy="Operational documentation embedded in this protected Specialized Action workspace." /><div className="document-grid">{documents.map(({ icon: Icon, ...doc }) => <article className="employee-panel document-card" key={doc.id}><Icon size={26} /><span className="eyebrow">{doc.type}</span><h2>{doc.title}</h2><p>{doc.copy}</p><button className="btn btn-outline" onClick={() => setSelected(doc)}>Open document</button></article>)}</div><Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.title || ''}><span className="eyebrow">{selected?.type}</span><p>{selected?.copy}</p><ol className="document-steps">{selected?.sections.map((section) => <li key={section}>{section}</li>)}</ol><button className="btn btn-outline" onClick={() => window.print()}>Print</button></Modal></>;
}

function Profile() {
  const { language } = useLanguage();
  const { data, loading, error, refresh } = useFetch('/api/employee/profile');
  if (loading) return <Loading />; if (error) return <ErrorState message={error} onRetry={refresh} />;
  return <><WorkspaceHeading eyebrow="MY ACCOUNT" title="Profile & activity" copy="Your assigned identity and your own recent Specialized Action events." /><div className="profile-grid"><section className="employee-panel profile-card"><span className="profile-avatar">{data.user.name.charAt(0)}</span><h2>{data.user.name}</h2><p>{data.user.jobTitle}</p><StatusBadge status="Active">Specialized Action</StatusBadge><dl className="business-details"><div><dt>Login ID</dt><dd><code>{data.user.loginId}</code></dd></div><div><dt>Department</dt><dd>{data.user.department}</dd></div><div><dt>Workspace</dt><dd>Specialized Action only</dd></div></dl></section><section className="employee-panel"><div className="employee-panel-head"><h2>My recent activity</h2><UserRound size={19} /></div><div className="profile-activity">{data.audits.length ? data.audits.map((audit, index) => <div key={index}><span /><div><strong>{audit.action}</strong><p>{audit.entity_type} {audit.entity_id && `· ${audit.entity_id}`}</p><small>{formatDate(audit.created_at, language)}</small></div></div>) : <EmptyState />}</div></section></div></>;
}

export default function EmployeeDashboard() {
  const { section = '' } = useParams();
  if (!valid.has(section)) return <Navigate to="/employee" replace />;
  switch (section) { case 'tasks': return <Tasks />; case 'notices': return <Notices />; case 'leave': return <Leave />; case 'documents': return <Documents />; case 'profile': return <Profile />; default: return <Overview />; }
}
