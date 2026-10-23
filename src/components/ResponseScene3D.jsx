import { Activity, Box, Radio, ShieldCheck, Waves } from 'lucide-react';
import { SupaulOutline } from './SupaulOutline';

/**
 * A lightweight CSS 3D district diorama. It is deliberately decorative: all
 * public actions remain ordinary, stable HTML controls outside the scene.
 * Pointer movement only changes CSS custom properties, never React state.
 */
export function ResponseScene3D({ stats }) {
  const resetPointer = (event) => {
    event.currentTarget.style.setProperty('--scene-yaw', '0deg');
    event.currentTarget.style.setProperty('--scene-pitch', '0deg');
  };
  const movePointer = (event) => {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
    event.currentTarget.style.setProperty('--scene-yaw', `${(x * 5).toFixed(2)}deg`);
    event.currentTarget.style.setProperty('--scene-pitch', `${(-y * 4).toFixed(2)}deg`);
  };

  return <div className="response-scene-3d" data-testid="response-scene-3d" aria-hidden="true" onPointerMove={movePointer} onPointerLeave={resetPointer}>
    <div className="scene-3d-camera">
      <div className="scene-3d-halo" />
      <div className="scene-3d-map">
        <div className="scene-3d-map-depth" />
        <div className="scene-3d-map-grid" />
        <div className="scene-3d-map-face"><SupaulOutline className="scene-district-outline" /></div>
        <span className="scene-map-pin scene-pin-north"><i /><b>Birpur</b></span>
        <span className="scene-map-pin scene-pin-south"><i /><b>Supaul</b></span>
        <span className="scene-map-pin scene-pin-east"><i /><b>Nirmali</b></span>
      </div>
      <div className="scene-3d-core">
        <span className="scene-core-ring scene-ring-one" />
        <span className="scene-core-ring scene-ring-two" />
        <div className="scene-core-cube">
          <span className="cube-face cube-front"><Waves size={30} /></span>
          <span className="cube-face cube-back"><ShieldCheck size={25} /></span>
          <span className="cube-face cube-right"><Activity size={25} /></span>
          <span className="cube-face cube-left"><Radio size={25} /></span>
          <span className="cube-face cube-top" />
          <span className="cube-face cube-bottom" />
        </div>
      </div>
      <div className="scene-3d-float scene-float-network"><Radio size={16} /><span><strong>LIVE NETWORK</strong><small>Supaul district · connected</small></span><i /></div>
      <div className="scene-3d-float scene-float-signal"><span><strong>{stats?.sosSignals ?? '—'}</strong><small>SOS signals</small></span><Activity size={19} /></div>
      <div className="scene-3d-orbit scene-orbit-one" /><div className="scene-3d-orbit scene-orbit-two" />
    </div>
    <div className="scene-3d-caption"><Box size={13} /><span>3D DISTRICT RESPONSE VIEW</span><i>SCROLL / MOVE TO EXPLORE</i></div>
  </div>;
}
