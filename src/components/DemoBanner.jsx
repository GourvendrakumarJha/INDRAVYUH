import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function DemoBanner() {
  const { t } = useLanguage();
  return <div className="demo-banner" role="note">
    <div className="container demo-banner-inner">
      <span><AlertTriangle size={15} aria-hidden="true" /><strong>{t('demoShort')}</strong><span className="demo-banner-long"> · {t('demoFull')}</span></span>
      <span>{t('emergency')}</span>
    </div>
  </div>;
}
