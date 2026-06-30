"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader, Package, Users, FileText, X } from "lucide-react";

// Mock data - replace with API call
const mockResults = {
  assets: [
    { id: "ASSET-001", name: "Laptop 1", details: "SN: 12345, Status: Active" },
    { id: "ASSET-002", name: "Laptop 2", details: "SN: 67890, Status: In Repair" },
  ],
  users: [
    { id: "USER-001", name: "John Doe", details: "john.doe@example.com" },
    { id: "USER-002", name: "Jane Smith", details: "jane.smith@example.com" },
  ],
  documents: [
    { id: "DOC-001", name: "Invoice #123", details: "Vendor: Office Supplies Inc." },
  ],
};

const resultIcons = {
  assets: <Package size={18} />,
  users: <Users size={18} />,
  documents: <FileText size={18} />,
};

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    if (!isOpen) return;

    const handler = setTimeout(() => {
      if (query) {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
          setResults(mockResults);
          setLoading(false);
          setActiveIndex(0);
        }, 300);
      } else {
        setResults(null);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query, isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const allResults = results
        ? Object.values(results).flat()
        : [];

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % allResults.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex(
          (prev) => (prev - 1 + allResults.length) % allResults.length
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0) {
          const selectedResult = allResults[activeIndex] as any;
          // This is a placeholder. Replace with actual navigation logic.
          const entityType = Object.keys(results).find(key => results[key].includes(selectedResult));
          if (entityType) {
            router.push(`/${entityType}/${selectedResult.id}`);
            onClose();
          }
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, activeIndex, router, onClose]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults(null);
      setActiveIndex(-1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allResults = results ? Object.values(results).flat() : [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-start pt-20">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center border-b border-gray-200 dark:border-gray-700">
          <div className="pl-4 pr-2 text-gray-400">
            {loading ? <Loader size={18} className="animate-spin" /> : <Search size={18} />}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for assets, users, documents..."
            className="w-full h-12 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {results &&
            Object.entries(results).map(([group, items]: [string, any[]]) => (
              <div key={group}>
                {items.length > 0 && (
                  <h3 className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {group}
                  </h3>
                )}
                <ul>
                  {items.map((item, index) => {
                    const overallIndex = allResults.findIndex(r => r.id === item.id);
                    return (
                      <li
                        key={item.id}
                        onMouseEnter={() => setActiveIndex(overallIndex)}
                        className={`mx-2 p-3 rounded-lg cursor-pointer flex items-center gap-3 ${
                          activeIndex === overallIndex
                            ? "bg-gray-100 dark:bg-gray-700"
                            : ""
                        }`}
                        onClick={() => {
                          router.push(`/${group}/${item.id}`);
                          onClose();
                        }}
                      >
                        <div className="text-gray-400">{resultIcons[group as keyof typeof resultIcons]}</div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{item.details}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

          {!loading && query && !results && (
            <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No results for "<span className="font-semibold">{query}</span>"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}