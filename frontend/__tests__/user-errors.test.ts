import { getUserActionErrorMessage } from "@/lib/api/users";

const withStatus = (status: number, message?: string) => ({
  response: { status, data: message ? { message } : {} },
});

describe("getUserActionErrorMessage", () => {
  it("explains a duplicate invite (409)", () => {
    expect(getUserActionErrorMessage(withStatus(409), "invite")).toMatch(
      /already been invited/i,
    );
  });

  it("explains a forbidden action (403)", () => {
    expect(getUserActionErrorMessage(withStatus(403))).toMatch(/administrators/i);
  });

  it("prefers the server message for 403 and 400", () => {
    expect(
      getUserActionErrorMessage(withStatus(403, "Cannot change your own role")),
    ).toBe("Cannot change your own role");
    expect(getUserActionErrorMessage(withStatus(400, "email must be an email"))).toBe(
      "email must be an email",
    );
  });

  it("explains not found (404)", () => {
    expect(getUserActionErrorMessage(withStatus(404))).toMatch(/not found/i);
  });

  it("explains server errors (5xx)", () => {
    expect(getUserActionErrorMessage(withStatus(500))).toMatch(/server/i);
  });

  it("falls back to a generic message", () => {
    expect(getUserActionErrorMessage(new Error("boom"))).toMatch(/something went wrong/i);
  });
});
