import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import LicensesPage from "@/app/(dashboard)/licenses/page";

const license = {
  id: "lic-1",
  name: "Design Suite",
  vendorId: "Acme",
  type: "SUBSCRIPTION",
  billingPeriod: "YEARLY",
  seatsTotal: 5,
  seatsUsed: 2,
  cost: 1200,
  currency: "USD",
  expiryDate: "2026-09-01T00:00:00.000Z",
  renewsSoon: true,
};

jest.mock("@/lib/query/hooks/useLicenses", () => ({
  useLicenses: () => ({ data: [license], isLoading: false }),
  useCreateLicense: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateLicense: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteLicense: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useRevealLicenseKey: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useLicenseAssignments: () => ({ data: [], isLoading: false }),
  useAssignSeat: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUnassignSeat: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/lib/query/hooks/useAssets", () => ({
  useUsers: () => ({ data: [{ id: "user-1", name: "Jane User" }] }),
}));

describe("LicensesPage", () => {
  it("renders licenses and highlights an upcoming renewal", () => {
    render(<LicensesPage />);

    expect(screen.getByText("Design Suite")).toBeInTheDocument();
    expect(screen.getAllByText(/renewal/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/9\/1\/2026|09\/01\/2026/)).toBeInTheDocument();
  });

  it("opens the seat assignment UI from a license row", () => {
    render(<LicensesPage />);
    fireEvent.click(screen.getByText("Design Suite"));

    expect(screen.getByText("Seat Assignments")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Jane User" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Assign" })).toBeInTheDocument();
  });
});