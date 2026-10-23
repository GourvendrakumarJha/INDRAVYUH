import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { QuickSos } from '../components/QuickSos';

const SosContext = createContext(null);

export function SosProvider({ children }) {
  const [open, setOpen] = useState(false);
  const openSos = useCallback(() => setOpen(true), []);
  const closeSos = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ openSos }), [openSos]);
  return <SosContext.Provider value={value}>{children}<QuickSos open={open} onClose={closeSos} /></SosContext.Provider>;
}

export const useSos = () => useContext(SosContext);
