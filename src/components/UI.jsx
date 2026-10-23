import { useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { statusClass } from '../lib/api';

export function StatusBadge({ status, children, dot = true, className = '' }) {
  return <span className={`status-badge ${statusClass(status)} ${className}`}>{dot && <span className="status-dot" aria-hidden="true" />}{children || status}</span>;
}

export function DemoPill() { return null; }

export function Loading({ label }) {
  const { t } = useLanguage();
  return <div className="loading-state" role="status"><LoaderCircle className="spin" size={22} /><span>{label || t('loading')}</span></div>;
}

export function ErrorState({ message, onRetry }) {
  const { t } = useLanguage();
  return <div className="error-state" role="alert"><AlertCircle size={22} /><div><strong>{t('error')}</strong><p>{message}</p></div>{onRetry && <button className="btn btn-small btn-outline" onClick={onRetry}>{t('retry')}</button>}</div>;
}

export function EmptyState({ title, children }) {
  const { t } = useLanguage();
  return <div className="empty-state"><CheckCircle2 size={28} /><h3>{title || t('noRecords')}</h3>{children && <p>{children}</p>}</div>;
}

export function Modal({ open, onClose, title, children, wide = false }) {
  const closeRef = useRef(null);
  const { t } = useLanguage();
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    setTimeout(() => closeRef.current?.focus(), 0);
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('modal-open'); previous?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section className={`modal-panel ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-head"><h2 id="modal-title">{title}</h2><button ref={closeRef} className="icon-button" onClick={onClose} aria-label={t('close')}><X size={20} /></button></div>
      <div className="modal-body">{children}</div>
    </section>
  </div>;
}

export function PageHeader({ eyebrow, title, copy, actions, children }) {
  return <div className="page-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{copy && <p>{copy}</p>}</div>{actions && <div className="page-actions">{actions}</div>}{children}</div>;
}

export function StatCard({ icon: Icon, label, value, note, tone = 'teal' }) {
  return <article className={`stat-card stat-${tone}`}><div className="stat-top"><span className="stat-icon">{Icon && <Icon size={20} />}</span><span className="stat-label">{label}</span></div><strong className="stat-value">{value ?? '—'}</strong>{note && <span className="stat-note">{note}</span>}</article>;
}
