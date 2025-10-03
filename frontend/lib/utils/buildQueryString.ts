/**
 * Represents a valid query parameter value.
 *
 * - Can be a primitive (string, number, boolean)
 * - Can be null/undefined (ignored in output)
 * - Can be an array of query values
 * - Can be an object whose values are query values
 */
export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | QueryValue[]
  | { [key: string]: QueryValue };

/**
 * Builds a query string from a parameter object.
 *
 * Features:
 * - Supports nested objects (`filter[status]=active`)
 * - Supports arrays (`tags[]=vue&tags[]=react`)
 * - Ignores null and undefined values
 * - URL-encodes all keys and values
 *
 * @example
 * buildQueryString({ page: 2, limit: 10 })
 * // => "?page=2&limit=10"
 *
 * @example
 * buildQueryString({ filter: { status: "active", premium: true } })
 * // => "?filter[status]=active&filter[premium]=true"
 *
 * @example
 * buildQueryString({ tags: ["vue", "react"] })
 * // => "?tags[]=vue&tags[]=react"
 *
 * @param params - An object containing query parameters
 * @returns A query string starting with `?`, or an empty string if no params
 */
export function buildQueryString(params: Record<string, QueryValue>): string {
  if (!params || Object.keys(params).length === 0) return "";

  /**
   * Recursively encodes a key-value pair into query string fragments.
   *
   * @param key - The current query key (e.g. "filter" or "tags[]")
   * @param value - The value associated with the key
   * @returns An array of encoded key=value strings
   */
  const encode = (key: string, value: QueryValue): string[] => {
    if (value === null || value === undefined) return [];

    if (Array.isArray(value)) {
      return value.flatMap((item) => encode(`${key}[]`, item));
    }

    if (typeof value === "object") {
      return Object.entries(value).flatMap(([subKey, subValue]) =>
        encode(`${key}[${subKey}]`, subValue)
      );
    }

    // value is string | number | boolean
    return [`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`];
  };

  const query = Object.entries(params)
    .flatMap(([key, value]) => encode(key, value))
    .join("&");

  return query ? `?${query}` : "";
}
