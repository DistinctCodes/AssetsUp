import React from "react";
import { render } from "@testing-library/react";
import { LoadingSkeletonsComponent } from "./LoadingSkeletonsComponent";
describe("LoadingSkeletonsComponent", () => {
  it("renders correctly", () => {
    const { container } = render(<LoadingSkeletonsComponent />);
    expect(container.firstChild).toBeDefined();
  });
});
