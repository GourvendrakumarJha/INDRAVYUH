import { Link } from 'react-router-dom';

export function Brand({ to = '/', light = true, compact = false, className = '' }) {
  return (
    <Link to={to} className={`brand ${light ? 'brand-light' : ''} ${compact ? 'brand-compact' : ''} ${className}`} aria-label="INDRAVYUH home">
      <span className="brand-symbol"><img src="/assets/indravyuh-mark.jpg" alt="" /></span>
      <span className="brand-type"><strong>INDRAVYUH</strong><span lang="hi">इन्द्रव्यूह</span></span>
    </Link>
  );
}
