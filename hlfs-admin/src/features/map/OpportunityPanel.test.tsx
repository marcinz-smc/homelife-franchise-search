import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Municipality } from "../../types";
import { OpportunityPanel } from "./OpportunityPanel";

function city(partial: Partial<Municipality> & Pick<Municipality, "id" | "name">): Municipality {
  return {
    municipalStatus: "Lower Tier",
    region: "Test",
    officeCount: 0,
    otherCount: 0,
    covered: false,
    geocodeStatus: "ok",
    geocodePlaceName: "",
    lng: -79,
    lat: 43,
    ...partial,
  };
}

test("ranks cities with the most other desks and fewest HomeLife offices first", () => {
  render(
    <OpportunityPanel
      open
      onToggle={vi.fn()}
      onFocus={vi.fn()}
      municipalities={[
        city({ id: "held", name: "Held", otherCount: 12, officeCount: 8, covered: true }),
        city({ id: "open", name: "Open field", otherCount: 40, officeCount: 0 }),
        city({ id: "crowded", name: "Crowded", otherCount: 40, officeCount: 1, covered: true }),
      ]}
    />,
  );

  const buttons = screen.getAllByRole("button", { name: /other/i });
  expect(buttons.map((button) => button.textContent)).toEqual([
    expect.stringContaining("Open field"),
    expect.stringContaining("Crowded"),
    expect.stringContaining("Held"),
  ]);
});

test("does not list offices already planted outside Ontario", () => {
  render(
    <OpportunityPanel
      open
      onToggle={vi.fn()}
      onFocus={vi.fn()}
      municipalities={[city({ id: "ajax", name: "Ajax", otherCount: 2 })]}
    />,
  );

  expect(screen.queryByText(/already planted outside ontario/i)).not.toBeInTheDocument();
});

test("slides the ledger closed from the arrow", async () => {
  const user = userEvent.setup();
  const onToggle = vi.fn();
  render(
    <OpportunityPanel
      open
      onToggle={onToggle}
      onFocus={vi.fn()}
      municipalities={[city({ id: "ajax", name: "Ajax", otherCount: 2 })]}
    />,
  );

  await user.click(screen.getByRole("button", { name: /close where to keep looking/i }));
  expect(onToggle).toHaveBeenCalled();
});
