import { useState } from 'react';
import { AlertTriangle, Check, ClipboardCheck, LocateFixed, Save } from 'lucide-react';
import { Modal } from './UI';
import { api, categoryLabel } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';

const localDateTime = () => { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); };
const blank = () => ({
  category: 'flooding', description: '', locationText: '', latitude: '', longitude: '', observedAt: localDateTime(), contact: '',
  peopleCount: '', peopleTrapped: '', vulnerableCount: '', waterLevelCm: '', flowVelocityMs: '', rainfall1hMm: '', rainfall24hMm: '', riseRateCmh: '', accessCondition: '',
});
const categories = ['flooding', 'road_blocked', 'infrastructure', 'waterlogging', 'embankment', 'medical', 'missing_person', 'stranded', 'other'];

export function FieldReportComposer({ onClose, onSaved, initialLocation = '' }) {
  const { language } = useLanguage();
  const [form, setForm] = useState({ ...blank(), locationText: initialLocation });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [result, setResult] = useState(null);
  const update = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }));
  const locate = () => {
    if (!navigator.geolocation) return setLocationMessage('GPS is unavailable; enter coordinates if known.');
    setLocationMessage('Getting GPS…');
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setForm((previous) => ({ ...previous, latitude: coords.latitude.toFixed(6), longitude: coords.longitude.toFixed(6) }));
      setLocationMessage(`GPS added · about ${Math.round(coords.accuracy)} m accuracy`);
    }, () => setLocationMessage('GPS was not added.'), { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  };
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const response = await api('/api/welfare/reports', { method: 'POST', body: JSON.stringify({ ...form, observedAt: new Date(form.observedAt).toISOString() }) });
      setResult(response); onSaved?.();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };
  return <Modal open onClose={onClose} title="New Chief Administration field report" wide>
    {result ? <div className="confirmation-card compact-confirmation" aria-live="polite"><div className="confirmation-mark"><Check size={30} /></div><h2>Field report added</h2><p>{result.message}</p><div className="quick-code"><span>Reference</span><strong>{result.reference}</strong></div>{result.riskScore != null && <div className="quick-code"><span>Risk triage</span><strong>{result.riskScore}/100 · {result.riskBand}</strong></div>}<button className="btn btn-primary" onClick={onClose}>Return to reports</button></div> : <form className="modal-form staff-report-form" onSubmit={submit}>
      <p className="form-intro"><ClipboardCheck size={17} />Submitted as authorised Chief Administration personnel. These operational measurements are not part of the citizen report form. Verification remains a separate step.</p>
      <div className="form-grid">
        <label className="field"><span>Category *</span><select value={form.category} onChange={update('category')}>{categories.map((category) => <option value={category} key={category}>{categoryLabel(category, language)}</option>)}</select></label>
        <label className="field"><span>Observed at *</span><input type="datetime-local" value={form.observedAt} max={localDateTime()} onChange={update('observedAt')} required /></label>
        <label className="field field-full"><span>Area / landmark *</span><input value={form.locationText} onChange={update('locationText')} minLength="3" maxLength="200" required placeholder="e.g. Supaul College of Engineering east approach" /></label>
        <label className="field field-full"><span>Situation report *</span><textarea rows="3" value={form.description} onChange={update('description')} minLength="10" maxLength="1500" required placeholder="Observed condition, access and immediate needs" /></label>
      </div>
      <details className="optional-fields" open={Boolean(initialLocation)}><summary>GPS and callback (optional)</summary><div className="form-grid">
        <label className="field"><span>Latitude</span><input type="number" step="any" value={form.latitude} onChange={update('latitude')} /></label>
        <label className="field"><span>Longitude</span><input type="number" step="any" value={form.longitude} onChange={update('longitude')} /></label>
        <button type="button" className="btn btn-outline field-full" onClick={locate}><LocateFixed size={16} />Use current GPS</button>{locationMessage && <p className="inline-message field-full">{locationMessage}</p>}
        <label className="field field-full"><span>Safe callback (restricted)</span><input value={form.contact} onChange={update('contact')} maxLength="120" /></label>
      </div></details>
      <fieldset className="risk-fieldset"><legend>Field risk measurements</legend><p>Optional individually. Missing inputs produce a partial score; nothing is filled in automatically.</p><div className="form-grid three-columns">
        <label className="field"><span>Water level (cm)</span><input type="number" min="0" max="1000" step="any" value={form.waterLevelCm} onChange={update('waterLevelCm')} /></label>
        <label className="field"><span>Flow velocity (m/s)</span><input type="number" min="0" max="30" step="any" value={form.flowVelocityMs} onChange={update('flowVelocityMs')} /></label>
        <label className="field"><span>Rainfall · 1h (mm)</span><input type="number" min="0" max="500" step="any" value={form.rainfall1hMm} onChange={update('rainfall1hMm')} /></label>
        <label className="field"><span>Rainfall · 24h (mm)</span><input type="number" min="0" max="2000" step="any" value={form.rainfall24hMm} onChange={update('rainfall24hMm')} /></label>
        <label className="field"><span>Rise rate (cm/hr)</span><input type="number" min="0" max="500" step="any" value={form.riseRateCmh} onChange={update('riseRateCmh')} /></label>
        <label className="field"><span>Access condition</span><select aria-label="Access condition" value={form.accessCondition} onChange={update('accessCondition')}><option value="">Not recorded</option>{['Open', 'Restricted', 'Blocked'].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="field"><span>People affected</span><input type="number" min="0" max="10000" value={form.peopleCount} onChange={update('peopleCount')} /></label>
        <label className="field"><span>People trapped</span><input type="number" min="0" max="10000" value={form.peopleTrapped} onChange={update('peopleTrapped')} /></label>
        <label className="field"><span>Vulnerable people</span><input type="number" min="0" max="10000" value={form.vulnerableCount} onChange={update('vulnerableCount')} /></label>
      </div></fieldset>
      {error && <div className="form-error" role="alert"><AlertTriangle size={17} />{error}</div>}
      <button className="btn btn-primary" disabled={saving}><Save size={16} />{saving ? 'Adding report…' : 'Submit field report'}</button>
    </form>}
  </Modal>;
}
