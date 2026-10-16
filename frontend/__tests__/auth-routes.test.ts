/** @jest-environment node */
import {
  AUTH_COOKIE,
  decideAuth,
  isAuthPage,
  isPublicPath,
} from "@/lib/auth-routes";

describe("auth route decisions", () => {
  it("uses the cookie name the auth store writes", () => {
    expect(AUTH_COOKIE).toBe("accessToken");
  });

  it.each([
    "/dashboard",
    "/assets",
    "/assets/123",
    "/audits",
    "/transfers",
    "/settings/custom-fields",
    "/vendors",
    "/my-assets",
  ])("redirects signed-out access to %s to /login with redirect", (path) => {
    expect(decideAuth(path, false)).toEqual({
      action: "redirect",
      to: "/login",
      redirectParam: path,
    });
  });

  it.each(["/dashboard", "/assets/123", "/settings"])(
    "lets a signed-in user through to %s",
    (path) => {
      expect(decideAuth(path, true)).toEqual({ action: "next" });
    },
  );

  it.each(["/login", "/register", "/forgot-password"])(
    "sends a signed-in user on %s to /dashboard",
    (path) => {
      expect(decideAuth(path, true)).toEqual({
        action: "redirect",
        to: "/dashboard",
      });
    },
  );

  it.each(["/login", "/register", "/forgot-password", "/scan/abc", "/"])(
    "leaves public path %s alone when signed out",
    (path) => {
      expect(decideAuth(path, false)).toEqual({ action: "next" });
    },
  );

  it("does not treat look-alike prefixes as public or auth pages", () => {
    expect(isPublicPath("/scanner")).toBe(false);
    expect(isAuthPage("/login-help")).toBe(false);
    expect(decideAuth("/scanner", false).action).toBe("redirect");
  });

  it("no longer references the non-existent /signin and /signup", () => {
    expect(isAuthPage("/signin")).toBe(false);
    expect(isAuthPage("/signup")).toBe(false);
  });
});
