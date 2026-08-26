import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AssetDetailPage from "@/app/(dashboard)/assets/[id]/page";

const push = jest.fn();
const asset = {
  id: "asset-1", assetId: "AST-001", name: "MacBook Pro", status: "ACTIVE", condition: "GOOD",
  createdAt: "2026-01-01", updatedAt: "2026-01-02", imageUrls: [], tags: [],
};
let mockAsset: typeof asset | undefined = asset;

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "asset-1" }),
  useRouter: () => ({ push }),
}));

jest.mock("@/lib/query/hooks/useAsset", () => ({
  useAsset: () => ({ data: mockAsset, isLoading: false }),
  useAssetHistory: () => ({ data: [], isLoading: false }),
  useAssetDocuments: () => ({ data: [], isLoading: false }),
  useMaintenanceRecords: () => ({ data: [], isLoading: false }),
  useAssetNotes: () => ({ data: [], isLoading: false }),
  useDeleteAsset: () => ({ mutate: jest.fn(), isPending: false }),
  useUploadDocument: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteDocument: () => ({ mutate: jest.fn(), isPending: false }),
  useCreateMaintenanceRecord: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateMaintenanceStatus: () => ({ mutate: jest.fn(), isPending: false }),
  useCreateNote: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteNote: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/components/assets/status-badge", () => ({ StatusBadge: () => <span>Active</span> }));
jest.mock("@/components/assets/condition-badge", () => ({ ConditionBadge: () => <span>Good</span> }));
jest.mock("@/components/assets/inline-edit", () => ({ InlineEdit: ({ display }: { display: React.ReactNode }) => <>{display}</> }));
jest.mock("@/components/assets/photo-gallery", () => ({ PhotoGallery: () => <div>Photos</div> }));
jest.mock("@/components/assets/edit-asset-modal", () => ({ EditAssetModal: () => <div role="dialog">Edit Asset Form</div> }));

describe("AssetDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsset = asset;
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
  });

  it("loads the asset and switches across core tabs", () => {
    render(<AssetDetailPage />);
    expect(screen.getByRole("heading", { name: "MacBook Pro" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(screen.getByText("Change History")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Notes" }));
    expect(screen.getByRole("heading", { name: "Add Note" })).toBeInTheDocument();
  });

  it("exposes edit, transfer, and status-change actions", () => {
    render(<AssetDetailPage />);
    expect(screen.getByRole("button", { name: /transfer/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update status/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Edit Asset Form");
  });

  it("renders a not-found state for an invalid asset id", () => {
    mockAsset = undefined;
    render(<AssetDetailPage />);
    expect(screen.getByText("Asset not found.")).toBeInTheDocument();
  });
});