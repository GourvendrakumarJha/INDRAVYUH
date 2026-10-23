import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, MessageSquareWarning, ShieldCheck, Siren, X } from 'lucide-react';
import { Brand } from './Brand';
import { LanguageSwitch } from './LanguageSwitch';
import { ThemeSwitch } from './ThemeSwitch';
import { useLanguage } from '../context/LanguageContext';
import { useSos } from '../context/SosContext';

const navItems = [['/map', 'map'], ['/alerts', 'alerts'], ['/shelters', 'shelters'], ['/preparedness', 'preparedness']];

export function PublicLayout() {
  const { t } = useLanguage();
  const { openSos } = useSos();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    const route = location.pathname.split('/')[1];
    const key = navItems.find(([path]) => path === `/${route}`)?.[1];
    document.title = `${key ? t(key) : 'INDRAVYUH'} · Supaul`;
  }, [location.pathname, t]);

  return <div className="public-shell">
    <a className="skip-link" href="#main-content">{t('skip')}</a>
    <header className="public-header">
      <div className="container header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Primary navigation">{navItems.map(([path, key]) => <NavLink key={path} to={path} className={({ isActive }) => isActive ? 'active' : ''}>{t(key)}</NavLink>)}</nav>
        <div className="header-actions">
          <button className="btn btn-danger btn-small header-sos" onClick={openSos}><Siren size={17} /><span>SOS</span></button>
          <LanguageSwitch dark />
          <ThemeSwitch onDark />
          <Link to="/access" className="portal-link"><ShieldCheck size={16} /><span>{t('access')}</span></Link>
          <Link to="/report" className="btn btn-report btn-small"><MessageSquareWarning size={17} /><span>{t('report')}</span></Link>
          <button className="mobile-menu-button" aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? t('close') : 'Menu'} onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </div>
      <div className="public-scroll-progress" aria-hidden="true" />
      {menuOpen && <nav id="mobile-navigation" className="mobile-nav container" aria-label="Mobile navigation">
        {navItems.map(([path, key]) => <NavLink key={path} to={path}>{t(key)}<ArrowUpRight size={17} /></NavLink>)}
        <NavLink to="/track">{t('track')}<ArrowUpRight size={17} /></NavLink>
        <NavLink to="/family-safety">{t('familySafety')}<ArrowUpRight size={17} /></NavLink>
        <NavLink to="/access">{t('access')}<ArrowUpRight size={17} /></NavLink>
      </nav>}
    </header>
    <main id="main-content"><Outlet /></main>
    <footer className="public-footer">
      <div className="container footer-grid">
        <div className="footer-brand"><Brand /><span className="footer-tagline">Supaul · Bihar</span></div>
        <div><h2>{t('publicServices')}</h2><button onClick={openSos}>SOS</button><Link to="/report">{t('report')}</Link><Link to="/map">{t('map')}</Link><Link to="/track">{t('track')}</Link><Link to="/family-safety">{t('familySafety')}</Link></div>
        <div><h2>{t('workspaces')}</h2><Link to="/portals/welfare">{t('welfarePortal')}</Link><Link to="/portals/business">{t('businessPortal')}</Link><Link to="/portals/employee">{t('employeePortal')}</Link></div>
        <div><h2>{t('trustSafety')}</h2><Link to="/about#privacy">{t('privacy')}</Link><a href="https://supaul.nic.in/" target="_blank" rel="noreferrer">Supaul district website <ArrowUpRight size={13} /></a><Link to="/preparedness">{t('preparedness')}</Link></div>
      </div>
      <div className="container footer-bottom"><span>© 2026 INDRAVYUH</span><span>Where chaos meets coordination.</span></div>
    </footer>
    <div className="mobile-emergency-bar"><button onClick={openSos} className="mobile-help"><Siren size={19} />SOS</button><Link to="/report" className="mobile-report"><MessageSquareWarning size={18} />{t('report')}</Link></div>
  </div>;
}
