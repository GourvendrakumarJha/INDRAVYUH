import boundary from '../data/supaul-boundary.json';

const ring = boundary.geometry.coordinates[0];
const west = 86.4048044, east = 87.1202519, south = 25.9907976, north = 26.5628535;
export function projectSupaul(latitude, longitude, width = 400, height = 340) {
  return {
    x: 20 + ((longitude - west) / (east - west)) * (width - 40),
    y: 20 + ((north - latitude) / (north - south)) * (height - 40),
  };
}
const points = ring.map(([lon, lat]) => {
  const p = projectSupaul(lat, lon);
  return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
}).join(' ');

export function SupaulOutline({ markers = [], className = '', labelled = false }) {
  return <svg className={`supaul-outline ${className}`} viewBox="0 0 400 340" role="img" aria-label="Simplified outline of Supaul district, Bihar">
    <defs>
      <linearGradient id="districtFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#22d3ee" stopOpacity=".16" /><stop offset="1" stopColor="#0f766e" stopOpacity=".05" /></linearGradient>
      <filter id="markerGlow"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
    <polygon points={points} fill="url(#districtFill)" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    <path d="M125 70C150 105 180 100 186 137s-31 48-12 80 53 27 66 68" fill="none" stroke="#22d3ee" strokeOpacity=".42" strokeWidth="2" strokeDasharray="4 7" />
    {markers.map((marker, index) => {
      const p = projectSupaul(marker.latitude, marker.longitude);
      return <g key={marker.id || index} transform={`translate(${p.x} ${p.y})`} className={`outline-marker marker-${marker.type || 'incident'}`}>
        <circle r={marker.type === 'shelter' ? 7 : 6} fill={marker.type === 'shelter' ? '#f59e0b' : '#22d3ee'} stroke="#071426" strokeWidth="3" filter="url(#markerGlow)" />
        {labelled && <text x="11" y="4" fill="currentColor" fontSize="11">{marker.name || marker.area}</text>}
      </g>;
    })}
    <text x="24" y="326" className="outline-caption" fill="currentColor" fontSize="10" letterSpacing="2">SUPAUL DISTRICT · BIHAR</text>
  </svg>;
}
