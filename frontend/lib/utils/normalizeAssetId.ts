/**
 * Utility to normalize asset IDs into a consistent string format.
 * Supports numeric, UUID, and prefixed IDs (e.g., "asset-123").
 *
 * @param id - The input ID (string or number)
 * @returns A standardized string ID
 *
 * Examples:
 * normalizeAssetId("123") → "123"
 * normalizeAssetId("asset-456") → "456"
 * normalizeAssetId(789) → "789"
 */

export function normalizeAssetId(id: string | number): string {
  if (id === null || id === undefined) {
    throw new Error("Invalid ID: value cannot be null or undefined");
  }

  // Convert to string
  let idStr = String(id).trim();

  // Remove any "asset-" or similar prefixes (case insensitive)
  idStr = idStr.replace(/^(asset-|id-|a-)/i, "");

  // Optionally handle UUIDs or mixed IDs (leave them untouched)
  // Only clean simple prefixed or numeric IDs
  return idStr;
}
