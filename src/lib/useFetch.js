import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

export function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!url) return;
    setLoading(true); setError('');
    try { setData(await api(url)); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [url]);
  useEffect(() => { load(); }, [load]);
  return { data, loading, error, refresh: load, setData };
}
