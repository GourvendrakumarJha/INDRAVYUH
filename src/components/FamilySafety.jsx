import { useState } from 'react';
import { Check, Clipboard, HeartHandshake, Search, ShieldCheck } from 'lucide-react';
import { PublicPageHeader } from './PublicPageHeader';
import { EmptyState, ErrorState, Loading, StatusBadge } from './UI';
import { api, formatDate } from '../lib/api';
import { useFetch } from '../lib/useFetch';
import { useLanguage } from '../context/LanguageContext';

const blankCheckin = { name: '', status: 'Safe', area: '', shelterId: '', note: '', contact: '', consent: false };

export function FamilySafetyManager({ shelters = [] }) {
  const { language } = useLanguage();
  const { data, loading, error, refresh } = useFetch('/api/welfare/family-safety');
  const [savingId, setSavingId] = useState(null);
  const [updateError, setUpdateError] = useState('');
  const update = async (id, status) => {
    setSavingId(id); setUpdateError('');
    try { await api(`/api/welfare/family-safety/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); refresh(); }
    catch (requestError) { setUpdateError(requestError.message); }
    finally { setSavingId(null); }
  };
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  return <section className="panel table-panel family-manager"><div className="panel-head"><div><span className="eyebrow">PRIVACY-PROTECTED LOOKUP</span><h2>Family safety check-ins</h2></div><HeartHandshake size={21} /></div><p className="panel-copy">Exact contact details stay in this authorised workspace. Public lookup requires both the reference and private code.</p>{updateError && <div className="form-error">{updateError}</div>}<div className="table-wrap"><table className="data-table"><thead><tr><th>Person / reference</th><th>Area</th><th>Shelter</th><th>Status</th><th>Updated</th></tr></thead><tbody>{data.checkins.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small className="table-subline">{item.reference}{item.note ? ` · ${item.note}` : ''}</small></td><td>{item.area}</td><td>{item.shelter_name || '—'}</td><td><select aria-label={`Status for ${item.name}`} value={item.status} disabled={savingId === item.id} onChange={(event) => update(item.id, event.target.value)}>{['Safe', 'At shelter', 'Need assistance'].map((status) => <option key={status}>{status}</option>)}</select></td><td>{formatDate(item.updated_at, language)}</td></tr>)}</tbody></table></div>{!data.checkins.length && <EmptyState title="No family check-ins yet" />}</section>;
}

export default function FamilySafetyPage() {
  const { language } = useLanguage();
  const shelters = useFetch('/api/public/shelters');
  const [mode, setMode] = useState('lookup');
  const [lookup, setLookup] = useState({ reference: '', accessCode: '' });
  const [found, setFound] = useState(null);
  const [form, setForm] = useState(blankCheckin);
  const [created, setCreated] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const search = async (event) => {
    event.preventDefault(); setError(''); setFound(null); setSubmitting(true);
    try { const data = await api(`/api/public/family-safety?reference=${encodeURIComponent(lookup.reference)}&accessCode=${encodeURIComponent(lookup.accessCode)}`); setFound(data.checkin); }
    catch (requestError) { setError(requestError.message); }
    finally { setSubmitting(false); }
  };
  const checkin = async (event) => {
    event.preventDefault(); setError(''); setSubmitting(true);
    try { const data = await api('/api/public/family-checkins', { method: 'POST', body: JSON.stringify(form) }); setCreated(data); }
    catch (requestError) { setError(requestError.message); }
    finally { setSubmitting(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(`Family reference: ${created.reference}\nPrivate code: ${created.accessCode}`); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { setError('Copy unavailable. Write down both codes.'); }
  };
  return <><PublicPageHeader eyebrow="SUPAUL FAMILY SAFETY" title="Family safety lookup" icon={HeartHandshake} /><section className="section"><div className="container narrow-container"><div className="coordination-actions family-mode-actions"><button className={`btn ${mode === 'lookup' ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setMode('lookup'); setError(''); }}><Search size={17} />Find a check-in</button><button className={`btn ${mode === 'checkin' ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setMode('checkin'); setError(''); }}><HeartHandshake size={17} />Create a check-in</button></div>
    {mode === 'lookup' ? <section className="panel family-public-card"><div className="panel-head"><div><span className="eyebrow">PRIVATE TWO-CODE LOOKUP</span><h2>Check a loved one’s status</h2></div><ShieldCheck size={21} /></div><p>Ask the person who checked in for both codes. Contact details are never returned by this lookup.</p><form className="modal-form" onSubmit={search}><label className="field"><span>Family reference</span><input value={lookup.reference} onChange={(event) => setLookup({ ...lookup, reference: event.target.value })} required placeholder="IV-SUP-FAM-…" /></label><label className="field"><span>Private access code</span><input value={lookup.accessCode} onChange={(event) => setLookup({ ...lookup, accessCode: event.target.value })} required autoComplete="off" /></label>{error && <div className="form-error">{error}</div>}<button className="btn btn-primary" disabled={submitting}><Search size={16} />{submitting ? 'Searching…' : 'Search check-in'}</button></form>{found && <div className="family-result" aria-live="polite"><div><span className="confirmation-mark"><Check size={25} /></span><div><h3>{found.name}</h3><p>{found.reference}</p></div><StatusBadge status={found.status}>{found.status}</StatusBadge></div><dl className="record-details"><div><dt>Area</dt><dd>{found.area}</dd></div>{found.shelterName && <div><dt>Listed shelter</dt><dd>{found.shelterName}</dd></div>}<div><dt>Updated</dt><dd>{formatDate(found.updatedAt, language)}</dd></div>{found.note && <div><dt>Check-in note</dt><dd>{found.note}</dd></div>}</dl></div>}</section> : <section className="panel family-public-card"><div className="panel-head"><div><span className="eyebrow">FAMILY CHECK-IN</span><h2>Share a safety status</h2></div><HeartHandshake size={21} /></div>{created ? <div className="confirmation-card compact-confirmation"><div className="confirmation-mark"><Check size={30} /></div><h2>Check-in saved</h2><p>{created.message}</p><div className="quick-code"><span>Family reference</span><strong>{created.reference}</strong></div><div className="quick-code"><span>Private access code</span><strong>{created.accessCode}</strong></div><button className="btn btn-outline" onClick={copy}><Clipboard size={16} />{copied ? 'Copied' : 'Copy both codes'}</button></div> : <form className="modal-form" onSubmit={checkin}><div className="form-grid"><label className="field"><span>Name *</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} minLength="2" required /></label><label className="field"><span>Safety status *</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{['Safe', 'At shelter', 'Need assistance'].map((status) => <option key={status}>{status}</option>)}</select></label><label className="field"><span>Area / ward / village *</span><input value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} minLength="3" required /></label><label className="field"><span>Listed shelter (optional)</span><select value={form.shelterId} onChange={(event) => setForm({ ...form, shelterId: event.target.value })}><option value="">None</option>{shelters.data?.shelters?.map((shelter) => <option value={shelter.id} key={shelter.id}>{shelter.name}</option>)}</select></label></div><label className="field"><span>Short status note (optional)</span><textarea rows="2" maxLength="500" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label><label className="field"><span>Contact (optional · Welfare only)</span><input value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} maxLength="120" /></label><label className="consent-field"><input type="checkbox" checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} required /><span><strong>Store this check-in for authorised Chief Administration review and two-code family lookup.</strong></span></label>{error && <div className="form-error">{error}</div>}<button className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving…' : 'Save family check-in'}</button></form>}</section>}
  </div></section></>;
}
