import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function ThemeSwitch({ onDark = false }) {
  const { theme, toggleTheme } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return <button className={`theme-toggle ${onDark ? 'on-dark' : ''}`} onClick={toggleTheme} aria-label={`Switch to ${next} mode`} title={`${next === 'dark' ? 'Dark' : 'Light'} mode`}>
    {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}<span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
  </button>;
}
