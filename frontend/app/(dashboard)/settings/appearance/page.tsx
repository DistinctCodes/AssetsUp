'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value:'light', label:'Light', icon:<Sun size={18}/> },
  { value:'dark', label:'Dark', icon:<Moon size={18}/> },
  { value:'system', label:'System', icon:<Monitor size={18}/> },
];

export default function AppearancePage() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as Theme) ?? 'light';
    setTheme(saved);
  }, []);

  const applyTheme = (t: Theme) => {
    setTheme(t);
    localStorage.setItem('theme', t);
    const isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  };

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Appearance</h1><p className="text-sm text-gray-500 mt-1">Choose your preferred colour theme</p></div>
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-md">
        <p className="text-sm font-medium text-gray-700 mb-4">Theme</p>
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => applyTheme(opt.value)}
              className={lex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors }>
              <span className={theme === opt.value ? 'text-gray-900' : 'text-gray-400'}>{opt.icon}</span>
              <span className="text-xs font-medium text-gray-700">{opt.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4">Theme preference is saved in your browser and persists across sessions.</p>
      </div>
    </div>
  );
}