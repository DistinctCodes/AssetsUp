'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contrib/hooks/use-theme';
import { Button } from './button';

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <div className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggleTheme} className="w-9 h-9 p-0">
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
