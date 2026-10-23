import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Building2, CreditCard, FileClock, HandHelping, Headphones, LayoutDashboard, LogOut, PackageCheck, Settings2, UsersRound } from 'lucide-react';
import { Brand } from './Brand';
import { LanguageSwitch } from './LanguageSwitch';
import { ThemeSwitch } from './ThemeSwitch';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const links = [
  ['', 'overview', LayoutDashboard], ['organisation', 'organisation', Building2], ['members', 'members', UsersRound], ['services', 'services', PackageCheck],
  ['coordination', 'coordination', HandHelping], ['billing', 'billing', CreditCard], ['implementation', 'implementation', Settings2], ['analytics', 'analytics', BarChart3], ['support', 'support', Headphones], ['audit', 'auditHistory', FileClock],
];

export function BusinessLayout() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  return <div className="business-page"><header className="business-header"><div className="business-header-top"><Brand to="/business" compact /><div className="business-account"><LanguageSwitch /><ThemeSwitch /><div className="business-user"><span>{user.name.charAt(0)}</span><div><strong>{user.name}</strong><small>{user.organisationName}</small></div></div><button className="icon-button" onClick={logout} aria-label={t('logout')}><LogOut size={18} /></button></div></div><div className="business-nav-row"><div className="business-workspace-name"><Building2 size={17} /><span>ORGANISATION WORKSPACE</span></div><nav>{links.map(([path, key, Icon]) => <NavLink key={path} end={path === ''} to={`/business${path ? `/${path}` : ''}`} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={16} />{t(key)}</NavLink>)}</nav></div></header><main className="business-main"><Outlet /></main><footer className="business-footer"><Brand to="/business" compact /><span>Shared coordination. Private commercial records.</span><NavLink to="/">Public website</NavLink></footer></div>;
}
