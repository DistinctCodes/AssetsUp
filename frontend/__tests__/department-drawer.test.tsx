import { render, screen, fireEvent } from "@testing-library/react";
import { DepartmentDrawer } from "@/components/departments/department-drawer";
import {
  useDepartmentAssets,
  useDepartmentUsers,
} from "@/lib/query/hooks/useDepartments";

jest.mock("@/lib/query/hooks/useDepartments", () => ({
  useDepartmentUsers: jest.fn(),
  useDepartmentAssets: jest.fn(),
}));
jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));
jest.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const department = {
  id: "dept-1",
  name: "Engineering",
  memberCount: 0,
  assetCount: 0,
  createdAt: "2024-01-01",
};

const ok = (items: unknown[], total = items.length) => ({
  data: { items, total, page: 1, limit: 10, totalPages: Math.max(1, Math.ceil(total / 10)) },
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
});

describe("DepartmentDrawer", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows distinct empty states", () => {
    (useDepartmentUsers as jest.Mock).mockReturnValue(ok([]));
    (useDepartmentAssets as jest.Mock).mockReturnValue(ok([]));
    render(<DepartmentDrawer isOpen onClose={() => {}} department={department} />);
    expect(screen.getByText("No members in this department")).toBeInTheDocument();
    expect(screen.getByText("No assets in this department")).toBeInTheDocument();
  });

  it("renders rows that link to the asset page", () => {
    (useDepartmentUsers as jest.Mock).mockReturnValue(
      ok([{ id: "u1", firstName: "Ada", lastName: "Lovelace", email: "ada@x.io", role: "ADMIN" }]),
    );
    (useDepartmentAssets as jest.Mock).mockReturnValue(
      ok([{ id: "a1", name: "Laptop", assetTag: "AST-1", status: "ACTIVE" }]),
    );
    render(<DepartmentDrawer isOpen onClose={() => {}} department={department} />);
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Laptop").closest("a")).toHaveAttribute("href", "/assets/a1");
    expect(screen.getByText("Members (1)")).toBeInTheDocument();
  });

  it("shows an error state with a retry button", () => {
    const refetch = jest.fn();
    (useDepartmentUsers as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });
    (useDepartmentAssets as jest.Mock).mockReturnValue(ok([]));
    render(<DepartmentDrawer isOpen onClose={() => {}} department={department} />);
    expect(screen.getByText("Could not load members.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();
  });
});
