import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, clearPreviewToken, getPreviewToken, PREVIEW_SESSION_KEY, setPreviewToken } from '../lib/api';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [demoMode, setDemoMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const sessionVersion = useRef(0);
  useEffect(() => {
    let active = true;
    const version = sessionVersion.current;
    const tokenAtStart = getPreviewToken();
    const unauthorised = (event) => {
      // A late 401 may only clear the credential used by that request. Never
      // let an older request erase a newer login from this or another tab.
      if (event?.detail && event.detail.token !== getPreviewToken()) return;
      sessionVersion.current += 1;
      clearPreviewToken(); setUser(null); setLoading(false);
    };
    const syncLogout = (event) => { if (event.key === PREVIEW_SESSION_KEY && !event.newValue) unauthorised(); };
    window.addEventListener('iv:unauthorized', unauthorised);
    window.addEventListener('storage', syncLogout);
    api('/api/auth/me').then((data) => {
      if (!active || version !== sessionVersion.current) return;
      if (!data.user && getPreviewToken() === tokenAtStart) clearPreviewToken();
      setUser(data.user); setDemoMode(data.demoMode);
    }).catch(() => { if (active && version === sessionVersion.current && getPreviewToken() === tokenAtStart) clearPreviewToken(); }).finally(() => { if (active && version === sessionVersion.current) setLoading(false); });
    return () => { active = false; window.removeEventListener('iv:unauthorized', unauthorised); window.removeEventListener('storage', syncLogout); };
  }, []);
  const value = useMemo(() => ({
    user, loading, demoMode,
    login: async (portal, loginId, password) => {
      sessionVersion.current += 1; setLoading(false);
      const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ portal, loginId, password }) });
      if (data.sessionToken) setPreviewToken(data.sessionToken);
      setUser(data.user); setDemoMode(data.demoMode); setLoading(false); return data.user;
    },
    logout: async () => {
      sessionVersion.current += 1;
      try { await api('/api/auth/logout', { method: 'POST' }); }
      finally { clearPreviewToken(); setUser(null); }
    },
    hasPreviewSession: Boolean(getPreviewToken()),
  }), [user, loading, demoMode]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
