import React from "react";
import { render, screen } from "@testing-library/react";
import { AssetHistoryComponent } from "./AssetHistoryComponent";
describe("AssetHistoryComponent", () => {
  it("renders correctly", () => {
    render(<AssetHistoryComponent />);
    expect(screen.getByText("Asset History")).toBeDefined();
  });
});
