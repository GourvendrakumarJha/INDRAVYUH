import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock3, FileSearch, LockKeyhole, Search } from 'lucide-react';
import { PublicPageHeader } from '../components/PublicPageHeader';
import { StatusBadge } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';
import { api, categoryLabel, formatDate } from '../lib/api';

export default function TrackPage() {
  const { t, language } = useLanguage();
  const location = useLocation();
  const [form, setForm] = useState({ reference: location.state?.reference || '', accessCode: location.state?.accessCode || '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setError(''); setResult(null);
    try { setResult(await api(`/api/public/track?reference=${encodeURIComponent(form.reference)}&accessCode=${encodeURIComponent(form.accessCode)}`)); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  const report = result?.report;
  const timelineSteps = report?.isSos ? ['Received','Acknowledged','Dispatched','Responding','Resolved'] : ['Submitted','Under review','Verified','Assigned','In progress','Resolved'];
  const currentStage = report?.isSos ? (report.responseStage || 'Received') : report?.status;
  return <><PublicPageHeader eyebrow={t('publicServices')} title={t('trackTitle')} icon={FileSearch} /><section className="section track-page"><div className="container narrow-container"><div className="track-card"><form onSubmit={submit}><div className="form-grid"><label className="field"><span>{t('reference')}</span><input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value.toUpperCase() })} placeholder="IV-SUP-RPT-…" required autoCapitalize="characters" /></label><label className="field"><span>{t('accessCode')}</span><input value={form.accessCode} onChange={(e) => setForm({ ...form, accessCode: e.target.value.toUpperCase() })} placeholder="12-character private code" required /></label></div><button className="btn btn-primary" disabled={loading}><Search size={17} />{loading ? t('loading') : t('checkStatus')}</button></form>{error && <div className="form-error" role="alert"><AlertTriangle size={18} />{error}</div>}</div>
    {report && <section className="tracking-result" aria-live="polite"><div className="tracking-result-head"><div><span className="eyebrow">{report.reference}</span><h2>{categoryLabel(report.category, language)}</h2></div></div><div className="tracking-status-grid"><div><span>{t('currentStatus')}</span><StatusBadge status={report.status}>{report.status}</StatusBadge></div><div><span>{t('verification')}</span><StatusBadge status={report.verification}>{report.verification}</StatusBadge></div></div><dl className="record-details"><div><dt>{t('location')}</dt><dd>{report.locationText}</dd></div><div><dt>{t('submitted')}</dt><dd>{formatDate(report.createdAt, language)}</dd></div><div><dt>{t('updated')}</dt><dd>{formatDate(report.updatedAt, language)}</dd></div></dl><div className="tracking-timeline">{timelineSteps.map((step, i) => { const currentIndex = timelineSteps.indexOf(currentStage); return <div className={i <= currentIndex ? 'complete' : ''} key={step}><span>{i <= currentIndex ? <CheckCircle2 size={17} /> : <Clock3 size={17} />}</span><p>{step}</p></div>; })}</div><p className="status-disclaimer"><LockKeyhole size={16} />{result.message}</p></section>}
  </div></section></>;
}
