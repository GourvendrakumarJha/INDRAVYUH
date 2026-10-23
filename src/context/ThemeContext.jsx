import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('indravyuh-theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark';
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#061b2b' : '#edf8fb');
    try { localStorage.setItem('indravyuh-theme', theme); } catch {}
  }, [theme]);
  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme: () => setTheme(value => value === 'dark' ? 'light' : 'dark') }}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
