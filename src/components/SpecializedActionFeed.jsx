import { CheckCircle2, ClipboardCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { formatDate } from '../lib/api';
import { EmptyState, StatusBadge } from './UI';

export const specializedTaskLabels = {
  general: 'General coordination', citizen_verification: 'Citizen verification', monitoring: 'Monitoring',
  communication: 'Communication', relief_supply: 'Relief supply', tracking: 'Tracking', notification: 'Notification push',
};

export function SpecializedActionFeed({ items = [], title = 'Specialized action updates', compact = false }) {
  const { language } = useLanguage();
  return <section className="panel table-panel specialized-action-feed"><div className="panel-head"><div><span className="eyebrow">CHIEF ADMINISTRATION FEEDBACK LOOP</span><h2>{title}</h2></div><ClipboardCheck size={21} /></div>
    {items.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Action</th><th>Officer</th><th>Linked record</th><th>Status / outcome</th><th>Updated</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.title}</strong><small className="table-subline">{specializedTaskLabels[item.task_type] || specializedTaskLabels.general}</small>{!compact && item.result_note && <small className="specialized-result-note"><CheckCircle2 size={13} />{item.result_note}</small>}</td><td>{item.employee_name}</td><td>{item.report_reference || item.delivery_reference || item.delivery_id || item.delivery_destination || 'Internal'}</td><td><StatusBadge status={item.status}>{item.status}</StatusBadge>{item.completion_outcome && <small className="table-subline">{item.completion_outcome}</small>}</td><td>{formatDate(item.updated_at, language)}</td></tr>)}</tbody></table></div> : <EmptyState title="No specialized assignments yet" />}
  </section>;
}
