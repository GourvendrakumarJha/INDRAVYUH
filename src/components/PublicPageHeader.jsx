export function PublicPageHeader({ eyebrow, title, copy, icon: Icon, tone = 'teal', children }) {
  return <section className={`public-page-hero page-hero-${tone}`}><div className="page-hero-contour" aria-hidden="true" /><div className="container public-page-hero-inner"><div><span className="eyebrow eyebrow-light">{eyebrow}</span><h1>{title}</h1>{copy && <p>{copy}</p>}{children}</div>{Icon && <div className="page-hero-icon"><Icon size={50} strokeWidth={1.25} /></div>}</div></section>;
}
