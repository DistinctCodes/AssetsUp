import { normalizeAssetId } from "./normalizeAssetId";

describe("normalizeAssetId utility", () => {
  it("should handle numeric string IDs", () => {
    expect(normalizeAssetId("123")).toBe("123");
  });

  it("should strip 'asset-' prefix", () => {
    expect(normalizeAssetId("asset-456")).toBe("456");
  });

  it("should convert numeric input to string", () => {
    expect(normalizeAssetId(789)).toBe("789");
  });

  it("should strip custom prefixes like 'id-'", () => {
    expect(normalizeAssetId("id-999")).toBe("999");
  });

  it("should trim spaces and normalize properly", () => {
    expect(normalizeAssetId("  asset-321  ")).toBe("321");
  });

  it("should throw error for null or undefined", () => {
    expect(() => normalizeAssetId(null as any)).toThrow();
    expect(() => normalizeAssetId(undefined as any)).toThrow();
  });

  it("should keep UUIDs intact", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(normalizeAssetId(uuid)).toBe(uuid);
  });
});
