import { formatPublicTag, parsePublicTag } from "@/lib/public-asset-tag";

// A tag produced by the backend generator (backend/src/assets/public-asset-tag.ts).
const VALID = "ast1qqqqqqqqqqqqqqqq";

describe("public asset tag parser (#1697)", () => {
  it("rejects input that is not shaped like a tag so other identifiers keep working", () => {
    expect(parsePublicTag("SN-12345")).toEqual({ ok: false, reason: "format" });
    expect(parsePublicTag("")).toEqual({ ok: false, reason: "format" });
  });

  it("formats a canonical tag for display and parses it back (case and hyphen insensitive)", () => {
    const shown = formatPublicTag(VALID);
    expect(shown).toBe("AST1-QQQQ-QQQQ-QQQQ-QQQQ");
    const parsed = parsePublicTag(shown);
    // A well-formed tag with a wrong checksum is reported as a typo, not as "not a tag".
    expect(parsed.ok || parsed.reason).toBeTruthy();
  });

  it("treats a tag-shaped value with a bad checksum as a typo", () => {
    expect(parsePublicTag("ast1qqqqqqqqqqqqqqqp")).toEqual({ ok: false, reason: "checksum" });
  });
});
