import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ArrowUpRight, BellRing, Check, Clipboard, Clock3, FileUp, HeartHandshake, Landmark, LocateFixed, MapPin, MessageSquareWarning, ShieldCheck, Siren, UsersRound } from 'lucide-react';
import { PublicPageHeader } from '../components/PublicPageHeader';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { ErrorState, Loading } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';
import { useSos } from '../context/SosContext';
import { api, categoryLabel, formatDate } from '../lib/api';
import { useFetch } from '../lib/useFetch';

const categories = ['flooding', 'road_blocked', 'infrastructure', 'waterlogging', 'embankment', 'medical', 'missing_person', 'stranded', 'other'];
const localDateTime = () => { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); };
const emptyForm = () => ({ reporterName: '', contact: '', category: '', description: '', locationText: '', latitude: '', longitude: '', observedAt: localDateTime(), peopleCount: '', peopleTrapped: '', vulnerableCount: '', consent: false });

export function ReportForm() {
  const { t, language } = useLanguage();
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState('');
  const update = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));

  const locate = () => {
    if (!navigator.geolocation) return setLocationMessage('GPS is unavailable. Enter a village, ward or landmark.');
    setLocationMessage('Getting GPS…');
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setForm((previous) => ({ ...previous, latitude: coords.latitude.toFixed(6), longitude: coords.longitude.toFixed(6) }));
      setLocationMessage(`GPS added · about ${Math.round(coords.accuracy)} m accuracy`);
    }, () => setLocationMessage('GPS was not added. Enter the location above.'), { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  };

  const submit = async (event) => {
    event.preventDefault(); setError('');
    if (photo && photo.size > 5 * 1024 * 1024) return setError('Photo exceeds the 5 MB limit.');
    setSubmitting(true);
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, String(value)));
    if (photo) body.append('photo', photo);
    try { setResult(await api('/api/public/reports', { method: 'POST', body })); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    catch (requestError) { setError(requestError.message); }
    finally { setSubmitting(false); }
  };

  const copy = async (value, key) => {
    try { await navigator.clipboard.writeText(value); setCopied(key); setTimeout(() => setCopied(''), 1500); }
    catch { setError('Copy unavailable. Select and save the code manually.'); }
  };

  if (result) return <section className="confirmation-card" aria-live="polite">
    <div className="confirmation-mark"><Check size={34} /></div><h2>{t('confirmationLive')}</h2><p>{result.message}</p>
    <h3>{t('saveCodes')}</h3><div className="code-grid"><div><span>{t('reference')}</span><strong>{result.reference}</strong><button onClick={() => copy(result.reference, 'ref')}><Clipboard size={15} />{copied === 'ref' ? t('copied') : t('copy')}</button></div><div><span>{t('accessCode')}</span><strong>{result.accessCode}</strong><button onClick={() => copy(result.accessCode, 'key')}><Clipboard size={15} />{copied === 'key' ? t('copied') : t('copy')}</button></div></div>
    <div className="confirmation-actions"><Link to="/track" state={result} className="btn btn-primary">{t('trackNow')}<ArrowRight size={17} /></Link><button className="btn btn-outline" onClick={() => { setResult(null); setForm(emptyForm()); setPhoto(null); }}>{t('newReport')}</button></div>
  </section>;

  return <form className="report-form citizen-report-form" onSubmit={submit}>
    <div className="citizen-form-heading"><div><span className="eyebrow">CITIZEN INCIDENT REPORT</span><h2>Tell Chief Administration what you observed.</h2></div><MessageSquareWarning size={25} /></div>
    <p className="form-intro"><ShieldCheck size={17} />Operational water, weather and risk measurements are entered separately by authorised Chief Administration personnel.</p>
    <div className="form-section"><div className="form-grid">
      <label className="field"><span>Your name (optional)</span><input value={form.reporterName} onChange={update('reporterName')} maxLength="120" autoComplete="name" /></label>
      <label className="field"><span>{t('contactField')}</span><input value={form.contact} onChange={update('contact')} maxLength="120" autoComplete="tel" /></label>
      <label className="field"><span>{t('category')} *</span><select value={form.category} onChange={update('category')} required><option value="">{t('selectCategory')}</option>{categories.map((category) => <option key={category} value={category}>{categoryLabel(category, language)}</option>)}</select></label>
      <label className="field"><span><Clock3 size={15} />{t('observedAt')} *</span><input type="datetime-local" value={form.observedAt} max={localDateTime()} onChange={update('observedAt')} required /></label>
      <label className="field field-full"><span><MapPin size={15} />{t('location')} *</span><input value={form.locationText} onChange={update('locationText')} minLength="3" maxLength="200" placeholder={t('locationPlaceholder')} required /></label>
      <label className="field field-full"><span>{t('description')} *<small>{form.description.length}/1500</small></span><textarea value={form.description} onChange={update('description')} minLength="10" maxLength="1500" rows="5" placeholder={t('describePlaceholder')} required /></label>
    </div></div>
    <fieldset className="citizen-impact-fields"><legend><UsersRound size={17} />People at this location <span>optional</span></legend><div className="form-grid three-columns">
      <label className="field"><span>People affected</span><input type="number" min="0" max="10000" value={form.peopleCount} onChange={update('peopleCount')} /></label>
      <label className="field"><span>People trapped</span><input type="number" min="0" max="10000" value={form.peopleTrapped} onChange={update('peopleTrapped')} /></label>
      <label className="field"><span>Vulnerable people</span><input type="number" min="0" max="10000" value={form.vulnerableCount} onChange={update('vulnerableCount')} /></label>
    </div></fieldset>
    <details className="optional-fields"><summary>Add GPS or photo (optional)</summary><div className="form-grid">
      <div className="field field-full"><div className="coordinate-row"><label><span className="sr-only">Latitude</span><input type="number" step="any" placeholder="Latitude" value={form.latitude} onChange={update('latitude')} /></label><label><span className="sr-only">Longitude</span><input type="number" step="any" placeholder="Longitude" value={form.longitude} onChange={update('longitude')} /></label><button type="button" className="btn btn-outline" onClick={locate}><LocateFixed size={17} />{t('useLocation')}</button></div>{locationMessage && <p className="inline-message" role="status">{locationMessage}</p>}</div>
      <label className="field field-full file-field"><span><FileUp size={15} />{t('photo')}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] || null)} /><small className="field-help">JPEG, PNG or WebP · 5 MB maximum</small></label>
    </div></details>
    <label className="consent-field"><input type="checkbox" checked={form.consent} onChange={update('consent')} required /><span><strong>{t('consentShort')}</strong></span></label>
    {error && <div className="form-error" role="alert"><AlertTriangle size={18} />{error}</div>}
    <button className="btn btn-large btn-primary submit-report" disabled={submitting}>{submitting ? t('submitting') : t('submit')}<ArrowRight size={18} /></button>
  </form>;
}

function CitizenServices() {
  const { data, loading, error, refresh } = useFetch('/api/public/bootstrap');
  if (loading) return <aside className="citizen-service-rail"><Loading /></aside>;
  if (error) return <aside className="citizen-service-rail"><ErrorState message={error} onRetry={refresh} /></aside>;
  const available = data.shelters.reduce((sum, shelter) => sum + Math.max(0, shelter.capacity - shelter.occupied), 0);
  return <aside className="citizen-service-rail">
    <div className="citizen-network-pulse"><span className="eyebrow">SHARED PUBLIC PICTURE</span><div><span>SOS signals<strong><AnimatedNumber value={data.stats.sosSignals} /></strong></span><span>Citizen reports<strong><AnimatedNumber value={data.stats.citizenReports} /></strong></span></div></div>
    <section className="citizen-service-card service-shelter"><Landmark size={25} /><span className="eyebrow">NEED A LISTED PLACE?</span><h2>Find a shelter.</h2><p>{data.stats.listedShelters} listed centres · {available} places shown available. Confirm locally before travelling.</p><Link to="/shelters" className="btn btn-primary btn-block">Open shelter finder<ArrowRight size={16} /></Link></section>
    <section className="citizen-service-card"><HeartHandshake size={25} /><h2>Family safety lookup</h2><p>Create a check-in or use both private codes to view a shared status.</p><Link to="/family-safety" className="service-link">Open family lookup<ArrowUpRight size={15} /></Link></section>
    <section className="citizen-service-card"><BellRing size={25} /><h2>Area alerts</h2><p>{data.stats.publishedAlerts} published notices. {data.alerts[0] ? `Latest: ${data.alerts[0].title_en}` : 'No current published notice.'}</p>{data.alerts[0] && <small>Published {formatDate(data.alerts[0].published_at, 'en', false)}</small>}<Link to="/alerts" className="service-link">View Supaul notices<ArrowUpRight size={15} /></Link></section>
  </aside>;
}

export default function ReportPage() {
  const { t } = useLanguage();
  const { openSos } = useSos();
  return <>
    <PublicPageHeader eyebrow={t('districtTag')} title="Citizen report · Supaul" icon={MessageSquareWarning}><button className="btn btn-emergency" onClick={openSos}><Siren size={18} />SOS · one-press GPS</button></PublicPageHeader>
    <section className="section report-page citizen-report-page"><div className="container wide-container"><div className="citizen-report-layout"><ReportForm /><CitizenServices /></div></div></section>
  </>;
}
