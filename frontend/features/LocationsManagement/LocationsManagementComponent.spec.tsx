import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocationsManagementComponent } from "./LocationsManagementComponent";
describe("LocationsManagementComponent", () => {
  it("renders correctly", () => {
    render(<LocationsManagementComponent />);
    expect(screen.getByText("Locations Management")).toBeDefined();
  });
});
