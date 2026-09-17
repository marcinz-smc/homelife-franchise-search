import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { defaultFilters } from "../../types";
import { FilterRail } from "./FilterRail";

const facets = {
  provinces: ["Ontario", "Alberta"],
  cities: ["Toronto", "Calgary"],
  groups: ["HomeLife Landmark"],
  regions: ["York", "Peel"],
};

test("updates province and coverage filters", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<FilterRail filters={defaultFilters} facets={facets} onChange={onChange} />);

  await user.selectOptions(screen.getByLabelText(/province/i), "Ontario");
  expect(onChange).toHaveBeenCalledWith({ ...defaultFilters, province: "Ontario" });

  await user.click(screen.getByRole("button", { name: "Open ground" }));
  expect(onChange).toHaveBeenCalledWith({ ...defaultFilters, coverage: "uncovered" });

  await user.click(screen.getByRole("button", { name: "Heat" }));
  expect(onChange).toHaveBeenCalledWith({ ...defaultFilters, view: "heatmap" });
});

test("searches brokerages by name or address", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<FilterRail filters={defaultFilters} facets={facets} onChange={onChange} />);
  await user.type(screen.getByPlaceholderText(/name, street, registration/i), "B");
  expect(onChange).toHaveBeenCalledWith({ ...defaultFilters, q: "B" });
});

test("hides search results until the user is searching", () => {
  render(
    <FilterRail
      filters={defaultFilters}
      facets={facets}
      onChange={vi.fn()}
      results={[
        {
          id: "abc",
          source: "office",
          name: "HomeLife 247 Realty Inc., Brokerage*",
          city: "Mississauga",
          province: "Ontario",
        },
      ]}
    />,
  );

  expect(screen.queryByRole("button", { name: /homelife 247/i })).not.toBeInTheDocument();
});

test("opens a brokerage from search results", async () => {
  const user = userEvent.setup();
  const onSelectHit = vi.fn();
  render(
    <FilterRail
      filters={{ ...defaultFilters, q: "home" }}
      facets={facets}
      onChange={vi.fn()}
      onSelectHit={onSelectHit}
      results={[
        {
          id: "abc",
          source: "office",
          name: "HomeLife 247 Realty Inc., Brokerage*",
          city: "Mississauga",
          province: "Ontario",
        },
      ]}
    />,
  );

  await user.click(screen.getByRole("button", { name: /homelife 247/i }));
  expect(onSelectHit).toHaveBeenCalledWith({
    id: "abc",
    source: "office",
    name: "HomeLife 247 Realty Inc., Brokerage*",
    city: "Mississauga",
    province: "Ontario",
  });
});

test("hides region, city, and brokerage group filters", () => {
  render(<FilterRail filters={defaultFilters} facets={facets} onChange={vi.fn()} />);

  expect(screen.queryByLabelText(/ontario region/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/^city$/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/brokerage group/i)).not.toBeInTheDocument();
  expect(screen.getByLabelText(/province/i)).toBeInTheDocument();
});

test("toggles brand and municipality visibility", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<FilterRail filters={defaultFilters} facets={facets} onChange={onChange} />);

  await user.click(screen.getByRole("button", { name: "HomeLife" }));
  expect(onChange).toHaveBeenCalledWith({ ...defaultFilters, brand: "homelife" });

  await user.click(screen.getByLabelText(/show ontario municipalities/i));
  expect(onChange).toHaveBeenCalledWith({ ...defaultFilters, showCities: true });

  await user.click(screen.getByLabelText(/only brokerages outside 5km/i));
  expect(onChange).toHaveBeenCalledWith({ ...defaultFilters, outsideZones: true });

  await user.click(screen.getByLabelText(/only advanced data plots/i));
  expect(onChange).toHaveBeenCalledWith({ ...defaultFilters, scoredOnly: true });
});
