'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  Package,
  Users,
  Building2,
  BarChart3,
  X,
} from 'lucide-react';

const NAV_COMMANDS = [
  { label: 'Go to Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Go to Assets', href: '/assets', icon: Package },
  { label: 'Go to Departments', href: '/departments', icon: Building2 },
  { label: 'Go to Reports', href: '/reports', icon: BarChart3 },
  { label: 'Go to Users', href: '/users', icon: Users },
];

interface AssetResult {
  id: string;
  name: string;
  assetTag: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [assets, setAssets] = useState<AssetResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (open) {
      setQuery('');
      setAssets([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const searchAssets = useCallback((q: string) => {
    if (q.length < 3) {
      setAssets([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6003/api';
        const token =
          typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
        const res = await fetch(
          `${API}/assets?search=${encodeURIComponent(q)}&limit=5`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) {
          const data = await res.json();
          setAssets(data.data ?? data ?? []);
        }
      } catch {
        setAssets([]);
      }
      setLoading(false);
    }, 250);
  }, []);

  useEffect(() => {
    searchAssets(query);
  }, [query, searchAssets]);

  const navigate = (href: string) => {
    router.push(href);
    onClose();
  };

  const filteredNav = NAV_COMMANDS.filter(
    (c) => !query || c.label.toLowerCase().includes(query.toLowerCase()),
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
            placeholder="Search pages and assets..."
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear">
              <X size={16} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filteredNav.length > 0 && (
            <div>
              <p className="px-4 py-1 text-xs font-medium text-gray-400 uppercase tracking-wide">
                Pages
              </p>
              {filteredNav.map((cmd) => (
                <button
                  key={cmd.href}
                  onClick={() => navigate(cmd.href)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
                >
                  <cmd.icon size={16} className="text-gray-400" />
                  {cmd.label}
                </button>
              ))}
            </div>
          )}

          {assets.length > 0 && (
            <div>
              <p className="px-4 py-1 text-xs font-medium text-gray-400 uppercase tracking-wide mt-1">
                Assets
              </p>
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => navigate(`/assets/${asset.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
                >
                  <Package size={16} className="text-gray-400" />
                  <span>{asset.name}</span>
                  <span className="ml-auto text-xs text-gray-400">{asset.assetTag}</span>
                </button>
              ))}
            </div>
          )}

          {loading && (
            <p className="px-4 py-3 text-sm text-gray-400">Searching...</p>
          )}

          {!loading &&
            query.length >= 3 &&
            assets.length === 0 &&
            filteredNav.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-400">
                No results for &quot;{query}&quot;
              </p>
            )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex gap-3 text-xs text-gray-400">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  );
}
