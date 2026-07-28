import React from "react";
import { render, screen } from "@testing-library/react";
import { AuthFlowComponent } from "./AuthFlowComponent";
describe("AuthFlowComponent", () => {
  it("renders correctly", () => {
    render(<AuthFlowComponent />);
    expect(screen.getByText("Please log in")).toBeDefined();
  });
});
