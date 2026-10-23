import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ArrowUpRight, BellRing, BookOpenCheck, FileSearch, HeartHandshake, Landmark, MapPinned, MessageSquareWarning, Siren } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useSos } from '../context/SosContext';
import { useFetch } from '../lib/useFetch';
import { formatDate } from '../lib/api';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { ErrorState, Loading, StatusBadge } from '../components/UI';
import { ResponseScene3D } from '../components/ResponseScene3D';

const actions = [
  ['/report', 'report', MessageSquareWarning], ['/track', 'track', FileSearch], ['/map', 'map', MapPinned],
  ['/alerts', 'alerts', BellRing], ['/shelters', 'shelters', Landmark], ['/family-safety', 'familySafety', HeartHandshake], ['/preparedness', 'preparedness', BookOpenCheck],
];

function OceanScene() {
  return <div className="ocean-scene" aria-hidden="true">
    <div className="hero-parallax-orb hero-orb-one" /><div className="hero-parallax-orb hero-orb-two" />
    <svg viewBox="0 0 1440 700" preserveAspectRatio="none">
      <defs><linearGradient id="oceanWave" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#38bdf8" /><stop offset=".55" stopColor="#14b8a6" /><stop offset="1" stopColor="#0369a1" /></linearGradient><radialGradient id="oceanGlow"><stop stopColor="#67e8f9" stopOpacity=".34" /><stop offset="1" stopColor="#67e8f9" stopOpacity="0" /></radialGradient></defs>
      <ellipse className="ocean-glow-layer" cx="1080" cy="190" rx="460" ry="350" fill="url(#oceanGlow)" />
      <g className="ocean-wave-back" fill="none" stroke="url(#oceanWave)" strokeLinecap="round"><path d="M-80 460C190 330 330 570 620 430s460-40 900-190" strokeWidth="3" opacity=".5" /><path d="M-100 510C170 380 360 620 650 475s470-35 900-190" strokeWidth="34" opacity=".08" /><path d="M-40 190C250 80 400 270 690 150s460-30 790-110" opacity=".16" /></g>
      <g className="ocean-wave-front" fill="none" stroke="url(#oceanWave)" strokeLinecap="round"><path d="M-90 555C190 430 360 655 690 520s490-40 880-190" strokeWidth="2" opacity=".3" /></g>
      <g className="ocean-particle-layer" fill="none" stroke="#a5f3fc" opacity=".25"><circle cx="1120" cy="155" r="16" /><circle cx="1190" cy="225" r="7" /><circle cx="1040" cy="255" r="10" /><circle cx="250" cy="175" r="9" /><circle cx="310" cy="115" r="5" /></g>
    </svg>
  </div>;
}

export default function HomePage() {
  const { t, field, language } = useLanguage();
  const { openSos } = useSos();
  const { data, loading, error, refresh } = useFetch('/api/public/bootstrap');
  return <div className="fast-home">
    <section className="home-hero">
      <OceanScene />
      <div className="container fast-hero-content">
        <div className="home-hero-main">
          <div className="home-hero-copy">
        <div className="district-chip hero-enter"><span className="pulse-dot" />{t('districtTag')}</div>
        <h1 className="hero-enter hero-enter-two">{t('homeTitle')}</h1>
        <p className="hero-lead hero-enter hero-enter-three">{t('homeCopy')}</p>
        <div className="hero-sos-actions hero-enter hero-enter-four">
          <button className="hero-sos-button" onClick={openSos}><span className="sos-button-icon"><Siren size={30} /></span><span><strong>SOS</strong><small>{t('sosNow')}</small></span><ArrowRight size={23} /></button>
          <Link to="/report" className="hero-citizen-button"><MessageSquareWarning size={22} /><span><strong>Citizen report</strong><small>Share an observation</small></span><ArrowUpRight size={19} /></Link>
        </div>
        <div className="home-response-pulse" aria-label="Current public record counts">
          <span><small>SOS signals</small><strong>{data ? <AnimatedNumber value={data.stats.sosSignals} /> : '—'}</strong></span>
          <span><small>Citizen reports</small><strong>{data ? <AnimatedNumber value={data.stats.citizenReports} /> : '—'}</strong></span>
          <span><small>Published alerts</small><strong>{data ? <AnimatedNumber value={data.stats.publishedAlerts} /> : '—'}</strong></span>
        </div>
          </div>
          <ResponseScene3D stats={data?.stats} />
        </div>
        <div className="home-quick-grid" aria-label={t('quickActions')}>{actions.map(([to, key, Icon], index) => <Link to={to} className="home-quick-action" key={key} style={{ '--action-index': index }}><span className="home-action-3d-icon"><Icon size={22} /></span><span>{t(key)}</span><ArrowUpRight size={16} /></Link>)}</div>
      </div>
    </section>

    <section className="home-updates container" aria-labelledby="latest-updates">
      <div className="home-updates-head"><h2 id="latest-updates">{t('latestUpdates')}</h2><Link to="/alerts">{t('viewAll')}<ArrowRight size={15} /></Link></div>
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={refresh} /> : <div className="home-update-list">{data.alerts.slice(0, 2).map((alert) => <Link to="/alerts" className="home-update-row" key={alert.id}><BellRing size={18} /><div><strong>{field(alert, 'title')}</strong><span>{alert.area} · {formatDate(alert.published_at, language, false)}</span></div><StatusBadge status={alert.severity}>{alert.severity}</StatusBadge><ArrowUpRight size={16} /></Link>)}</div>}
      <div className="home-demo-note" role="note"><AlertTriangle size={16} /><strong>DEMO — Simulated data; not connected to emergency services.</strong></div>
    </section>
  </div>;
}
