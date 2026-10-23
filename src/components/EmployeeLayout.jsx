import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BellRing, CalendarDays, FileText, LayoutDashboard, ListChecks, LogOut, Menu, UserRound, X } from 'lucide-react';
import { Brand } from './Brand';
import { LanguageSwitch } from './LanguageSwitch';
import { ThemeSwitch } from './ThemeSwitch';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const links = [['', 'overview', LayoutDashboard], ['tasks', 'tasks', ListChecks], ['notices', 'notices', BellRing], ['leave', 'leave', CalendarDays], ['documents', 'documents', FileText], ['profile', 'profile', UserRound]];

export function EmployeeLayout() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  return <div className="employee-page"><header className="employee-header"><Brand to="/employee" compact /><span className="specialized-portal-badge">Specialized Action</span><button className="employee-menu-toggle" onClick={() => setOpen((value) => !value)} aria-label="Menu">{open ? <X /> : <Menu />}</button><nav className={open ? 'open' : ''}>{links.map(([path, key, Icon]) => <NavLink key={path} end={path === ''} to={`/employee${path ? `/${path}` : ''}`} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={17} />{t(key)}</NavLink>)}</nav><div className="employee-actions"><LanguageSwitch dark /><ThemeSwitch onDark /><div className="employee-avatar">{user.name.charAt(0)}</div><button className="icon-button" onClick={logout} aria-label={t('logout')}><LogOut size={18} /></button></div></header><main className="employee-main"><Outlet /></main></div>;
}
