import { render, screen } from "@testing-library/react";
import { SelectedPinCard } from "./SelectedPinCard";

test("shows three color-coded scores above the selected scored pin", () => {
  render(
    <SelectedPinCard
      pin={{
        id: "1",
        brand: "other",
        name: "Buckingham Realty",
        lng: -83,
        lat: 42.3,
        scoreBand: "medium",
        serviceNeed: 38,
        foundation: 90,
        conversion: 85,
      }}
    />,
  );

  expect(screen.getByTestId("selected-pin")).toBeInTheDocument();
  expect(screen.getByLabelText("Service need 38")).toHaveStyle({ color: "#e07a5f" });
  expect(screen.getByLabelText("Business foundation 90")).toHaveStyle({ color: "#4fd4a8" });
  expect(screen.getByLabelText("Conversion potential 85")).toHaveStyle({ color: "#4fd4a8" });
});

test("hides score chips when the desk has no lead data", () => {
  render(
    <SelectedPinCard
      pin={{
        id: "2",
        brand: "other",
        name: "Unscored desk",
        lng: -79,
        lat: 43.7,
      }}
    />,
  );

  expect(screen.queryByLabelText(/service need/i)).not.toBeInTheDocument();
  expect(screen.getByText("Unscored desk selected")).toBeInTheDocument();
});
