import { useEffect, useState } from 'react';
import { BellRing, ClipboardCheck, HandHelping, PackageCheck, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useFetch } from '../lib/useFetch';
import { api, formatDate } from '../lib/api';
import { EmptyState, ErrorState, Loading, StatusBadge } from './UI';
import { WorkspaceHeading } from './WorkspaceComponents';
import { SpecializedActionFeed, specializedTaskLabels } from './SpecializedActionFeed';

const taskDefaults = {
  citizen_verification: 'Verify citizen report', monitoring: 'Monitor priority location', communication: 'Coordinate operational communication',
  relief_supply: 'Complete relief supply delivery', tracking: 'Track response progress', notification: 'Push internal notification',
};
const dueDefault = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);

export function ChiefCoordination() {
  const { language } = useLanguage();
  const { data, loading, error, refresh } = useFetch('/api/welfare/coordination');
  const [mode, setMode] = useState('task');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [requestForm, setRequestForm] = useState({ organisationId: '', reportId: '', title: 'Relief support', category: 'Relief supplies', details: '', priority: 'High' });
  const [taskForm, setTaskForm] = useState({ employeeId: '', taskType: 'citizen_verification', reportId: '', deliveryId: '', title: taskDefaults.citizen_verification, description: '', priority: 'High', dueDate: dueDefault() });

  useEffect(() => {
    if (!data) return;
    const firstReport = data.reports.find((report) => !report.is_sos) || data.reports[0];
    const firstCitizenReport = data.reports.find((report) => !report.is_sos && report.source === 'Citizen');
    const firstDelivery = data.deliveries.find((delivery) => delivery.status === 'In transit') || data.deliveries[0];
    setRequestForm((form) => ({ ...form, organisationId: form.organisationId || data.organisations[0]?.id || '', reportId: form.reportId || firstReport?.id || '' }));
    setTaskForm((form) => ({ ...form, employeeId: form.employeeId || data.employees[0]?.id || '', reportId: form.reportId || firstCitizenReport?.id || '', deliveryId: form.deliveryId || firstDelivery?.id || '' }));
  }, [data]);

  const changeTaskType = (taskType) => setTaskForm((form) => ({ ...form, taskType, title: taskDefaults[taskType], reportId: taskType === 'notification' ? '' : form.reportId, deliveryId: taskType === 'relief_supply' ? form.deliveryId : '' }));
  const save = async (event) => {
    event.preventDefault(); setMessage(''); setSaving(true);
    try {
      if (mode === 'request') {
        await api('/api/welfare/coordination/requests', { method: 'POST', body: JSON.stringify({ ...requestForm, reportId: requestForm.reportId ? Number(requestForm.reportId) : null }) });
        setRequestForm((form) => ({ ...form, details: '' })); setMessage('Organisation request sent.');
      } else {
        await api('/api/welfare/coordination/tasks', { method: 'POST', body: JSON.stringify({ ...taskForm, reportId: taskForm.taskType === 'notification' ? null : taskForm.reportId ? Number(taskForm.reportId) : null, deliveryId: taskForm.taskType === 'relief_supply' ? taskForm.deliveryId || null : null }) });
        setTaskForm((form) => ({ ...form, description: '' })); setMessage('Specialized action assigned. The officer can now submit its outcome online.');
      }
      refresh();
    } catch (requestError) { setMessage(requestError.message); }
    finally { setSaving(false); }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  const needsReport = taskForm.taskType === 'citizen_verification';
  const needsDelivery = taskForm.taskType === 'relief_supply';
  const showReport = !['notification'].includes(taskForm.taskType);
  return <>
    <WorkspaceHeading eyebrow="CHIEF ADMINISTRATION COORDINATION" title="Response board & specialized assignments" copy="Assign online verification, monitoring, communication, tracking, notification and relief actions. Officer outcomes return to this portal automatically." actions={<button className="btn btn-outline btn-small" onClick={refresh}><RefreshCw size={15} />Refresh</button>} />
    <div className="coordination-actions" role="group" aria-label="Coordination action">
      <button className={`btn ${mode === 'task' ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setMode('task'); setMessage(''); }}><ClipboardCheck size={17} />Assign specialized action</button>
      <button className={`btn ${mode === 'request' ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setMode('request'); setMessage(''); }}><HandHelping size={17} />Request organisation support</button>
    </div>
    <section className="panel coordination-compose"><form className="modal-form" onSubmit={save}>
      {mode === 'task' ? <>
        <div className="form-grid"><label className="field"><span>Specialized Action officer</span><select value={taskForm.employeeId} onChange={(event) => setTaskForm({ ...taskForm, employeeId: event.target.value })} required>{data.employees.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="field"><span>Online action type</span><select value={taskForm.taskType} onChange={(event) => changeTaskType(event.target.value)}>{Object.entries(specializedTaskLabels).filter(([type]) => type !== 'general').map(([type, label]) => <option value={type} key={type}>{label}</option>)}</select></label></div>
        <div className="form-grid">
          {showReport && <label className="field"><span>Linked report {needsReport ? '*' : '(optional)'}</span><select value={taskForm.reportId} onChange={(event) => setTaskForm({ ...taskForm, reportId: event.target.value })} required={needsReport}><option value="">None</option>{data.reports.filter((item) => !needsReport || (!item.is_sos && item.source === 'Citizen')).map((item) => <option value={item.id} key={item.id}>{item.reference}{item.is_sos ? ' · SOS' : ''}</option>)}</select></label>}
          {needsDelivery && <label className="field"><span>In-transit relief delivery *</span><select value={taskForm.deliveryId} onChange={(event) => setTaskForm({ ...taskForm, deliveryId: event.target.value })} required><option value="">Select delivery</option>{data.deliveries.filter((item) => item.status === 'In transit').map((item) => <option value={item.id} key={item.id}>{item.id} · {item.quantity} {item.unit} {item.item} → {item.destination}</option>)}</select></label>}
          {!showReport && <div className="assignment-explainer"><BellRing size={19} /><span>Creates an internal notification assignment. Public alert publication remains Chief Administrator-only.</span></div>}
          {needsDelivery && !showReport && null}
        </div>
        <div className="form-grid"><label className="field"><span>Assignment title</span><input value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} minLength="3" required /></label><label className="field"><span>Due date</span><input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })} required /></label></div>
        <label className="field"><span>Officer instructions</span><textarea rows="3" minLength="5" value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} required placeholder={needsReport ? 'Review the shared citizen evidence and submit Verified or Needs follow-up.' : needsDelivery ? 'Track the supply and submit completion only after delivery.' : 'Describe the observable result the officer should return.'} /></label>
      </> : <>
        <div className="form-grid"><label className="field"><span>Organisation</span><select value={requestForm.organisationId} onChange={(event) => setRequestForm({ ...requestForm, organisationId: event.target.value })} required>{data.organisations.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="field"><span>Linked report (optional)</span><select value={requestForm.reportId} onChange={(event) => setRequestForm({ ...requestForm, reportId: event.target.value })}><option value="">None</option>{data.reports.map((item) => <option value={item.id} key={item.id}>{item.reference}{item.is_sos ? ' · SOS' : ''}</option>)}</select></label></div>
        <div className="form-grid"><label className="field"><span>Request</span><input value={requestForm.title} onChange={(event) => setRequestForm({ ...requestForm, title: event.target.value })} minLength="3" required /></label><label className="field"><span>Category</span><select value={requestForm.category} onChange={(event) => setRequestForm({ ...requestForm, category: event.target.value })}>{['Relief supplies', 'Logistics', 'Volunteers', 'Technical support', 'Other'].map((item) => <option key={item}>{item}</option>)}</select></label></div>
        <label className="field"><span>Details</span><textarea rows="3" minLength="5" value={requestForm.details} onChange={(event) => setRequestForm({ ...requestForm, details: event.target.value })} required placeholder="What is needed, and by when?" /></label>
      </>}
      <label className="field coordination-priority"><span>Priority</span><select value={mode === 'request' ? requestForm.priority : taskForm.priority} onChange={(event) => mode === 'request' ? setRequestForm({ ...requestForm, priority: event.target.value }) : setTaskForm({ ...taskForm, priority: event.target.value })}>{['Low', 'Normal', 'High', 'Critical'].map((item) => <option key={item}>{item}</option>)}</select></label>
      {message && <p className="inline-message" role="status">{message}</p>}
      <button className="btn btn-primary" disabled={saving || (mode === 'task' && needsDelivery && !data.deliveries.some((item) => item.status === 'In transit'))}>{mode === 'request' ? <HandHelping size={16} /> : <Send size={16} />}{saving ? 'Saving…' : mode === 'request' ? 'Send request' : 'Assign online action'}</button>
    </form></section>

    <SpecializedActionFeed items={data.staffTasks} title="Officer assignments & submitted outcomes" />
    <section className="panel table-panel"><div className="panel-head"><div><span className="eyebrow">PARTNER COORDINATION</span><h2>Organisation requests</h2></div><span>{data.requests.length}</span></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Request</th><th>Organisation</th><th>Report</th><th>Status</th><th>Updated</th></tr></thead><tbody>{data.requests.map((item) => <tr key={item.id}><td><strong>{item.title}</strong><small className="table-subline">{item.category} · {item.priority}</small></td><td>{item.organisation_name}</td><td>{item.report_reference || '—'}</td><td><StatusBadge status={item.status}>{item.status}</StatusBadge></td><td>{formatDate(item.updated_at, language)}</td></tr>)}</tbody></table></div>{!data.requests.length && <EmptyState />}</section>
    <div className="info-callout"><ShieldCheck size={19} /><p>Citizen contact, precise coordinates, attachments and tracking hashes are not included in Specialized Action assignments. Public alerts still require Chief Administrator publication.</p></div>
  </>;
}
