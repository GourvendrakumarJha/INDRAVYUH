import { useEffect, useState } from 'react';

export function AnimatedNumber({ value = 0, duration = 650, className = '' }) {
  const target = Number.isFinite(Number(value)) ? Number(value) : 0;
  const [display, setDisplay] = useState(target);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setDisplay(target); return undefined; }
    let frame;
    const start = performance.now();
    const from = 0;
    const tick = (time) => {
      const progress = Math.min(1, (time - start) / duration);
      const eased = 1 - ((1 - progress) ** 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return <span className={className} aria-label={String(target)}>{display.toLocaleString('en-IN')}</span>;
}
