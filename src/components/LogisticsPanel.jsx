import { useState } from 'react';
import { AlertTriangle, ArrowRight, Boxes, PackageCheck, Plus, Truck } from 'lucide-react';
import { Modal, StatusBadge } from './UI';
import { api, formatDate } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';

export function LogisticsPanel({ data, refresh }) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const openComposer = () => {
    setForm({ itemId: data.relief[0]?.id || '', quantity: '', destination: '', area: 'Supaul', peopleReached: '', note: '' });
    setError(''); setOpen(true);
  };
  const create = async (event) => {
    event.preventDefault(); setError('');
    try {
      const result = await api('/api/welfare/logistics/deliveries', { method: 'POST', body: JSON.stringify({ ...form, itemId: Number(form.itemId), quantity: Number(form.quantity), peopleReached: form.peopleReached === '' ? null : Number(form.peopleReached) }) });
      setOpen(false); setMessage(`Delivery ${result.id} created and stock allocated.`); refresh();
    } catch (requestError) { setError(requestError.message); }
  };
  const update = async (id, status) => {
    setError('');
    try { await api(`/api/welfare/logistics/deliveries/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); setMessage(`Delivery marked ${status}.`); refresh(); }
    catch (requestError) { setError(requestError.message); }
  };
  return <section className="logistics-panel"><div className="command-heading"><div><span className="eyebrow">RELIEF & LOGISTICS OPERATOR</span><h2>Allocation and deliveries</h2><p>Allocate available stock, then track transit and delivery.</p></div><button className="btn btn-primary" onClick={openComposer} disabled={!data.relief.length}><Plus size={16} />Create delivery</button></div>
    <div className="command-metric-strip logistics-metrics"><div><span>Relief depots</span><strong>{data.metrics.depots}</strong></div><div><span>Distribution records</span><strong>{data.metrics.distributionRequests}</strong></div><div><span>Critical shortages</span><strong>{data.metrics.criticalShortages}</strong></div><div><span>In transit</span><strong>{data.metrics.inTransit}</strong></div></div>
    {(message || error) && <p className={error ? 'form-error' : 'inline-message'} role="status">{error || message}</p>}
    <section className="panel table-panel"><div className="panel-head"><div><span className="eyebrow">DELIVERY BOARD</span><h2>Relief movements</h2></div><Truck size={21} /></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Delivery</th><th>Destination</th><th>Allocation</th><th>People reached</th><th>Status</th><th>Updated</th></tr></thead><tbody>{data.deliveries.map((delivery) => <tr key={delivery.id}><td><strong>{delivery.id}</strong><small className="table-subline">{delivery.item} · {delivery.created_by_name || 'Chief Administration'}</small></td><td><strong>{delivery.destination}</strong><small className="table-subline">{delivery.area} · {delivery.note}</small></td><td>{delivery.quantity} {delivery.unit}</td><td>{delivery.people_reached ?? '—'}</td><td><select aria-label={`Status for ${delivery.id}`} value={delivery.status} disabled={delivery.status !== 'In transit'} onChange={(event) => update(delivery.id, event.target.value)}>{['In transit', 'Delivered', 'Cancelled'].map((status) => <option key={status}>{status}</option>)}</select><StatusBadge status={delivery.status}>{delivery.status}</StatusBadge></td><td>{formatDate(delivery.updated_at, language)}</td></tr>)}</tbody></table></div>{!data.deliveries.length && <div className="empty-inline"><PackageCheck size={18} />No deliveries recorded yet.</div>}</section>
    <Modal open={open} onClose={() => setOpen(false)} title="Create relief delivery"><form className="modal-form" onSubmit={create}><label className="field"><span>Relief item *</span><select value={form?.itemId || ''} onChange={(event) => setForm({ ...form, itemId: event.target.value })} required>{data.relief.map((item) => <option value={item.id} key={item.id}>{item.item} · {item.quantity} {item.unit} available</option>)}</select></label><div className="form-grid"><label className="field"><span>Quantity *</span><input type="number" min="0.01" step="any" value={form?.quantity || ''} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required /></label><label className="field"><span>People reached (planned)</span><input type="number" min="0" value={form?.peopleReached || ''} onChange={(event) => setForm({ ...form, peopleReached: event.target.value })} /></label><label className="field"><span>Destination *</span><input value={form?.destination || ''} onChange={(event) => setForm({ ...form, destination: event.target.value })} minLength="3" required placeholder="Named landmark or coordination point" /></label><label className="field"><span>Area *</span><input value={form?.area || ''} onChange={(event) => setForm({ ...form, area: event.target.value })} minLength="3" required /></label></div><label className="field"><span>Allocation note *</span><textarea rows="3" minLength="3" value={form?.note || ''} onChange={(event) => setForm({ ...form, note: event.target.value })} required /></label>{error && <div className="form-error"><AlertTriangle size={16} />{error}</div>}<button className="btn btn-primary"><Boxes size={16} />Allocate stock & create delivery<ArrowRight size={15} /></button></form></Modal>
  </section>;
}
