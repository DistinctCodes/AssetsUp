import { buildQueryString } from "./buildQueryString";

describe("buildQueryString", () => {
  it("returns query string for flat object", () => {
    expect(buildQueryString({ page: 2, limit: 10 }))
      .toBe("?page=2&limit=10");
  });

  it("returns empty string for empty object", () => {
    expect(buildQueryString({})).toBe("");
  });

  it("handles nested objects", () => {
    expect(buildQueryString({ filter: { status: "active", premium: true } }))
      .toBe("?filter%5Bstatus%5D=active&filter%5Bpremium%5D=true");
  });

  it("handles arrays", () => {
    expect(buildQueryString({ tags: ["vue", "react"] }))
      .toBe("?tags%5B%5D=vue&tags%5B%5D=react");
  });

  it("ignores null and undefined values", () => {
    expect(buildQueryString({ q: "search", skip: null, empty: undefined }))
      .toBe("?q=search");
  });

  it("encodes special characters safely", () => {
    expect(buildQueryString({ q: "hello world & test" }))
      .toBe("?q=hello%20world%20%26%20test");
  });
});
