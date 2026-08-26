import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import MaintenancePage from "@/app/(dashboard)/maintenance/page";

const updateStatus = jest.fn();

jest.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PointerSensor: class {},
  useDroppable: () => ({ setNodeRef: jest.fn(), isOver: false }),
  useDraggable: () => ({ attributes: {}, listeners: {}, setNodeRef: jest.fn(), transform: null, isDragging: false }),
  useSensor: jest.fn(),
  useSensors: jest.fn(),
}));

jest.mock("@/lib/query/hooks/useMaintenance", () => ({
  useMaintenanceRecords: () => ({
    data: [{ id: "mnt-1", assetId: "asset-1", type: "SCHEDULED", status: "SCHEDULED", title: "Quarterly service", scheduledDate: "2099-01-15", cost: 0, currency: "USD" }],
    isLoading: false,
  }),
  useCreateMaintenanceRecord: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateMaintenanceStatus: () => ({ mutate: updateStatus, isPending: false }),
}));

jest.mock("@/lib/query/hooks/useAssets", () => ({
  useAssets: () => ({ data: { data: [{ id: "asset-1", name: "Laptop" }] } }),
  useDepartmentsList: () => ({ data: [] }),
}));

describe("MaintenancePage", () => {
  it("renders maintenance records and switches to the calendar", () => {
    render(<MaintenancePage />);

    expect(screen.getByRole("heading", { name: "Maintenance" })).toBeInTheDocument();
    expect(screen.getByText("Quarterly service")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    expect(screen.getByText("Sun")).toBeInTheDocument();
  });

  it("opens scheduling from the page and exposes completion entry point", () => {
    render(<MaintenancePage />);
    fireEvent.click(screen.getByRole("button", { name: "New Maintenance" }));
    expect(screen.getByRole("heading", { name: "New Maintenance" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Schedule" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Quarterly service")).toBeInTheDocument();
  });
});