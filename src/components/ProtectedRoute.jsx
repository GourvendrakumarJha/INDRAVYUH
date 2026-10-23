import { Navigate, useLocation } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Loading } from './UI';
import { Brand } from './Brand';

export function ProtectedRoute({ portal, children }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  if (loading) return <div className="full-page-state"><Loading /></div>;
  if (!user) return <Navigate to={`/portals/${portal}`} state={{ from: location.pathname }} replace />;
  if (user.portal !== portal) return <div className="access-denied"><Brand /><div className="access-denied-card"><ShieldX size={44} /><span className="eyebrow">403 · {portal.toUpperCase()}</span><h1>Access not authorised</h1><p>Your {user.portal} account cannot enter the {portal} workspace. Server-side permissions also block its API.</p><a className="btn btn-primary" href={`/${user.portal}`}>Go to my workspace</a><a className="btn btn-ghost" href="/">{t('backPublic')}</a></div></div>;
  return children;
}
