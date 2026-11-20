
"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Package, Users, FileText, X } from "lucide-react";

import {
  searchApiClient,
  type SearchResult,
} from "@/lib/api/search";

const SEARCH_TYPES = ["all", "asset", "user", "document"] as const;

type SearchType = (typeof SEARCH_TYPES)[number];

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

const SEARCH_DEBOUNCE_DELAY = 300;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${escapeRegex(query)})`, "gi");

  return text.split(regex).map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className="bg-yellow-200">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeType, setActiveType] = useState<SearchType>("all");

  // Keep the search input synchronized with the URL.
  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  // Search with debounce and prevent stale requests from updating results.
  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults([]);
      setLoading(false);
      return;
    }

    let isActive = true;

    const timer = setTimeout(() => {
      setLoading(true);

      searchApiClient
        .search(trimmedQuery)
        .then((data) => {
          if (isActive) {
            setResults(data);
          }
        })
        .catch(() => {
          if (isActive) {
            setResults([]);
          }
        })
        .finally(() => {
          if (isActive) {
            setLoading(false);
          }
        });
    }, SEARCH_DEBOUNCE_DELAY);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [query]);

  // Update the URL when the search query changes.
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (query.trim()) {
      params.set("q", query);
    } else {
      params.delete("q");
    }

    const queryString = params.toString();
    const currentQuery = searchParams.toString();

    if (queryString !== currentQuery) {
      router.replace(
        queryString ? `?${queryString}` : window.location.pathname,
        { scroll: false },
      );
    }
  }, [query, router, searchParams]);

  const counts = useMemo(
    () => ({
      all: results.length,
      asset: results.filter((result) => result.type === "asset").length,
      user: results.filter((result) => result.type === "user").length,
      document: results.filter((result) => result.type === "document").length,
    }),
    [results],
  );

  const filteredResults = useMemo(
    () =>
      activeType === "all"
        ? results
        : results.filter((result) => result.type === activeType),
    [activeType, results],
  );

  const handleClearSearch = () => {
    setQuery("");
    setResults([]);
  };

  const handleResultClick = (href: string) => {
    router.push(href);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Search</h1>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

        <input
          type="text"
          placeholder="Search assets, users, documents..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
          className="w-full pl-11 pr-10 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {query && (
          <button
            type="button"
            onClick={handleClearSearch}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Type Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {SEARCH_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveType(type)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeType === type
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {type === "all"
              ? "All"
              : `${type.charAt(0).toUpperCase() + type.slice(1)}s`}

            <span className="ml-1 text-xs opacity-70">
              {counts[type]}
            </span>
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <p className="text-gray-400 text-sm">Searching...</p>
      )}

      {/* Empty State */}
      {!loading && query.trim() && filteredResults.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            No results for &ldquo;{query}&rdquo;
          </p>
        </div>
      )}

      {/* Search Results */}
      <div className="space-y-2">
        {filteredResults.map((result) => {
          const Icon = TYPE_ICONS[result.type] ?? Package;

          return (
            <button
              key={result.id}
              type="button"
              onClick={() => handleResultClick(result.href)}
              className="w-full flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-shadow text-left"
            >
              <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {highlightMatch(result.title, query)}
                </p>

                <p className="text-xs text-gray-500 truncate">
                  {result.subtitle}
                </p>
              </div>

              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  TYPE_COLORS[result.type] ?? "bg-gray-100 text-gray-700"
                }`}
              >
                {result.type}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
