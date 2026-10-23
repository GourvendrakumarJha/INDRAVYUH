import { useLanguage } from '../context/LanguageContext';

export function LanguageSwitch({ dark = false }) {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div className={`language-switch ${dark ? 'on-dark' : ''}`} role="group" aria-label={t('language')}>
      <button type="button" className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')} aria-pressed={language === 'en'} lang="en">EN</button>
      <span aria-hidden="true" />
      <button type="button" className={language === 'hi' ? 'active' : ''} onClick={() => setLanguage('hi')} aria-pressed={language === 'hi'} lang="hi">हिन्दी</button>
    </div>
  );
}
