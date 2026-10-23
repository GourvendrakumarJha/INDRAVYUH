import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// One passive, rAF-throttled scroll listener drives all decorative parallax
// layers and the public reading-progress indicator. Text and controls never
// move away from the reader, and reduced-motion/coarse-pointer users get static
// layers. The 3D scene consumes only these CSS variables; no render loop runs.
export function MotionController() {
  const { pathname } = useLocation();
  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = window.matchMedia('(pointer: coarse)');
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = Math.min(window.scrollY || 0, 1800);
      const factor = reduced.matches || coarse.matches ? 0 : 1;
      root.style.setProperty('--parallax-slow', `${(y * 0.045 * factor).toFixed(2)}px`);
      root.style.setProperty('--parallax-medium', `${(y * 0.09 * factor).toFixed(2)}px`);
      root.style.setProperty('--parallax-reverse', `${(y * -0.055 * factor).toFixed(2)}px`);
      root.style.setProperty('--parallax-3d-y', `${(y * -0.08 * factor).toFixed(2)}px`);
      root.style.setProperty('--parallax-3d-near', `${(y * 0.12 * factor).toFixed(2)}px`);
      root.style.setProperty('--parallax-3d-pitch', `${(Math.min(y / 150, 8) * factor).toFixed(2)}deg`);
      const available = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      root.style.setProperty('--scroll-progress', String(Math.min(1, Math.max(0, window.scrollY / available))));
    };
    const requestUpdate = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    reduced.addEventListener?.('change', requestUpdate);
    coarse.addEventListener?.('change', requestUpdate);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      reduced.removeEventListener?.('change', requestUpdate);
      coarse.removeEventListener?.('change', requestUpdate);
    };
  }, [pathname]);
  return null;
}
