import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import LocationsPage from "@/app/(dashboard)/locations/page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const createLocation = jest.fn();

jest.mock("@/lib/query/hooks/useLocations", () => ({
  useLocations: () => ({
    data: [
      { id: "root", name: "HQ", code: "HQ", type: "BUILDING", totalAssetCount: 2 },
      { id: "child", name: "Floor 1", code: "HQ-1", type: "FLOOR", parentLocationId: "root", totalAssetCount: 1 },
    ],
    isLoading: false,
  }),
  useCreateLocation: () => ({ mutateAsync: createLocation, isPending: false }),
  useUpdateLocation: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteLocation: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

describe("LocationsPage", () => {
  it("renders the location tree and expands child locations", () => {
    render(<LocationsPage />);

    expect(screen.getByRole("heading", { name: "Locations" })).toBeInTheDocument();
    expect(screen.getAllByText("HQ").length).toBeGreaterThan(0);
    expect(screen.queryByText("Floor 1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(screen.getByText("Floor 1")).toBeInTheDocument();
  });

  it("opens create and edit entry points", () => {
    render(<LocationsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Add Root Location" }));
    expect(screen.getByRole("heading", { name: "New Location" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByTitle("Edit location"));
    expect(screen.getByRole("heading", { name: "Edit Location" })).toBeInTheDocument();
  });
});