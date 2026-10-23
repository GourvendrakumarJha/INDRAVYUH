import { Accessibility, FileCheck2, ShieldCheck } from 'lucide-react';
import { PublicPageHeader } from '../components/PublicPageHeader';
import { useLanguage } from '../context/LanguageContext';

export default function AboutPage() {
  const { t } = useLanguage();
  return <><PublicPageHeader eyebrow={t('districtTag')} title="About INDRAVYUH" icon={ShieldCheck} /><section className="section about-page"><div className="container"><div className="about-policy-grid"><article id="privacy"><FileCheck2 size={24} /><h2>{t('privacy')}</h2><p>Private tracking needs both codes. Public incidents exclude SOS, contacts and precise coordinates.</p></article><article id="accessibility"><Accessibility size={24} /><h2>{t('accessibility')}</h2><p>Keyboard controls, responsive layouts, English/Hindi and light/dark modes are built in.</p></article><article id="limitations"><ShieldCheck size={24} /><h2>{t('limitations')}</h2><p>Reports require authorised review. Submission does not guarantee a response; follow authorised local instructions for immediate danger.</p></article></div></div></section></>;
}
