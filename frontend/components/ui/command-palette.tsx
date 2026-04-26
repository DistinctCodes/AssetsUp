'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, LayoutDashboard, Package, FileText, Settings, Users } from 'lucide-react';
import { api } from '@/lib/api';
import type { Asset } from '@/lib/query/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  type: 'navigation';
}

interface AssetResult {
  id: string;
  label: string;
  href: string;
  subtitle: string;
  icon: React.ReactNode;
  type: 'asset';
}

type CommandItem = NavigationItem | AssetResult;

const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: 'nav-dashboard', label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={16} />, type: 'navigation' },
  { id: 'nav-assets', label: 'Assets', href: '/assets', icon: <Package size={16} />, type: 'navigation' },
  { id: 'nav-reports', label: 'Reports', href: '/reports', icon: <FileText size={16} />, type: 'navigation' },
  { id: 'nav-settings', label: 'Settings', href: '/settings', icon: <Settings size={16} />, type: 'navigation' },
  { id: 'nav-users', label: 'Users', href: '/users', icon: <Users size={16} />, type: 'navigation' },
];

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when palette closes
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setAssets([]);
    }
  }, [isOpen]);

  // Search assets when user types
  useEffect(() => {
    if (!search.trim()) {
      setAssets([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await api.get<{ data: Asset[] }>('/assets', {
          params: { search: search.trim() },
        });
        setAssets(response.data.data);
      } catch (error) {
        console.error('Failed to search assets:', error);
        setAssets([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search]);

  // Build combined results list
  const results: CommandItem[] = [
    ...NAVIGATION_ITEMS,
    ...assets.map((asset) => ({
      id: `asset-${asset.id}`,
      label: asset.name,
      href: `/assets/${asset.id}`,
      subtitle: asset.assetId,
      icon: <Package size={16} />,
      type: 'asset' as const,
    })),
  ];

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) {
          router.push(selected.href);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [results, selectedIndex, router, onClose]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200">
          <Search size={20} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search assets or navigate..."
            className="flex-1 text-sm outline-none text-gray-900 placeholder:text-gray-400"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          {isSearching && (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          )}
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[400px] overflow-y-auto py-2"
          onKeyDown={handleKeyDown}
        >
          {results.length === 0 && !isSearching && (
            <div className="px-4 py-12 text-center text-sm text-gray-400">
              No results found
            </div>
          )}

          {results.map((item, index) => (
            <button
              key={item.id}
              className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                index === selectedIndex
                  ? 'bg-blue-50 text-blue-900'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => {
                router.push(item.href);
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="text-gray-400 shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.label}</div>
                {item.type === 'asset' && (
                  <div className="text-xs text-gray-400 truncate">{item.subtitle}</div>
                )}
              </div>
              {item.type === 'navigation' && (
                <ArrowRight size={14} className="text-gray-400 shrink-0" />
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">
              ↑↓
            </kbd>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">
              ↵
            </kbd>
            <span>Select</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">
              ESC
            </kbd>
            <span>Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
