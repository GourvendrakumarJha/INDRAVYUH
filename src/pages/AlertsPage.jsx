import { BellRing, CalendarDays, Info, MapPin } from 'lucide-react';
import { PublicPageHeader } from '../components/PublicPageHeader';
import { EmptyState, ErrorState, Loading, StatusBadge } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';
import { useFetch } from '../lib/useFetch';
import { formatDate } from '../lib/api';

export default function AlertsPage() {
  const { t, language, field } = useLanguage();
  const { data, loading, error, refresh } = useFetch('/api/public/alerts');
  return <><PublicPageHeader eyebrow={t('districtTag')} title={t('alertsTitle')} icon={BellRing} tone="amber" /><section className="section alerts-page"><div className="container narrow-wide-container">{loading ? <Loading /> : error ? <ErrorState message={error} onRetry={refresh} /> : <div className="alert-list">{data.alerts.length ? data.alerts.map((alert) => <article className="public-alert-card" key={alert.id}><div className="alert-card-rail"><BellRing size={23} /></div><div className="alert-card-main"><div className="alert-card-labels"><StatusBadge status={alert.severity}>{alert.severity}</StatusBadge></div><div className="alert-area-line"><MapPin size={15} />{alert.area}{alert.landmark ? ` · ${alert.landmark}` : ''}{alert.route_status && alert.route_status !== 'Not specified' ? <StatusBadge status={alert.route_status}>Routes: {alert.route_status}</StatusBadge> : null}</div><h2>{field(alert, 'title')}</h2><p>{field(alert, 'body')}</p><div className="alert-meta"><span><Info size={15} /><span><small>{t('source')}</small>{alert.source}</span></span><span><CalendarDays size={15} /><span><small>{t('published')}</small>{formatDate(alert.published_at, language)}</span></span></div></div></article>) : <EmptyState title={t('noAlerts')} />}</div>}</div></section></>;
}
