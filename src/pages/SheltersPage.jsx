import { useState } from 'react';
import { Accessibility, Clock3, Landmark, MapPin, Search, UsersRound } from 'lucide-react';
import { PublicPageHeader } from '../components/PublicPageHeader';
import { EmptyState, ErrorState, Loading, StatusBadge } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';
import { useFetch } from '../lib/useFetch';
import { formatDate } from '../lib/api';

export default function SheltersPage() {
  const { t, language } = useLanguage();
  const { data, loading, error, refresh } = useFetch('/api/public/shelters');
  const [search, setSearch] = useState('');
  const shelters = (data?.shelters || []).filter((shelter) => `${shelter.name} ${shelter.area} ${shelter.address}`.toLowerCase().includes(search.toLowerCase()));
  return <><PublicPageHeader eyebrow={t('districtTag')} title={t('sheltersTitle')} icon={Landmark} tone="blue" /><section className="section shelters-page"><div className="container"><div className="list-toolbar"><label className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`${t('search')} · Supaul, Birpur, Nirmali…`} /></label><span>{shelters.length} {t('sheltersLayer')}</span></div>{loading ? <Loading /> : error ? <ErrorState message={error} onRetry={refresh} /> : shelters.length ? <div className="shelter-grid">{shelters.map((shelter) => {
    const available = Math.max(0, shelter.capacity - shelter.occupied);
    const percent = shelter.capacity ? Math.min(100, Math.round(shelter.occupied / shelter.capacity * 100)) : 0;
    return <article className="shelter-card" key={shelter.id}><div className="shelter-card-head"><span className="shelter-icon"><Landmark size={22} /></span><StatusBadge status={shelter.status}>{shelter.status}</StatusBadge></div><span className="shelter-area"><MapPin size={14} />{shelter.area} · Supaul</span><h2>{shelter.name}</h2><p>{shelter.address}</p><div className="capacity-visual"><div><span>{t('occupied')}</span><strong>{shelter.occupied} / {shelter.capacity}</strong></div><div className="capacity-bar"><span style={{ width: `${percent}%` }} /></div><small>{available} {t('available')}</small></div><dl className="shelter-details"><div><dt><UsersRound size={15} />{t('capacity')}</dt><dd>{shelter.capacity}</dd></div><div><dt><Accessibility size={15} />{t('accessibilityInfo')}</dt><dd>{shelter.accessibility}</dd></div><div><dt><Clock3 size={15} />{t('lastConfirmed')}</dt><dd>{formatDate(shelter.last_confirmed, language)}</dd></div></dl><div className="shelter-source"><strong>{t('source')}</strong><span>{shelter.source}</span></div></article>;
  })}</div> : <EmptyState />}</div></section></>;
}
