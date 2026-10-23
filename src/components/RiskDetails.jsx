import { useMemo, useState } from 'react';
import { ArrowRight, Gauge, Info, MapPin } from 'lucide-react';
import { StatusBadge } from './UI';

const valueLabel = (component) => {
  if (!component.supplied || component.value == null) return 'Not recorded';
  return `${typeof component.value === 'number' ? Math.round(component.value * 10) / 10 : component.value}${component.unit ? ` ${component.unit}` : ''}`;
};

export function RiskSummary({ report, risk }) {
  if (report.risk_score == null) return null;
  return <section className="risk-summary" aria-label="Risk assessment"><div className="risk-summary-head"><div><span className="eyebrow">FIELD RISK TRIAGE</span><h3>{report.risk_score}/100 · {report.risk_band}</h3></div><StatusBadge status={report.risk_confidence}>{report.risk_confidence} input</StatusBadge></div><div className="risk-component-grid">{(risk?.components || []).map((component) => <div key={component.key}><span>{component.label}</span><strong>+{component.points} · {valueLabel(component)}</strong><small>{component.weight}% weight · threshold {component.threshold}{typeof component.threshold === 'number' && component.unit ? ` ${component.unit}` : ''}</small></div>)}</div><p className="risk-method-note"><Info size={14} />Triage from submitted measurements, not a live prediction.</p></section>;
}

export function RiskAnalyticsPanel({ data, onOpenReport }) {
  const [selectedId, setSelectedId] = useState(null);
  const selected = useMemo(() => data.reports.find((report) => report.id === selectedId) || data.reports[0], [data, selectedId]);
  if (!data.reports.length) return <section className="panel"><h2>Risk analytics</h2><p>No field measurements have been recorded yet.</p></section>;
  return <section className="panel risk-analytics-panel"><div className="panel-head"><div><span className="eyebrow">DECISION SUPPORT</span><h2>Landmark & area risk ranking</h2></div><Gauge size={21} /></div><p className="panel-copy">{data.note}</p><div className="risk-analytics-layout"><div className="risk-ranking">{data.reports.slice(0, 10).map((report, index) => <button key={report.id} className={selected?.id === report.id ? 'active' : ''} onClick={() => setSelectedId(report.id)}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{report.location_text}</strong><small>{report.reference} · {report.risk_confidence} input</small></div><b>{report.risk_score}</b></button>)}</div>{selected && <div className="risk-selected"><div className="risk-selected-head"><div><span className="eyebrow">SELECTED FIELD REPORT</span><h3><MapPin size={17} />{selected.location_text}</h3></div><StatusBadge status={selected.risk_band}>{selected.risk_band} · {selected.risk_score}/100</StatusBadge></div><div className="risk-component-grid">{selected.components.map((component) => <div key={component.key}><span>{component.label}</span><strong>+{component.points} · {valueLabel(component)}</strong><small>{component.weight}% weight · threshold {component.threshold}{typeof component.threshold === 'number' && component.unit ? ` ${component.unit}` : ''}</small></div>)}</div>{onOpenReport && <button className="btn btn-outline btn-small" onClick={() => onOpenReport(selected)}>Open field report<ArrowRight size={15} /></button>}</div>}</div></section>;
}
