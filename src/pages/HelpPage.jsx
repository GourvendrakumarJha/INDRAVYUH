import { HandHelping, ShieldCheck, Siren } from 'lucide-react';
import { PublicPageHeader } from '../components/PublicPageHeader';
import { useLanguage } from '../context/LanguageContext';
import { useSos } from '../context/SosContext';

export default function HelpPage() {
  const { t } = useLanguage();
  const { openSos } = useSos();
  return <>
    <PublicPageHeader eyebrow={t('districtTag')} title="SOS · Supaul" icon={HandHelping} tone="red"><button className="btn btn-emergency" onClick={openSos}><Siren size={18} />Send GPS SOS</button></PublicPageHeader>
    <section className="section help-page"><div className="container narrow-container"><div className="quick-sos-inline"><div className="quick-sos-progress"><span className="quick-sos-pulse"><Siren size={32} /></span><h3>One press. Your current GPS location.</h3><p>No incident form is shown for SOS. Press only when you need the signal stored in the restricted Chief Administration queue.</p><button className="btn btn-danger btn-large" onClick={openSos}><Siren size={20} />Send GPS SOS now</button><span className="sos-safety-note"><ShieldCheck size={16} />Move to safety if possible and follow authorised local instructions.</span></div></div></div></section>
  </>;
}
