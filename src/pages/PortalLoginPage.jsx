import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, Building2, Eye, EyeOff, HeartHandshake, KeyRound, LockKeyhole, UserRound } from 'lucide-react';
import { Brand } from '../components/Brand';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { ThemeSwitch } from '../components/ThemeSwitch';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const portalConfig = {
  welfare: { icon: HeartHandshake, title: 'welfarePortal', id: 'WELFARE-DEMO', subtitle: 'District command & measured field risk' },
  business: { icon: Building2, title: 'businessPortal', id: 'BUSINESS-DEMO', subtitle: 'Organisation coordination' },
  employee: { icon: UserRound, title: 'employeePortal', id: 'EMPLOYEE-DEMO', subtitle: 'Specialized online assignments' },
};

export default function PortalLoginPage() {
  const { portal } = useParams();
  const config = portalConfig[portal];
  const { t } = useLanguage();
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ loginId: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  if (!config) return <Navigate to="/access" replace />;
  const Icon = config.icon;

  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setError('');
    try {
      await login(portal, form.loginId, form.password);
      const intended = location.state?.from;
      navigate(intended?.startsWith(`/${portal}`) ? intended : `/${portal}`, { replace: true });
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  };

  return <div className={`login-page login-${portal}`}>
    <div className="login-brand-panel"><div className="login-panel-art" aria-hidden="true" /><div className="login-brand-top"><Brand /><Link to="/access"><ArrowLeft size={16} />{t('access')}</Link></div><div className="login-brand-content"><span className="login-large-icon"><Icon size={40} /></span><span className="eyebrow eyebrow-light">{config.subtitle}</span><h1>{t(config.title)}</h1><p>{t('authorisedOnly')}</p></div></div>
    <div className="login-form-panel"><div className="login-form-top"><LanguageSwitch /><ThemeSwitch /><Link to="/">{t('backPublic')}</Link></div><div className="login-form-wrap"><div className="login-lock"><LockKeyhole size={24} /></div><span className="eyebrow">{t('authorisedOnly')}</span><h2>{t('login')}</h2>
      {user && <div className="current-session"><span>Signed in as <strong>{user.name}</strong></span>{user.portal === portal && <Link to={`/${portal}`}>Continue<ArrowRight size={14} /></Link>}</div>}
      <form onSubmit={submit} className="login-form"><label className="field"><span>{t('loginId')}</span><div className="input-with-icon"><KeyRound size={18} /><input value={form.loginId} onChange={(event) => setForm({ ...form, loginId: event.target.value })} autoComplete="username" required autoCapitalize="characters" placeholder={config.id} /></div></label><label className="field"><span>{t('password')}</span><div className="input-with-icon"><LockKeyhole size={18} /><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="current-password" required minLength="8" placeholder="••••••••••••" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t('hidePassword') : t('showPassword')}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>{error && <div className="form-error" role="alert"><AlertTriangle size={17} /><span>{error}</span></div>}<button className="btn btn-primary btn-large btn-block" disabled={loading}>{loading ? t('signingIn') : t('signIn')}<ArrowRight size={18} /></button></form>
      <div className="demo-credentials"><div><h3>Evaluation sign-in</h3></div><dl><div><dt>{t('loginId')}</dt><dd>{config.id}</dd></div><div><dt>{t('password')}</dt><dd>Supaul@2026</dd></div></dl><button onClick={() => setForm({ loginId: config.id, password: 'Supaul@2026' })}>Fill ID & password<ArrowRight size={14} /></button></div>
    </div></div>
  </div>;
}
