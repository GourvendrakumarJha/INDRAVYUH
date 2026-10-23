import { useState } from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { BellRing, Boxes, ChartNoAxesCombined, FileClock, HandHelping, Landmark, LayoutDashboard, LogOut, Map, Menu, MessageSquareWarning, ShieldCheck, Siren, UsersRound, X } from 'lucide-react';
import { Brand } from './Brand';
import { LanguageSwitch } from './LanguageSwitch';
import { ThemeSwitch } from './ThemeSwitch';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const links = [
  ['', 'overview', LayoutDashboard], ['map', 'operationsMap', Map], ['sos', 'sosQueue', Siren], ['reports', 'citizenReports', MessageSquareWarning],
  ['coordination', 'coordination', HandHelping], ['rescue', 'rescueTeams', UsersRound], ['shelters', 'shelters', Landmark], ['relief', 'reliefInventory', Boxes],
  ['alerts', 'alerts', BellRing], ['analytics', 'analytics', ChartNoAxesCombined], ['audit', 'auditHistory', FileClock],
];

export function WelfareLayout() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { section = '' } = useParams();
  const [menu, setMenu] = useState(false);
  const current = links.find(([path]) => path === section) || links[0];
  const CurrentIcon = current[2];
  return <div className="welfare-page"><div className="welfare-shell">
    <aside className={`welfare-sidebar ${menu ? 'open' : ''}`}><div className="welfare-brand"><Brand to="/welfare" compact /><button onClick={() => setMenu(false)} className="sidebar-close" aria-label={t('close')}><X /></button></div><div className="workspace-label"><span>SUPAUL</span><strong>CHIEF ADMINISTRATION</strong></div><nav>{links.map(([path, key, Icon]) => <NavLink key={path} end={path === ''} to={`/welfare${path ? `/${path}` : ''}`} onClick={() => setMenu(false)} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={18} /><span>{t(key)}</span>{path === 'sos' && <i className="nav-alert-dot" />}</NavLink>)}</nav><div className="sidebar-bottom"><div className="restricted-label"><ShieldCheck size={15} /><span>{t('internalRestricted')}</span></div><NavLink to="/" className="public-site-link">← {t('backPublic')}</NavLink></div></aside>
    {menu && <button className="sidebar-overlay" onClick={() => setMenu(false)} aria-label={t('close')} />}
    <main className="welfare-main"><header className="welfare-topbar"><div><button className="sidebar-toggle" onClick={() => setMenu(true)} aria-label="Menu"><Menu size={21} /></button><span className="topbar-section-icon"><CurrentIcon size={19} /></span><div><span>SUPAUL DISTRICT</span><strong>{t(current[1])}</strong></div></div><div className="welfare-top-actions"><LanguageSwitch /><ThemeSwitch /><div className="user-menu"><span className="user-avatar">{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><div><strong>{user.name}</strong><span>{user.role === 'welfare_admin' ? 'Chief Administrator' : 'Chief Operations Operator'}</span></div></div><button className="icon-button" onClick={logout} title={t('logout')} aria-label={t('logout')}><LogOut size={19} /></button></div></header><div className="welfare-content"><Outlet /></div></main>
  </div></div>;
}
