"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Package, Users, FileText, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  id: string;
  type: "asset" | "user" | "document";
  title: string;
  subtitle: string;
  href: string;
}

const TYPE_ICONS: Record<string, typeof Package> = {
  asset: Package,
  user: Users,
  document: FileText,
};

const TYPE_COLORS: Record<string, string> = {
  asset: "bg-blue-100 text-blue-700",
  user: "bg-purple-100 text-purple-700",
  document: "bg-green-100 text-green-700",
};

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeType, setActiveType] = useState<string>("all");

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(() => {
      setLoading(true);
      // In real implementation, calls GET /api/search?q=...
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((data) => setResults(data.results ?? []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const filtered = activeType === "all" ? results : results.filter((r) => r.type === activeType);
  const counts = {
    all: results.length,
    asset: results.filter((r) => r.type === "asset").length,
    user: results.filter((r) => r.type === "user").length,
    document: results.filter((r) => r.type === "document").length,
  };

  const highlightMatch = (text: string, q: string) => {
    if (!q) return text;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return text.split(regex).map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-yellow-200">{part}</mark> : part
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Search</h1>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search assets, users, documents..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="w-full pl-11 pr-10 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["all", "asset", "user", "document"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeType === type ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}s
            <span className="ml-1 text-xs opacity-70">{counts[type]}</span>
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-400 text-sm">Searching...</p>}

      {!loading && query && filtered.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No results for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((result) => {
          const Icon = TYPE_ICONS[result.type] ?? Package;
          return (
            <button
              key={result.id}
              onClick={() => router.push(result.href)}
              className="w-full flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-shadow text-left"
            >
              <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{highlightMatch(result.title, query)}</p>
                <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[result.type]}`}>
                {result.type}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
