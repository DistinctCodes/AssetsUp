"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Keeps a flat set of string params (filters, sort, page) in the URL query
 * string, so a view survives a reload, Back/forward, and can be shared.
 *
 * The URL is the single source of truth: values are derived from
 * `useSearchParams()` on every render, so history navigation updates them with
 * no extra state. Params equal to their default are omitted from the URL.
 *
 * `set(patch)` merges `patch` and writes with `router.replace`. When any key of
 * `patch` is not `page` (and not in `keepPageOn`), `page` is reset to its
 * default so a changed filter never lands on a page that no longer exists.
 */
export function useUrlState<T extends Record<string, string>>(
  defaults: T,
  options: { keepPageOn?: (keyof T)[] } = {},
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const keepPageOn = options.keepPageOn;

  const values = useMemo(() => {
    const out = { ...defaults } as Record<string, string>;
    for (const key of Object.keys(defaults)) {
      const v = searchParams.get(key);
      if (v !== null && v !== "") out[key] = v;
    }
    return out as T;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const set = useCallback(
    (patch: Partial<T>) => {
      const next = { ...values, ...patch } as Record<string, string>;
      const resetsPage =
        "page" in defaults &&
        !("page" in patch) &&
        Object.keys(patch).some((k) => !(keepPageOn ?? []).includes(k));
      if (resetsPage) next.page = defaults.page;

      const params = new URLSearchParams();
      for (const key of Object.keys(defaults)) {
        if (next[key] !== undefined && next[key] !== defaults[key]) {
          params.set(key, next[key]);
        }
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values, pathname, router],
  );

  return [values, set] as const;
}
