import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AssetsPage from "@/app/(dashboard)/assets/page";

const replace = jest.fn();
const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
  usePathname: () => "/assets",
  useSearchParams: () => new URLSearchParams(""),
}));

let assetsState: { data?: { data: unknown[]; total: number }; isLoading: boolean } = {
  isLoading: false,
  data: { data: [], total: 0 },
};

jest.mock("@/lib/query/hooks/useAssets", () => ({
  useAssets: () => ({ ...assetsState, refetch: jest.fn() }),
}));
jest.mock("@/lib/query/hooks/useLocations", () => ({
  useLocations: () => ({ data: [] }),
}));
jest.mock("@/components/assets/create-asset-modal", () => ({
  CreateAssetModal: ({ open }: { open?: boolean }) =>
    open ? <div>create-asset-modal</div> : null,
}));

describe("AssetsPage", () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    assetsState = { isLoading: false, data: { data: [], total: 0 } };
  });

  it("shows the empty state when there are no assets", () => {
    render(<AssetsPage />);
    expect(screen.getByRole("heading", { name: "Assets" })).toBeInTheDocument();
    expect(screen.getByText(/No assets registered yet/)).toBeInTheDocument();
  });

  it("writes the status filter to the URL", () => {
    render(<AssetsPage />);
    fireEvent.change(screen.getByLabelText("Filter by status"), {
      target: { value: "AVAILABLE" },
    });
    expect(replace).toHaveBeenCalledWith("/assets?status=AVAILABLE", { scroll: false });
  });

  it("opens the bulk import page", () => {
    render(<AssetsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Bulk Import/ }));
    expect(push).toHaveBeenCalledWith("/assets/import");
  });
});
