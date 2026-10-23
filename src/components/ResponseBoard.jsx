import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BellRing, Boxes, Clock3, Landmark, Radio, Siren, UsersRound } from 'lucide-react';
import { useFetch } from '../lib/useFetch';
import { formatDate } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import { ErrorState, Loading, StatusBadge } from './UI';

export function CommandResponseBoard() {
  const { data, loading, error, refresh } = useFetch('/api/welfare/command');
  const { language } = useLanguage();
  if (loading) return <Loading label="Loading district command…" />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  const { stats, dispatch, notices } = data;
  const cards = [
    ['/welfare/sos', 'Active SOS', stats.activeEmergencies, Siren, 'red'],
    ['/welfare/shelters', 'Shelter occupancy', `${stats.shelterOccupancy}%`, Landmark, 'teal'],
    ['/welfare/relief', 'Relief readiness', `${stats.reliefReadiness}%`, Boxes, 'blue'],
    ['/welfare/alerts', 'Draft alerts', stats.queuedAlerts, BellRing, 'amber'],
  ];
  return <section className="command-response-board"><div className="command-heading"><div><span className="eyebrow">DISTRICT ADMINISTRATION</span><h2>Command & response board</h2><p>One operational view from signal to recovery.</p></div><div className="response-chain" aria-label="Unified response chain">{['Detect', 'Verify', 'Prioritise', 'Rescue', 'Relief', 'Recover'].map((item, index) => <span key={item}>{String(index + 1).padStart(2, '0')} · {item}</span>)}</div></div>
    <div className="command-metric-strip"><div><span>Total SOS</span><strong>{stats.totalSos}</strong></div><div><span>Citizen / field reports</span><strong>{stats.totalReports}</strong></div><div><span>Critical risk areas</span><strong>{stats.criticalZones}</strong></div><div><span>People reached · delivered</span><strong>{stats.peopleReached}</strong></div><div><span>Deliveries in transit</span><strong>{stats.deliveriesInTransit}</strong></div><div><span>Family assistance</span><strong>{stats.familyAssistance}</strong></div><div><span>Average resolution</span><strong>{stats.responseHours == null ? '—' : `${stats.responseHours}h`}</strong></div></div>
    <div className="response-card-grid">{cards.map(([to, label, value, Icon, tone]) => <Link to={to} className={`response-card response-${tone}`} key={label}><Icon size={20} /><span>{label}</span><strong>{value}</strong><ArrowRight size={15} /></Link>)}</div>
    <div className="response-board-grid"><section className="panel"><div className="panel-head"><div><span className="eyebrow">DISPATCH LANE</span><h2>Current assignments</h2></div><Radio size={20} /></div><div className="dispatch-lane">{dispatch.map((item) => <Link to="/welfare/sos" key={item.id}><span className="team-avatar">{item.team_name?.slice(-2) || '—'}</span><div><strong>{item.team_name || item.assigned_team}</strong><span>{item.location_text}</span><small>{item.reference}</small></div><StatusBadge status={item.response_stage || item.status}>{item.response_stage || item.status}</StatusBadge></Link>)}{!dispatch.length && <p className="empty-inline">No active team assignments.</p>}</div><Link to="/welfare/rescue" className="text-link">Review rescue teams<ArrowRight size={15} /></Link></section>
      <section className="panel"><div className="panel-head"><div><span className="eyebrow">OPERATIONAL NOTICES</span><h2>Recent coordination events</h2></div><Clock3 size={20} /></div><div className="operational-notices">{notices.map((item, index) => <div key={`${item.created_at}-${index}`}><span>{formatDate(item.created_at, language)}</span><div><strong>{item.action} · {item.reference}</strong><p>{item.note}</p><small>{item.actor_name || 'Public signal'}</small></div></div>)}</div></section></div>
    {stats.familyAssistance > 0 && <div className="info-callout"><AlertTriangle size={18} /><p>{stats.familyAssistance} family check-in records request assistance. Review them in Shelter operations.</p></div>}
  </section>;
}
