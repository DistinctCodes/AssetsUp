import { renderHook, act } from "@testing-library/react";
import { useUrlState } from "./useUrlState";

const replace = jest.fn();
let query = "";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/assets",
  useSearchParams: () => new URLSearchParams(query),
}));

const defaults = { q: "", status: "", page: "1", sortBy: "createdAt" };

describe("useUrlState", () => {
  beforeEach(() => {
    replace.mockClear();
    query = "";
  });

  it("returns defaults when the URL has no params", () => {
    const { result } = renderHook(() => useUrlState(defaults));
    expect(result.current[0]).toEqual(defaults);
  });

  it("reads values from the URL", () => {
    query = "q=laptop&page=3";
    const { result } = renderHook(() => useUrlState(defaults));
    expect(result.current[0]).toMatchObject({ q: "laptop", page: "3", status: "" });
  });

  it("writes a patch with router.replace and omits defaults", () => {
    const { result } = renderHook(() => useUrlState(defaults));
    act(() => result.current[1]({ status: "ACTIVE" }));
    expect(replace).toHaveBeenCalledWith("/assets?status=ACTIVE", { scroll: false });
  });

  it("resets page to 1 when a filter changes", () => {
    query = "page=4";
    const { result } = renderHook(() => useUrlState(defaults));
    act(() => result.current[1]({ q: "desk" }));
    expect(replace).toHaveBeenCalledWith("/assets?q=desk", { scroll: false });
  });

  it("keeps the page when only the page changes", () => {
    const { result } = renderHook(() => useUrlState(defaults));
    act(() => result.current[1]({ page: "2" }));
    expect(replace).toHaveBeenCalledWith("/assets?page=2", { scroll: false });
  });

  it("navigates to the bare path when everything is default", () => {
    query = "q=x";
    const { result } = renderHook(() => useUrlState(defaults));
    act(() => result.current[1]({ q: "" }));
    expect(replace).toHaveBeenCalledWith("/assets", { scroll: false });
  });
});
