import { useState } from 'react';
import { Layers3, Map as MapIcon, MapPin } from 'lucide-react';
import { PublicPageHeader } from '../components/PublicPageHeader';
import { SupaulMap } from '../components/SupaulMap';
import { SupaulOutline } from '../components/SupaulOutline';
import { ErrorState, Loading, StatusBadge } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';
import { useFetch } from '../lib/useFetch';
import { categoryLabel, formatDate } from '../lib/api';
import landmarks from '../data/supaul-landmarks.json';

export default function MapPage() {
  const { t, language } = useLanguage();
  const { data, loading, error, refresh } = useFetch('/api/public/map-data');
  const [showIncidents, setShowIncidents] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [view, setView] = useState('interactive');
  const provider = import.meta.env.VITE_MAP_PROVIDER;
  const providerLabel = provider === 'google'
    ? (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'Google Maps + local fallback' : 'Local Supaul vector · Google key not configured')
    : provider === 'osm' ? 'OpenStreetMap tiles + local data' : 'Local Supaul vector · no external tiles';

  return <>
    <PublicPageHeader eyebrow={t('districtTag')} title={t('mapTitle')} icon={MapIcon} />
    <section className="section map-page"><div className="container wide-container">
      <div className="map-toolbar">
        <div className="layer-controls">
          <span><Layers3 size={17} />{t('mapLegend')}</span>
          <label><input type="checkbox" checked={showIncidents} onChange={(e) => setShowIncidents(e.target.checked)} /><i className="legend-dot incident-dot" />{t('incidentsLayer')}<b>{data?.incidents?.length ?? 0}</b></label>
          <label><input type="checkbox" checked={showShelters} onChange={(e) => setShowShelters(e.target.checked)} /><i className="legend-dot shelter-dot" />{t('sheltersLayer')}<b>{data?.shelters?.length ?? 0}</b></label>
          <label><input type="checkbox" checked={showLandmarks} onChange={(e) => setShowLandmarks(e.target.checked)} /><i className="legend-dot landmark-dot" />Landmarks<b>{landmarks.length}</b></label>
        </div>
        <div className="view-switch"><button className={view === 'interactive' ? 'active' : ''} onClick={() => setView('interactive')}>{t('interactive')}</button><button className={view === 'schematic' ? 'active' : ''} onClick={() => setView('schematic')}>{t('schematic')}</button></div>
      </div>
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={refresh} /> : <>
        <div className="public-map-layout">
          <div className="map-canvas-card">
            {view === 'interactive' ? <SupaulMap incidents={data.incidents} shelters={data.shelters} showIncidents={showIncidents} showShelters={showShelters} showLandmarks={showLandmarks} /> : <div className="schematic-map"><SupaulOutline labelled markers={[...landmarks.filter(() => showLandmarks).map((place) => ({ ...place, id: place.name, name: place.shortName, type: 'landmark' })), ...(showIncidents ? data.incidents.map((i) => ({ ...i, id: i.reference, name: categoryLabel(i.category, language) })) : []), ...(showShelters ? data.shelters.map((s) => ({ ...s, type: 'shelter' })) : [])]} /><p>{t('boundaryNote')}</p></div>}
            <div className="map-attribution"><span>{t('mapProvider')}: {providerLabel}</span><span>{t('bounded')}</span></div>
          </div>
          <aside className="map-side-panel">
            {showLandmarks && <><div className="map-side-head"><span className="eyebrow">SUPAUL LANDMARKS</span><h2>Key places</h2></div><div className="landmark-list">{landmarks.map((place) => <article key={place.name}><span>{place.category}</span><h3>{place.name}</h3><p>{place.displayName}</p></article>)}</div></>}
            <h3>{t('incidentsLayer')}</h3>
            <div className="map-record-list">{data.incidents.length ? data.incidents.map((incident) => <article key={incident.reference}><div><span className="record-id">{incident.reference}</span><StatusBadge status={incident.status}>{incident.status}</StatusBadge></div><h4>{categoryLabel(incident.category, language)}</h4><p><MapPin size={13} />{incident.location_text}</p><small>{formatDate(incident.updated_at, language)}</small></article>) : <p>{t('noRecords')}</p>}</div>
          </aside>
        </div>
        <p className="boundary-note">{t('boundaryNote')}</p>
      </>}
    </div></section>
  </>;
}
