import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BookOpenCheck, Building2, CheckCircle2, CreditCard, FileClock, FilePlus2, HandHelping, Headphones, Mail, PackageCheck, Pencil, Plus, Settings2, ShieldCheck, UserPlus, UsersRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useFetch } from '../lib/useFetch';
import { api, formatDate } from '../lib/api';
import { EmptyState, ErrorState, Loading, Modal, StatCard, StatusBadge } from '../components/UI';
import { MiniBars, WorkspaceHeading } from '../components/WorkspaceComponents';

const valid = new Set(['', 'organisation', 'members', 'services', 'coordination', 'billing', 'implementation', 'analytics', 'support', 'audit']);
const money = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

function Overview() {
  const { data, loading, error, refresh } = useFetch('/api/business/overview');
  if (loading) return <Loading />; if (error) return <ErrorState message={error} onRetry={refresh} />;
  const completed = data.tasks.find((t) => t.status === 'Completed')?.count || 0;
  const totalTasks = data.tasks.reduce((sum, t) => sum + t.count, 0);
  const due = data.invoices.find((i) => i.status !== 'Paid');
  return <><WorkspaceHeading eyebrow="BUSINESS OVERVIEW" title={`Welcome, ${data.organisation.name}`} copy="Your organisation’s service account—separate from Chief Administration operations and citizen data." /><div className="stats-grid business-stats"><StatCard icon={PackageCheck} label="Current plan" value={data.organisation.plan} note={data.organisation.status} tone="blue" /><StatCard icon={Settings2} label="Onboarding" value={`${totalTasks ? Math.round(completed / totalTasks * 100) : 0}%`} note={`${completed} of ${totalTasks} tasks complete`} tone="teal" /><StatCard icon={Headphones} label="Open support tickets" value={data.openTickets} tone="amber" /><StatCard icon={HandHelping} label="Coordination requests" value={data.openCoordination} tone="blue" /><StatCard icon={UsersRound} label="Active members" value={data.members} tone="violet" /></div><div className="business-overview-grid"><section className="business-panel service-summary"><div className="business-panel-head"><div><span className="eyebrow">SERVICE SUMMARY</span><h2>{data.organisation.plan}</h2></div><StatusBadge status={data.organisation.status}>{data.organisation.status}</StatusBadge></div><p>Configuration, bilingual interface support and operational assistance for your organisation.</p><div className="service-checks"><span><CheckCircle2 size={17} />Organisation-scoped account</span><span><CheckCircle2 size={17} />English / Hindi workspace</span><span><CheckCircle2 size={17} />Implementation tasks</span></div>{due && <div className="renewal-note"><CreditCard size={20} /><div><strong>{money(due.amount)} · {due.status}</strong><span>Due {formatDate(due.due_date, 'en', false)} · {due.number}</span></div></div>}</section><section className="business-panel"><div className="business-panel-head"><h2>Implementation progress</h2><span>{completed}/{totalTasks}</span></div><div className="large-progress"><span style={{ width: `${totalTasks ? completed / totalTasks * 100 : 0}%` }} /></div><p>Complete operational, configuration and data-governance steps before any pilot activation.</p><a href="/business/implementation" className="text-link">View implementation<ArrowRight size={16} /></a></section><section className="business-panel"><div className="business-panel-head"><h2>Recent invoices</h2><CreditCard size={19} /></div>{data.invoices.map((invoice) => <div className="compact-list-row" key={invoice.id}><div><strong>{invoice.number}</strong><span>{invoice.description}</span></div><div><strong>{money(invoice.amount)}</strong><StatusBadge status={invoice.status}>{invoice.status}</StatusBadge></div></div>)}</section><section className="business-panel"><div className="business-panel-head"><h2>Support activity</h2><Headphones size={19} /></div>{data.recentTickets.map((ticket) => <div className="compact-list-row" key={ticket.id}><div><strong>{ticket.subject}</strong><span>{ticket.category} · {formatDate(ticket.updated_at, 'en')}</span></div><StatusBadge status={ticket.status}>{ticket.status}</StatusBadge></div>)}</section></div></>;
}

function OrganisationForm({ organisation, onSaved, canEdit }) {
  const [form, setForm] = useState({ name: organisation.name, address: organisation.address, contactEmail: organisation.contact_email });
  const [message, setMessage] = useState('');
  const save = async (e) => { e.preventDefault(); setMessage(''); try { await api('/api/business/organisation', { method: 'PATCH', body: JSON.stringify(form) }); setMessage('Organisation profile updated.'); onSaved(); } catch (err) { setMessage(err.message); } };
  return <form className="business-form" onSubmit={save}><label className="field"><span>Organisation name</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!canEdit} required /></label><label className="field"><span>Contact email</span><input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} disabled={!canEdit} required /></label><label className="field"><span>Registered / operating address</span><textarea rows="4" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} disabled={!canEdit} /></label>{canEdit && <button className="btn btn-primary">Save organisation profile</button>}{message && <p className="inline-message" role="status">{message}</p>}</form>;
}
function Organisation() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useFetch('/api/business/organisation');
  if (loading) return <Loading />; if (error) return <ErrorState message={error} onRetry={refresh} />;
  return <><WorkspaceHeading eyebrow="TENANT-SCOPED PROFILE" title="Organisation profile" copy="Only members of this organisation can read or manage these records." /><div className="business-two-column"><section className="business-panel"><div className="business-panel-head"><h2>Account details</h2><Building2 size={20} /></div><OrganisationForm key={data.organisation.id + data.organisation.name} organisation={data.organisation} onSaved={refresh} canEdit={user.role.endsWith('_admin')} /></section><aside className="business-panel"><h2>Service agreement</h2><dl className="business-details"><div><dt>Plan</dt><dd>{data.organisation.plan}</dd></div><div><dt>Status</dt><dd><StatusBadge status={data.organisation.status}>{data.organisation.status}</StatusBadge></dd></div><div><dt>Organisation ID</dt><dd><code>{data.organisation.id}</code></dd></div><div><dt>Created</dt><dd>{formatDate(data.organisation.created_at, 'en', false)}</dd></div></dl><div className="tenant-note"><ShieldCheck size={19} /><p>Changing another organisation’s ID in a URL or request does not grant access. Every business query is scoped to your authenticated tenant.</p></div></aside></div></>;
}

function Members() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { data, loading, error, refresh } = useFetch('/api/business/members');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ loginId: '', name: '', jobTitle: '', password: '' });
  const [saveError, setSaveError] = useState('');
  const admin = user.role.endsWith('_admin');
  const add = async (e) => { e.preventDefault(); try { await api('/api/business/members', { method: 'POST', body: JSON.stringify(form) }); setOpen(false); setForm({ loginId: '', name: '', jobTitle: '', password: '' }); refresh(); } catch (err) { setSaveError(err.message); } };
  const toggle = async (member) => { await api(`/api/business/members/${member.id}`, { method: 'PATCH', body: JSON.stringify({ active: !member.active }) }); refresh(); };
  return <><WorkspaceHeading eyebrow="ORGANISATION ACCESS" title="Members & roles" copy="Business membership grants no automatic Chief Administration or Specialized Action permissions." actions={admin && <button className="btn btn-primary" onClick={() => setOpen(true)}><UserPlus size={16} />Add member</button>} />{loading ? <Loading /> : error ? <ErrorState message={error} onRetry={refresh} /> : <section className="business-panel table-panel"><div className="table-wrap"><table className="data-table"><thead><tr><th>Member</th><th>Login ID</th><th>Role</th><th>Last sign-in</th><th>Status</th>{admin && <th>Action</th>}</tr></thead><tbody>{data.members.map((member) => <tr key={member.id}><td data-label="Member"><strong>{member.name}</strong><small className="table-subline">{member.job_title}</small></td><td data-label="Login ID"><code>{member.login_id}</code></td><td data-label="Role">{member.role.replaceAll('_', ' ')}</td><td data-label="Last sign-in">{formatDate(member.last_login_at, language)}</td><td data-label="Status"><StatusBadge status={member.active ? 'Active' : 'Unavailable'}>{member.active ? 'Active' : 'Deactivated'}</StatusBadge></td>{admin && <td><button className="btn btn-small btn-outline" disabled={member.id === user.id} onClick={() => toggle(member)}>{member.active ? 'Deactivate' : 'Activate'}</button></td>}</tr>)}</tbody></table></div></section>}<Modal open={open} onClose={() => setOpen(false)} title="Add organisation member"><form className="modal-form" onSubmit={add}><label className="field"><span>Full name</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label className="field"><span>Unique login ID</span><input value={form.loginId} onChange={(e) => setForm({ ...form, loginId: e.target.value.toUpperCase() })} pattern="[A-Za-z0-9_.\-]+" required /></label><label className="field"><span>Job title</span><input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} /></label><label className="field"><span>Temporary password (minimum 12 characters)</span><input type="password" minLength="12" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label><p className="field-help">Share through a secure channel and require a password change through your production identity process.</p>{saveError && <div className="form-error">{saveError}</div>}<button className="btn btn-primary btn-block">Create business member</button></form></Modal></>;
}

function Services() {
  const services = [
    { icon: PackageCheck, title: 'Coordination Pilot', tag: 'CURRENT PLAN', copy: 'Role-separated access and operational coordination.', features: ['Organisation account', 'Bilingual interface', 'Coordination support'] },
    { icon: Settings2, title: 'Implementation', tag: 'SERVICE OPTION', copy: 'Requirements discovery, data-governance setup and supervised onboarding.', features: ['Operating procedure review', 'Role and access design', 'Retention configuration'] },
    { icon: BookOpenCheck, title: 'Operational support', tag: 'SERVICE OPTION', copy: 'Bilingual interface guidance and documented support for authorised teams.', features: ['Account configuration', 'Workflow review', 'Support ticket workflow'] },
  ];
  return <><WorkspaceHeading eyebrow="PRODUCTS & SERVICES" title="Services for your organisation" copy="Coordination, onboarding and support for authorised teams." /><div className="service-card-grid">{services.map(({ icon: Icon, title, tag, copy, features }) => <article className="business-panel service-card" key={title}><Icon size={29} /><span className="eyebrow">{tag}</span><h2>{title}</h2><p>{copy}</p><ul>{features.map((f) => <li key={f}><CheckCircle2 size={16} />{f}</li>)}</ul><a href="/business/support" className="btn btn-outline">Discuss with support<ArrowRight size={15} /></a></article>)}</div><div className="info-callout"><AlertTriangle size={19} /><p>No commercial subscription unlocks identifiable citizen reports, SOS queues, rescue positions or the Chief Administration command centre.</p></div></>;
}

function Coordination() {
  const { language } = useLanguage();
  const { data, loading, error, refresh } = useFetch('/api/business/coordination');
  const [message, setMessage] = useState('');
  const update = async (id, status) => {
    setMessage('');
    try { await api(`/api/business/coordination/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); setMessage('Request status updated.'); refresh(); }
    catch (requestError) { setMessage(requestError.message); }
  };
  return <><WorkspaceHeading eyebrow="CHIEF ADMINISTRATION COORDINATION" title="Organisation requests" copy="Review shared requests and report progress. Citizen records remain restricted." />
    {message && <p className="inline-message" role="status">{message}</p>}
    {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={refresh} /> : data.requests.length ? <section className="business-panel table-panel"><div className="table-wrap"><table className="data-table"><thead><tr><th>Request</th><th>Details</th><th>Report</th><th>Priority</th><th>Updated</th><th>Status</th></tr></thead><tbody>{data.requests.map((item) => <tr key={item.id}><td><strong>{item.title}</strong><small className="table-subline">{item.category} · {item.id}</small></td><td>{item.details}</td><td>{item.report_reference || '—'}</td><td><StatusBadge status={item.priority}>{item.priority}</StatusBadge></td><td>{formatDate(item.updated_at, language)}</td><td><select aria-label={`Status for ${item.title}`} value={item.status} onChange={(e) => update(item.id, e.target.value)}>{['Requested','Accepted','In progress','Completed','Declined'].map((status) => <option key={status}>{status}</option>)}</select></td></tr>)}</tbody></table></div></section> : <section className="business-panel"><EmptyState /></section>}
  </>;
}

function Billing() {
  const { language } = useLanguage();
  const { data, loading, error, refresh } = useFetch('/api/business/invoices');
  return <><WorkspaceHeading eyebrow="SUBSCRIPTION & BILLING" title="Invoices" copy="Organisation invoices and payment status." />{loading ? <Loading /> : error ? <ErrorState message={error} onRetry={refresh} /> : <><div className="billing-summary"><StatCard icon={CreditCard} label="Total invoice value" value={money(data.invoices.reduce((sum, i) => sum + i.amount, 0))} /><StatCard icon={CheckCircle2} label="Paid" value={money(data.invoices.filter((i) => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0))} tone="teal" /><StatCard icon={FileClock} label="Outstanding" value={money(data.invoices.filter((i) => i.status !== 'Paid').reduce((sum, i) => sum + i.amount, 0))} tone="amber" /></div><section className="business-panel table-panel"><div className="table-wrap"><table className="data-table"><thead><tr><th>Invoice</th><th>Description</th><th>Issued</th><th>Due</th><th>Amount</th><th>Status</th></tr></thead><tbody>{data.invoices.map((invoice) => <tr key={invoice.id}><td><strong>{invoice.number}</strong></td><td>{invoice.description}</td><td>{formatDate(invoice.issued_at, language, false)}</td><td>{formatDate(invoice.due_date, language, false)}</td><td><strong>{money(invoice.amount)}</strong></td><td><StatusBadge status={invoice.status}>{invoice.status}</StatusBadge></td></tr>)}</tbody></table></div></section></>}</>;
}

function Implementation() {
  const { language } = useLanguage();
  const { data, loading, error, refresh } = useFetch('/api/business/implementation');
  const update = async (id, status) => { await api(`/api/business/implementation/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); refresh(); };
  return <><WorkspaceHeading eyebrow="ONBOARDING" title="Implementation tasks" copy="Track your own organisation’s configuration, rollout and governance tasks." />{loading ? <Loading /> : error ? <ErrorState message={error} onRetry={refresh} /> : <div className="implementation-list">{data.tasks.map((task, index) => <article className="business-panel implementation-card" key={task.id}><span className="implementation-number">0{index + 1}</span><div className="implementation-content"><div><StatusBadge status={task.status}>{task.status}</StatusBadge><span>Due {formatDate(task.due_date, language, false)}</span></div><h2>{task.title}</h2><p>{task.description}</p><small>Owner: {task.owner}</small></div><label className="field"><span>Status</span><select value={task.status} onChange={(e) => update(task.id, e.target.value)}>{['Not started','In progress','Blocked','Completed'].map((v) => <option key={v}>{v}</option>)}</select></label></article>)}</div>}</>;
}

function Support() {
  const { language } = useLanguage();
  const { data, loading, error, refresh } = useFetch('/api/business/tickets');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: '', body: '', category: 'Technical', priority: 'Normal' });
  const [saveError, setSaveError] = useState('');
  const create = async (e) => { e.preventDefault(); try { await api('/api/business/tickets', { method: 'POST', body: JSON.stringify(form) }); setOpen(false); setForm({ subject: '', body: '', category: 'Technical', priority: 'Normal' }); refresh(); } catch (err) { setSaveError(err.message); } };
  const update = async (id, status) => { await api(`/api/business/tickets/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); refresh(); };
  return <><WorkspaceHeading eyebrow="DOCUMENTATION & SUPPORT" title="Support tickets" copy="Requests stay within your organisation account." actions={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={16} />New ticket</button>} />{loading ? <Loading /> : error ? <ErrorState message={error} onRetry={refresh} /> : data.tickets.length ? <div className="ticket-list">{data.tickets.map((ticket) => <article className="business-panel ticket-card" key={ticket.id}><div className="ticket-card-top"><div><span className="eyebrow">TICKET #{ticket.id} · {ticket.category}</span><h2>{ticket.subject}</h2></div><StatusBadge status={ticket.priority}>{ticket.priority}</StatusBadge></div><p>{ticket.body}</p><div className="ticket-meta"><span>{ticket.created_by_name} · {formatDate(ticket.created_at, language)}</span><label>Status<select value={ticket.status} onChange={(e) => update(ticket.id, e.target.value)}>{['Open','In progress','Waiting for customer','Resolved','Closed'].map((v) => <option key={v}>{v}</option>)}</select></label></div></article>)}</div> : <EmptyState />}<Modal open={open} onClose={() => setOpen(false)} title="Create support ticket"><form className="modal-form" onSubmit={create}><label className="field"><span>Subject</span><input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required /></label><div className="form-grid"><label className="field"><span>Category</span><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{['Technical','Guidance','Billing','Implementation','Other'].map((v) => <option key={v}>{v}</option>)}</select></label><label className="field"><span>Priority</span><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{['Low','Normal','High'].map((v) => <option key={v}>{v}</option>)}</select></label></div><label className="field"><span>How can we help?</span><textarea rows="5" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required /></label>{saveError && <div className="form-error">{saveError}</div>}<button className="btn btn-primary btn-block">Create ticket</button></form></Modal></>;
}

function Analytics() {
  const { data, loading, error, refresh } = useFetch('/api/business/analytics');
  if (loading) return <Loading />; if (error) return <ErrorState message={error} onRetry={refresh} />;
  return <><WorkspaceHeading eyebrow="SERVICE ANALYTICS" title="Your organisation’s usage" copy={data.note} /><div className="stats-grid business-stats"><StatCard icon={UsersRound} label="Active members" value={data.memberActivity.total} note={`${data.memberActivity.signed_in || 0} have signed in`} /><StatCard icon={Settings2} label="Implementation tasks" value={data.implementation.reduce((s, i) => s + i.count, 0)} tone="teal" /><StatCard icon={Headphones} label="Support records" value={data.support.reduce((s, i) => s + i.count, 0)} tone="amber" /></div><div className="analytics-grid"><section className="business-panel"><h2>Implementation by status</h2><MiniBars data={data.implementation} /></section><section className="business-panel"><h2>Support by status</h2><MiniBars data={data.support} color="blue" /></section></div></>;
}
function Audit() {
  const { language } = useLanguage();
  const { data, loading, error, refresh } = useFetch('/api/business/audit');
  return <><WorkspaceHeading eyebrow="ADMINISTRATOR ONLY" title="Account audit history" copy="Authentication and account changes made by members of your organisation." />{loading ? <Loading /> : error ? <ErrorState message={error} onRetry={refresh} /> : <section className="business-panel table-panel"><div className="table-wrap"><table className="data-table"><thead><tr><th>Time</th><th>Member</th><th>Action</th><th>Record</th><th>Details</th></tr></thead><tbody>{data.logs.map((log) => <tr key={log.id}><td>{formatDate(log.created_at, language)}</td><td>{log.user_name || 'System'}</td><td>{log.action}</td><td>{log.entity_type} {log.entity_id}</td><td><code>{log.details}</code></td></tr>)}</tbody></table></div></section>}</>;
}

export default function BusinessDashboard() {
  const { section = '' } = useParams();
  if (!valid.has(section)) return <Navigate to="/business" replace />;
  switch (section) {
    case 'organisation': return <Organisation />; case 'members': return <Members />; case 'services': return <Services />;
    case 'coordination': return <Coordination />;
    case 'billing': return <Billing />; case 'implementation': return <Implementation />; case 'support': return <Support />;
    case 'analytics': return <Analytics />; case 'audit': return <Audit />; default: return <Overview />;
  }
}
