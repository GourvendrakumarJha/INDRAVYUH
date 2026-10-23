import { useEffect, useRef, useState } from 'react';
import { CircleMarker, GeoJSON, MapContainer, Polygon, Popup, ScaleControl, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { AlertTriangle } from 'lucide-react';
import boundary from '../data/supaul-boundary.json';
import localities from '../data/supaul-localities.json';
import landmarks from '../data/supaul-landmarks.json';
import { categoryLabel, formatDate } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import { StatusBadge } from './UI';

const south = 25.9907976, west = 86.4048044, north = 26.5628535, east = 87.1202519;
const bounds = [[south, west], [north, east]];
const districtRing = boundary.geometry.coordinates[0].map(([lon, lat]) => [lat, lon]);
const world = [[-85, -180], [-85, 180], [85, 180], [85, -180]];
const majorPlaces = new Set(['Supaul', 'Birpur', 'Nirmali', 'Triveniganj', 'Basantpur', 'Raghopur']);

function MapController() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds);
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function LocalityLayer() {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useEffect(() => {
    const update = () => setZoom(map.getZoom());
    map.on('zoomend', update);
    return () => { map.off('zoomend', update); };
  }, [map]);
  const visible = zoom >= 10 ? localities : localities.filter((place) => majorPlaces.has(place.name));
  return visible.map((place) => <CircleMarker key={place.name} center={[place.latitude, place.longitude]} radius={2.5} pathOptions={{ color: '#4e707a', weight: 1, fillColor: '#ffffff', fillOpacity: 1 }}>
    <Tooltip permanent direction="top" offset={[0, -3]} className="locality-label">{place.name}</Tooltip>
  </CircleMarker>);
}

function LandmarkLayer() {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useEffect(() => {
    const update = () => setZoom(map.getZoom());
    map.on('zoomend', update);
    return () => { map.off('zoomend', update); };
  }, [map]);
  const directions = { 'Supaul College of Engineering': 'bottom', 'Sadar Hospital, Supaul': 'left', 'Supaul Railway Station': 'right' };
  return landmarks.map((place) => <CircleMarker key={place.name} center={[place.latitude, place.longitude]} radius={5} pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#2563eb', fillOpacity: 1 }}>
    <Tooltip permanent={zoom >= 10} direction={directions[place.name] || 'top'} offset={[0, -4]} className="landmark-label">{place.shortName}</Tooltip>
    <Popup><div className="map-popup"><span className="eyebrow">{place.category} · LANDMARK</span><h3>{place.name}</h3><p>{place.displayName}</p><small>Landmark reference, not a shelter or response resource.</small></div></Popup>
  </CircleMarker>);
}

function LeafletSupaulMap({ incidents = [], shelters = [], teams = [], showIncidents = true, showShelters = true, showTeams = false, showLandmarks = true, onSelect }) {
  const { t, language } = useLanguage();
  const [tileError, setTileError] = useState(false);
  const useOsmTiles = import.meta.env.VITE_MAP_PROVIDER === 'osm';
  return <div className="map-wrap">
    {useOsmTiles && tileError && <div className="map-warning"><AlertTriangle size={15} />External tiles are unavailable. The local district boundary, places and records remain usable.</div>}
    <MapContainer className={`supaul-map ${useOsmTiles ? '' : 'local-vector-map'}`} center={[26.28, 86.75]} zoom={10} minZoom={9} maxZoom={17} maxBounds={bounds} maxBoundsViscosity={1} zoomControl={true} scrollWheelZoom={true} attributionControl={useOsmTiles}>
      <MapController />
      {useOsmTiles && <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" eventHandlers={{ tileerror: () => setTileError(true) }} />}
      <Polygon positions={[world, districtRing]} pathOptions={{ color: 'transparent', fillColor: '#071426', fillOpacity: useOsmTiles ? 0.46 : 0.24, interactive: false }} />
      <GeoJSON data={boundary} style={{ color: '#0f766e', weight: 3, fillColor: '#22d3ee', fillOpacity: useOsmTiles ? 0.055 : 0.12 }} />
      {(!useOsmTiles || tileError) && <LocalityLayer />}
      {showLandmarks && <LandmarkLayer />}
      {showIncidents && incidents.filter((i) => i.latitude != null).map((incident) => <CircleMarker key={incident.id || incident.reference} center={[incident.latitude, incident.longitude]} radius={incident.is_sos ? 10 : 8} pathOptions={{ color: incident.is_sos ? '#b91c1c' : '#075985', weight: 2, fillColor: incident.is_sos ? '#ef4444' : '#22d3ee', fillOpacity: 0.9 }} eventHandlers={{ click: () => onSelect?.(incident) }}>
        <Tooltip direction="top" offset={[0, -5]}>{incident.reference} · {categoryLabel(incident.category, language)}{incident.risk_score != null ? ` · Risk ${incident.risk_score}` : ''}</Tooltip>
        <Popup><div className="map-popup"><span className="eyebrow">{incident.reference}</span><h3>{categoryLabel(incident.category, language)}</h3><p>{incident.location_text}</p><StatusBadge status={incident.status}>{incident.status}</StatusBadge>{incident.risk_score != null && <StatusBadge status={incident.risk_band}>Risk {incident.risk_score}/100 · {incident.risk_band}</StatusBadge>}<small>{formatDate(incident.updated_at || incident.updatedAt, language)}</small>{onSelect && <button className="btn btn-small btn-primary" onClick={() => onSelect(incident)}>{t('details')}</button>}</div></Popup>
      </CircleMarker>)}
      {showShelters && shelters.map((shelter) => <CircleMarker key={shelter.id} center={[shelter.latitude, shelter.longitude]} radius={9} pathOptions={{ color: '#92400e', weight: 2, fillColor: '#f59e0b', fillOpacity: 0.95 }} eventHandlers={{ click: () => onSelect?.({ ...shelter, type: 'shelter' }) }}>
        <Tooltip direction="top">{shelter.name} · {shelter.area}</Tooltip><Popup><div className="map-popup"><span className="eyebrow">SHELTER</span><h3>{shelter.name}</h3><p>{shelter.address}</p><StatusBadge status={shelter.status}>{shelter.status}</StatusBadge><small>{t('lastConfirmed')}: {formatDate(shelter.last_confirmed, language)}</small></div></Popup>
      </CircleMarker>)}
      {showTeams && teams.filter((team) => team.latitude != null).map((team) => <CircleMarker key={team.id} center={[team.latitude, team.longitude]} radius={8} pathOptions={{ color: '#4c1d95', weight: 2, fillColor: '#8b5cf6', fillOpacity: 0.9 }}><Tooltip>{team.name} · {team.status}</Tooltip><Popup><strong>{team.name}</strong><br />{team.status} · {team.members} members<br /><small>Restricted team location</small></Popup></CircleMarker>)}
      <ScaleControl position="bottomleft" imperial={false} />
    </MapContainer>
  </div>;
}

function GoogleSupaulMap(props) {
  const elementRef = useRef(null);
  const [error, setError] = useState('');
  const { language } = useLanguage();
  useEffect(() => {
    let cancelled = false;
    const previousFailureHandler = window.gm_authFailure;
    const fail = () => { if (!cancelled) setError('Google Maps was unavailable or rejected the request (often an API-key/referrer 403). The local Supaul map is shown instead.'); };
    window.gm_authFailure = fail;
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const initialise = () => {
      if (cancelled || !elementRef.current || !window.google?.maps) return;
      const google = window.google;
      const map = new google.maps.Map(elementRef.current, { center: { lat: 26.28, lng: 86.75 }, zoom: 10, minZoom: 9, maxZoom: 17, mapTypeControl: false, streetViewControl: false, fullscreenControl: true, restriction: { latLngBounds: { south, west, north, east }, strictBounds: true } });
      new google.maps.Polygon({ paths: boundary.geometry.coordinates[0].map(([lng, lat]) => ({ lat, lng })), strokeColor: '#0f766e', strokeWeight: 3, fillColor: '#22d3ee', fillOpacity: 0.08, map });
      const addMarker = (record, color) => {
        if (record.latitude == null) return;
        const marker = new google.maps.Marker({ position: { lat: record.latitude, lng: record.longitude }, map, title: record.name || record.reference, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 } });
        marker.addListener('click', () => props.onSelect?.(record));
      };
      if (props.showIncidents !== false) props.incidents?.forEach((i) => addMarker(i, i.is_sos ? '#dc2626' : '#0891b2'));
      if (props.showShelters !== false) props.shelters?.forEach((s) => addMarker(s, '#f59e0b'));
      if (props.showLandmarks !== false) landmarks.forEach((place) => addMarker(place, '#2563eb'));
      if (props.showTeams) props.teams?.forEach((team) => addMarker(team, '#8b5cf6'));
      map.fitBounds({ south, west, north, east });
    };
    if (window.google?.maps) initialise();
    else {
      const existing = document.querySelector('script[data-indravyuh-google]');
      const script = existing || document.createElement('script');
      if (!existing) {
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&language=${language}`;
        script.async = true; script.defer = true; script.dataset.indravyuhGoogle = 'true';
        document.head.appendChild(script);
      }
      script.addEventListener('load', initialise, { once: true });
      script.addEventListener('error', fail, { once: true });
    }
    return () => { cancelled = true; window.gm_authFailure = previousFailureHandler; };
  }, [props.incidents, props.shelters, props.teams, props.showIncidents, props.showShelters, props.showTeams, props.showLandmarks, language]);
  if (error) return <div className="map-provider-fallback"><div className="map-fallback-notice"><AlertTriangle size={16} />{error}</div><LeafletSupaulMap {...props} /></div>;
  return <div className="map-wrap"><div ref={elementRef} className="supaul-map google-map" /></div>;
}

export function SupaulMap(props) {
  const useGoogle = import.meta.env.VITE_MAP_PROVIDER === 'google' && import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return useGoogle ? <GoogleSupaulMap {...props} /> : <LeafletSupaulMap {...props} />;
}
