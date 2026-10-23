import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, Clipboard, LoaderCircle, LocateFixed, MapPin, Siren } from 'lucide-react';
import { Modal } from './UI';
import { api } from '../lib/api';

export function QuickSosForm({ onClose }) {
  const [phase, setPhase] = useState('locating');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  const sendSos = useCallback(() => {
    setError(''); setResult(null);
    if (!navigator.geolocation) { setPhase('error'); setError('GPS is unavailable in this browser. Enable location services or enter a citizen report instead.'); return; }
    setPhase('locating');
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      setPhase('sending');
      const capturedAt = new Date().toISOString();
      try {
        const response = await api('/api/public/sos', {
          method: 'POST',
          body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy, capturedAt }),
        });
        setResult(response); setPhase('success');
      } catch (requestError) { setError(requestError.message); setPhase('error'); }
    }, (locationError) => {
      const messages = { 1: 'Location permission was declined. Allow GPS access and try again.', 2: 'Your current GPS position is unavailable. Move to an open area and try again.', 3: 'GPS took too long to respond. Try again.' };
      setError(messages[locationError.code] || 'Your current location could not be obtained.'); setPhase('error');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    sendSos();
  }, [sendSos]);

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText(`SOS serial: ${result.serialNumber}\nPrivate code: ${result.accessCode}\nOrigin: ${result.coordinates.latitude}, ${result.coordinates.longitude}`);
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    } catch { setError('Copy unavailable. Please write down the serial and private code.'); }
  };

  if (result) return <div className="quick-sos-result" aria-live="polite">
    <span className="quick-sos-success"><Check size={28} /></span>
    <h3>SOS recorded in the Chief Administration queue</h3>
    <p>Your GPS origin is retained with this signal.</p>
    <div className="quick-code"><span>SOS serial</span><strong>{result.serialNumber}</strong></div>
    <div className="quick-code"><span>Private tracking code</span><strong>{result.accessCode}</strong></div>
    <div className="quick-code"><span><MapPin size={14} />Origin coordinates</span><strong>{result.coordinates.latitude.toFixed(6)}, {result.coordinates.longitude.toFixed(6)}</strong>{result.coordinates.accuracy != null && <small>About {Math.round(result.coordinates.accuracy)} m accuracy</small>}</div>
    <button className="btn btn-outline btn-block" onClick={copyCodes}><Clipboard size={16} />{copied ? 'Copied' : 'Copy serial, code & coordinates'}</button>
    <Link to="/track" state={{ reference: result.reference, accessCode: result.accessCode }} onClick={onClose} className="btn btn-primary btn-block">Track SOS</Link>
  </div>;

  return <div className={`quick-sos-live quick-sos-${phase}`} aria-live="polite">
    {phase === 'error' ? <div className="quick-sos-error"><AlertTriangle size={34} /><h3>GPS signal not sent</h3><p>{error}</p><button className="btn btn-danger btn-large btn-block" onClick={sendSos}><LocateFixed size={19} />Try GPS again</button></div> : <div className="quick-sos-progress">
      <span className="quick-sos-pulse">{phase === 'sending' ? <Siren size={32} /> : <LocateFixed size={32} />}</span>
      <h3>{phase === 'sending' ? 'Sending GPS SOS…' : 'Getting your current location…'}</h3>
      <p>{phase === 'sending' ? 'Creating a unique SOS serial.' : 'Allow location access when your browser asks. No SOS form is needed.'}</p>
      <LoaderCircle className="spin" size={23} />
    </div>}
  </div>;
}

export function QuickSos({ open, onClose }) {
  return <Modal open={open} onClose={onClose} title="SOS · one-press GPS"><QuickSosForm onClose={onClose} /></Modal>;
}
