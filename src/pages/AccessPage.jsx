import { ArrowRight, Building2, LockKeyhole, ShieldCheck, Workflow } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { ThemeSwitch } from '../components/ThemeSwitch';
import { useLanguage } from '../context/LanguageContext';

export default function AccessPage() {
  const { t } = useLanguage();
  const portals = [['welfare', ShieldCheck, 'welfarePortal'], ['business', Building2, 'businessPortal'], ['employee', Workflow, 'employeePortal']];
  return <div className="access-page"><header className="access-header container"><Brand /><div><LanguageSwitch dark /><ThemeSwitch onDark /><Link to="/" className="btn btn-glass btn-small">{t('backPublic')}</Link></div></header><main className="container access-main"><div className="access-intro"><span className="eyebrow eyebrow-light"><LockKeyhole size={15} />{t('authorisedOnly')}</span><h1>{t('access')}</h1></div><div className="access-portal-grid">{portals.map(([id, Icon, title]) => <article className={`access-portal-card access-${id}`} key={id}><div className="access-portal-icon"><Icon size={29} /></div><h2>{t(title)}</h2><p>ID + password</p><Link to={`/portals/${id}`} className="btn btn-primary btn-block">{t('signIn')}<ArrowRight size={17} /></Link></article>)}</div></main></div>;
}
