export const PREVIEW_SESSION_KEY = 'iv_preview_session';
let memoryPreviewToken = '';

const storageGet = (storage, key) => { try { return storage.getItem(key) || ''; } catch { return ''; } };
const storageSet = (storage, key, value) => { try { storage.setItem(key, value); } catch { /* A cookie remains available. */ } };
const storageRemove = (storage, key) => { try { storage.removeItem(key); } catch { /* Storage may be blocked. */ } };

export function getPreviewToken() {
  if (typeof window === 'undefined') return '';
  let persistent = '', tabToken = '';
  try { persistent = storageGet(window.localStorage, PREVIEW_SESSION_KEY); } catch { /* Storage access can itself be blocked. */ }
  try { tabToken = storageGet(window.sessionStorage, PREVIEW_SESSION_KEY); } catch { /* Use the in-memory credential. */ }
  const token = persistent || tabToken || memoryPreviewToken;
  if (token) memoryPreviewToken = token;
  if (token && !persistent) { try { storageSet(window.localStorage, PREVIEW_SESSION_KEY, token); } catch { /* Memory remains available. */ } }
  return token;
}
export function setPreviewToken(token) {
  if (typeof window === 'undefined' || !token) return;
  // Some embedded previews block both cookies and Web Storage. Keep the
  // credential for the current page even when neither persistence API works.
  memoryPreviewToken = token;
  try { storageSet(window.localStorage, PREVIEW_SESSION_KEY, token); } catch { /* Memory remains available. */ }
  try { storageSet(window.sessionStorage, PREVIEW_SESSION_KEY, token); } catch { /* Memory remains available. */ }
}
export function clearPreviewToken() {
  memoryPreviewToken = '';
  if (typeof window === 'undefined') return;
  try { storageRemove(window.localStorage, PREVIEW_SESSION_KEY); } catch { /* Already unavailable. */ }
  try { storageRemove(window.sessionStorage, PREVIEW_SESSION_KEY); } catch { /* Already unavailable. */ }
}

const usesPrivateSession = (path) => /^\/api\/(welfare|business|employee)(\/|$)/.test(path) || /^\/api\/auth\/(me|logout)$/.test(path);

export async function api(path, options = {}) {
  const execute = async (allowRecovery) => {
    const headers = new Headers(options.headers || {});
    const previewToken = getPreviewToken();
    if (previewToken && usesPrivateSession(path)) {
      if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${previewToken}`);
      if (!headers.has('X-INDRAVYUH-Session')) headers.set('X-INDRAVYUH-Session', previewToken);
    }
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const response = await fetch(path, { ...options, headers, credentials: 'same-origin' });
    if (response.status === 401 && previewToken && allowRecovery && usesPrivateSession(path)) {
      // Retry once with the HttpOnly cookie. This covers stale tokens left by a
      // previous preview process without hiding a still-valid cookie session.
      if (getPreviewToken() === previewToken) clearPreviewToken();
      return execute(false);
    }
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
      if (response.status === 401 && usesPrivateSession(path)) {
        clearPreviewToken();
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('iv:unauthorized', { detail: { token: previewToken } }));
      }
      const error = new Error(data?.error || data?.message || `Request failed (${response.status})`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  };
  return execute(true);
}

export async function downloadFile(path, filename = 'indravyuh-export.csv') {
  const execute = async (allowRecovery) => {
    const token = getPreviewToken();
    const headers = new Headers();
    if (token) { headers.set('Authorization', `Bearer ${token}`); headers.set('X-INDRAVYUH-Session', token); }
    const response = await fetch(path, { headers, credentials: 'same-origin' });
    if (response.status === 401 && token && allowRecovery) { if (getPreviewToken() === token) clearPreviewToken(); return execute(false); }
    if (!response.ok) {
      let message = `Download failed (${response.status})`;
      try { message = (await response.json()).error || message; } catch { /* Non-JSON response. */ }
      if (response.status === 401 && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('iv:unauthorized', { detail: { token } }));
      throw new Error(message);
    }
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return execute(true);
}

export function formatDate(value, language = 'en', withTime = true) {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00+05:30` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

export function relativeTime(value, language = 'en') {
  if (!value) return '—';
  const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3600000));
  if (hours < 1) return language === 'hi' ? 'अभी' : 'Just now';
  if (hours < 24) return language === 'hi' ? `${hours} घंटे पहले` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return language === 'hi' ? `${days} दिन पहले` : `${days}d ago`;
}

export const statusClass = (status = '') => {
  const value = status.toLowerCase();
  if (/resolved|completed|paid|available|approved|active|published|safe|delivered|complete/.test(value)) return 'status-success';
  if (/critical|urgent|declined|closed|rejected|unavailable|need assistance|cancelled/.test(value)) return 'status-danger';
  if (/high|pending|submitted|review|due|blocked|waiting|unverified|unconfirmed|partial|transit/.test(value)) return 'status-warning';
  if (/progress|assigned|verified|route|task|responding|dispatched|acknowledged|shelter/.test(value)) return 'status-info';
  return 'status-neutral';
};

export const categoryLabel = (category, language = 'en') => {
  const labels = {
    flooding: ['Flooding', 'बाढ़'], road_blocked: ['Blocked road', 'सड़क अवरुद्ध'],
    infrastructure: ['Infrastructure damage', 'बुनियादी ढांचा क्षति'], waterlogging: ['Waterlogging', 'जलभराव'],
    embankment: ['Embankment concern', 'तटबंध संबंधी चिंता'], medical: ['Medical emergency', 'चिकित्सा आपातकाल'],
    missing_person: ['Missing person', 'लापता व्यक्ति'], stranded: ['Stranded person', 'फंसा व्यक्ति'],
    other: ['Other hazard', 'अन्य जोखिम'],
  };
  return labels[category]?.[language === 'hi' ? 1 : 0] || category;
};
