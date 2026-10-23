export function WorkspaceHeading({ eyebrow, title, copy, actions }) {
  return <div className="workspace-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{copy && <p>{copy}</p>}</div>{actions && <div className="workspace-heading-actions">{actions}</div>}</div>;
}

export function MiniBars({ data = [], labelKey = 'status', valueKey = 'count', color = 'teal' }) {
  const max = Math.max(1, ...data.map((item) => Number(item[valueKey]) || 0));
  return <div className={`mini-bars bars-${color}`}>{data.map((item) => <div className="mini-bar-row" key={item[labelKey]}><div><span>{String(item[labelKey]).replaceAll('_', ' ')}</span><strong>{item[valueKey]}</strong></div><div className="mini-bar-track"><span style={{ width: `${Math.max(3, (Number(item[valueKey]) / max) * 100)}%` }} /></div></div>)}</div>;
}
