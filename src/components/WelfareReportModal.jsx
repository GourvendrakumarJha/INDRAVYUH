import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, FileImage, LockKeyhole, MapPin, Save, Siren, UserRound } from 'lucide-react';
import { Modal, ErrorState, Loading, StatusBadge } from './UI';
import { RiskSummary } from './RiskDetails';
import { api, categoryLabel, formatDate } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';

const stages = ['Received', 'Acknowledged', 'Dispatched', 'Responding', 'Resolved'];
const nextLabels = { Acknowledged: 'Acknowledge SOS', Dispatched: 'Dispatch team', Responding: 'Mark responding', Resolved: 'Resolve SOS' };

function ResponseTimeline({ current }) {
  const currentIndex = Math.max(0, stages.indexOf(current || 'Received'));
  return <div className="sos-response-timeline" aria-label={`SOS response stage: ${current || 'Received'}`}>{stages.map((stage, index) => <div key={stage} className={index < currentIndex ? 'done' : index === currentIndex ? 'current' : ''}><span>{index < currentIndex ? <CheckCircle2 size={14} /> : index + 1}</span><strong>{stage}</strong></div>)}</div>;
}

export function WelfareReportModal({ report, onClose, onSaved }) {
  const { t, language } = useLanguage();
  const [details, setDetails] = useState(null);
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [responseSaving, setResponseSaving] = useState(false);
  const [responseNote, setResponseNote] = useState('');
  const [peopleAssisted, setPeopleAssisted] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!report) return;
    setLoading(true); setError('');
    try {
      const [detailData, teamData] = await Promise.all([api(`/api/welfare/reports/${report.id}`), api('/api/welfare/teams')]);
      setDetails(detailData); setTeams(teamData.teams);
      const r = detailData.report;
      setForm({ status: r.status, verification: r.verification, priority: r.priority, assignedTeam: r.assigned_team || '', isPublic: Boolean(r.is_public), note: '' });
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, [report?.id]);
  useEffect(() => { setDetails(null); setForm(null); setResponseNote(''); setPeopleAssisted(''); load(); }, [load]);
  if (!report) return null;
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await api(`/api/welfare/reports/${report.id}`, { method: 'PATCH', body: JSON.stringify({ ...form, assignedTeam: form.assignedTeam || null }) });
      await load(); onSaved?.();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  const r = details?.report || report;
  const currentStage = r.response_stage || (r.is_sos ? 'Received' : null);
  const nextStage = r.is_sos ? ({ Received: 'Acknowledged', Acknowledged: 'Dispatched', Dispatched: 'Responding', Responding: 'Resolved' }[currentStage]) : null;
  const advance = async () => {
    if (!nextStage) return;
    setResponseSaving(true); setError('');
    try {
      await api(`/api/welfare/reports/${report.id}/response`, { method: 'POST', body: JSON.stringify({ stage: nextStage, assignedTeam: form?.assignedTeam || null, note: responseNote, peopleAssisted: peopleAssisted === '' ? null : Number(peopleAssisted) }) });
      setResponseNote(''); setPeopleAssisted(''); await load(); onSaved?.();
    } catch (err) { setError(err.message); } finally { setResponseSaving(false); }
  };
  return <Modal open={Boolean(report)} onClose={onClose} title={`${r.reference} · ${categoryLabel(r.category, language)}`} wide><div className="report-modal-content">{loading && !details ? <Loading /> : error && !details ? <ErrorState message={error} onRetry={load} /> : <><div className="report-detail-main"><div className="report-detail-labels"><StatusBadge status={r.status}>{r.status}</StatusBadge><StatusBadge status={r.priority}>{r.priority}</StatusBadge>{Boolean(r.is_sos) && <span className="sos-label">SOS · RESTRICTED</span>}</div><p className="report-description">{r.description}</p><dl className="record-details"><div><dt><MapPin size={14} />{t('location')}</dt><dd>{r.location_text}{r.latitude != null && <small> · {Number(r.latitude).toFixed(6)}, {Number(r.longitude).toFixed(6)}</small>}{r.gps_accuracy != null && <small> · GPS ±{Math.round(r.gps_accuracy)} m</small>}</dd></div><div><dt><Clock3 size={14} />{t('observedAt')}</dt><dd>{formatDate(r.observed_at, language)}</dd></div>{r.source && <div><dt>Report source</dt><dd>{r.source}</dd></div>}{r.contact && <div><dt><UserRound size={14} />Callback</dt><dd>{r.contact}</dd></div>}{r.people_count != null && <div><dt>People</dt><dd>{r.people_count} affected{r.people_trapped != null ? ` · ${r.people_trapped} trapped` : ''}{r.vulnerable_count != null ? ` · ${r.vulnerable_count} vulnerable` : ''}</dd></div>}{r.people_assisted != null && <div><dt>People assisted</dt><dd>{r.people_assisted}</dd></div>}</dl>
      <RiskSummary report={r} risk={details?.risk} />
      {Boolean(r.is_sos) && <section className="sos-response-panel"><div className="panel-head"><div><span className="eyebrow">RESPONSE TIMELINE</span><h3>SOS operational stages</h3></div><Siren size={20} /></div><ResponseTimeline current={currentStage} />{nextStage ? <div className="sos-next-action"><h4>Next: {nextStage}</h4>{nextStage === 'Dispatched' && <label className="field"><span>Response team *</span><select value={form?.assignedTeam || ''} onChange={(event) => setForm({ ...form, assignedTeam: event.target.value })} required><option value="">Select team</option>{teams.map((team) => <option value={team.id} key={team.id}>{team.name} · {team.status}</option>)}</select></label>}{nextStage === 'Resolved' && <label className="field"><span>People assisted (optional)</span><input type="number" min="0" value={peopleAssisted} onChange={(event) => setPeopleAssisted(event.target.value)} /></label>}<label className="field"><span>Stage note</span><input value={responseNote} onChange={(event) => setResponseNote(event.target.value)} maxLength="500" placeholder="Short operational update" /></label><button className="btn btn-primary" onClick={advance} disabled={responseSaving || (nextStage === 'Dispatched' && !form?.assignedTeam)}>{nextLabels[nextStage]}<ArrowRight size={16} /></button></div> : <p className="inline-message"><CheckCircle2 size={16} />Response resolved.</p>}</section>}
      {Boolean(r.has_photo) && <div className="report-photo"><span><FileImage size={16} />{r.photo_name || 'Attachment'} · restricted</span><img src={`/api/welfare/reports/${r.id}/photo`} alt="Citizen-submitted incident attachment; restricted operational record" /></div>}<div className="restricted-note"><LockKeyhole size={16} />Contact, precise coordinates and attachments are restricted to authorised Chief Administration personnel.</div><h3>Status & assignment history</h3><div className="event-timeline">{details?.events?.map((event, index) => <div key={index}><span /><div><strong>{event.action}</strong><p>{event.note}</p><small>{event.actor_name || 'Public submission'} · {formatDate(event.created_at, language)}</small></div></div>)}</div></div>
      <form className="report-update-form" onSubmit={save}><div className="update-form-head"><span className="eyebrow">AUTHORISED ACTION</span><h3>Triage & update</h3></div><label className="field"><span>{t('status')}</span><select value={form?.status || ''} onChange={(e) => setForm({ ...form, status: e.target.value })}>{['Submitted','Under review','Verified','Assigned','In progress','Resolved','Closed'].map((v) => <option key={v}>{v}</option>)}</select></label><label className="field"><span>{t('verification')}</span><select value={form?.verification || ''} onChange={(e) => setForm({ ...form, verification: e.target.value })}>{['Unverified','Under review','Verified','Rejected'].map((v) => <option key={v}>{v}</option>)}</select></label><label className="field"><span>{t('priority')}</span><select value={form?.priority || ''} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{['Low','Normal','High','Critical'].map((v) => <option key={v}>{v}</option>)}</select></label><label className="field"><span>{t('team')}</span><select value={form?.assignedTeam || ''} onChange={(e) => setForm({ ...form, assignedTeam: e.target.value })}><option value="">Unassigned</option>{teams.map((team) => <option value={team.id} key={team.id}>{team.name} · {team.status}</option>)}</select></label>{!r.is_sos && <label className="toggle-field"><input type="checkbox" checked={form?.isPublic || false} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} /><span><strong>Publish reduced point to public map</strong><small>Requires Verified status. Coordinates are rounded on the public API.</small></span></label>}<label className="field"><span>Operator note</span><textarea rows={3} maxLength={1000} value={form?.note || ''} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Reason for verification, priority or assignment…" /></label>{error && <div className="form-error"><AlertTriangle size={16} />{error}</div>}<button className="btn btn-primary btn-block" disabled={saving || !form}><Save size={16} />{saving ? t('submitting') : t('save')}</button></form></>}</div></Modal>;
}
