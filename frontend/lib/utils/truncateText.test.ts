import { truncateText } from "../utils/truncateText";

describe("truncateText", () => {
  it("should return full text if within limit", () => {
    expect(truncateText("Hi", 5)).toBe("Hi");
    expect(truncateText("Hello", 5)).toBe("Hello");
  });

  it("should truncate text and add ellipsis if longer than limit", () => {
    expect(truncateText("Hello World", 5)).toBe("Hello...");
    expect(truncateText("Blockchain", 4)).toBe("Bloc...");
  });

  it("should handle empty strings", () => {
    expect(truncateText("", 5)).toBe("");
  });

  it("should handle maxLength = 0", () => {
    expect(truncateText("Hello", 0)).toBe("...");
  });
});
