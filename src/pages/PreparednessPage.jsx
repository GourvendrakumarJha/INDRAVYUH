import { BookOpenCheck, FileText, ShieldCheck, Waves } from 'lucide-react';
import { PublicPageHeader } from '../components/PublicPageHeader';
import { useLanguage } from '../context/LanguageContext';

const cards = [
  [Waves, 'Before flooding', 'Keep water, essential medicines, a torch and charged phone ready.'],
  [ShieldCheck, 'During flooding', 'Move higher only if safe. Never walk or drive through moving water.'],
  [FileText, 'Documents', 'Keep identification and important papers in a waterproof pouch.'],
  [BookOpenCheck, 'After flooding', 'Return only after authorised local confirmation. Avoid damaged wires and structures.'],
];

export default function PreparednessPage() {
  const { t } = useLanguage();
  return <>
    <PublicPageHeader eyebrow={t('districtTag')} title={t('prepTitle')} icon={BookOpenCheck} tone="green" />
    <section className="section safety-page"><div className="container"><div className="safety-grid">{cards.map(([Icon, title, copy]) => <article className="safety-card" key={title}><Icon size={25} /><h2>{title}</h2><p>{copy}</p></article>)}</div></div></section>
  </>;
}
