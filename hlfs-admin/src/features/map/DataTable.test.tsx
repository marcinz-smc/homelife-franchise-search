import type { FeatureCollection } from "geojson";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Office, RecoBrokerage } from "../../types";
import { DataTable, groupRowsByCity, rowPlotColor, rowsFromPoints } from "./DataTable";
import { SCORE_COLORS } from "./leadScore";

const points: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-79.4, 43.7] },
      properties: {
        id: "reco-1",
        source: "reco",
        brand: "other",
        name: "Royal LePage Sample",
        city: "Toronto",
        province: "Ontario",
        scoreBand: "medium",
        hasLead: 1,
        email: "royal@example.com",
        phone: "416-555-0200",
        broker: "John Broker",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-79.7, 43.6] },
      properties: {
        id: "office-1",
        source: "office",
        brand: "homelife",
        name: "HomeLife 247",
        city: "Mississauga",
        province: "Ontario",
        email: "office@homelife247realty.com",
        phone: "905.858.1999",
        broker: "Jane Broker",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-79.38, 43.65] },
      properties: {
        id: "reco-2",
        source: "reco",
        brand: "other",
        name: "Apex Realty",
        city: "Toronto",
        province: "Ontario",
        email: "apex@example.com",
        phone: "416-555-0100",
        broker: "Apex Broker",
      },
    },
  ],
};

const office: Office = {
  id: "office-1",
  externalId: "84719",
  slug: "homelife-247",
  name: "HomeLife 247",
  brokerageGroup: "HomeLife 247 Realty Inc.",
  groupKey: "homelife 247",
  broker: "Jane Broker",
  street: "2000 Argentia Rd",
  city: "Mississauga",
  province: "Ontario",
  postal: "L5N 1V9",
  address: "2000 Argentia Rd, Mississauga, Ontario, L5N 1V9",
  phone: "905.858.1999",
  fax: "",
  email: "office@homelife247realty.com",
  language: "English",
  website: "",
  socials: [],
  specialization: "Residential",
  mlsId: "372300",
  tollFree: "",
  primaryContactName: "Jane Broker",
  aboutParagraphs: [],
  listedOnCorporateWebsite: true,
  country: "Canada",
  photo: null,
  isPlaceholderLogo: false,
  lat: 43.6,
  lng: -79.7,
  matchStatus: "matched",
  matchNote: "",
  municipalityId: "abc",
};

const reco: RecoBrokerage = {
  id: "reco-1",
  legalName: "Royal LePage Sample",
  registrationCategory: "Brokerage",
  registrationNumber: "R200",
  registrationStatus: "REGISTERED",
  registrationExpiry: "2027/02/01",
  brokerOfRecord: "John Broker",
  address: "200 Queen St Toronto, ON",
  email: "royal@example.com",
  phone: "416-555-0200",
  conditions: "None",
  corporationUrl: "",
  employeeListUrl: "",
  searchCity: "Toronto",
  scrapedAt: "",
  isHomeLife: false,
  lat: 43.7,
  lng: -79.4,
};

test("sorts desks by city then name", () => {
  const rows = rowsFromPoints(points);
  expect(rows.map((row) => `${row.city}:${row.name}`)).toEqual([
    "Mississauga:HomeLife 247",
    "Toronto:Apex Realty",
    "Toronto:Royal LePage Sample",
  ]);
  expect(groupRowsByCity(rows).map((group) => group.city)).toEqual(["Mississauga", "Toronto"]);
});

test("shows contact fields and kilometres to HomeLife on each row", () => {
  const centers: FeatureCollection = {
    type: "FeatureCollection",
    features: [points.features[1]],
  };
  render(
    <DataTable
      points={points}
      zoneCenters={centers}
      selectedOffice={null}
      selectedReco={null}
      onSelect={async () => undefined}
      onClear={() => undefined}
    />,
  );

  expect(screen.getByText("Jane Broker")).toBeInTheDocument();
  expect(screen.getByText("905.858.1999")).toBeInTheDocument();
  expect(screen.getByText("office@homelife247realty.com")).toBeInTheDocument();
  expect(screen.getByText("John Broker")).toBeInTheDocument();
  expect(screen.getByText("royal@example.com")).toBeInTheDocument();
  expect(screen.getAllByText("HomeLife").length).toBeGreaterThan(0);
  expect(screen.getAllByText("RECO").length).toBeGreaterThan(0);
  expect(screen.getByText("0 km")).toBeInTheDocument();
});

test("color-codes HomeLife and scored desks with the map palette", () => {
  const rows = rowsFromPoints(points);
  expect(rowPlotColor(rows.find((row) => row.id === "office-1")!)).toBe(SCORE_COLORS.homelife);
  expect(rowPlotColor(rows.find((row) => row.id === "reco-1")!)).toBe(SCORE_COLORS.medium);
  expect(rowPlotColor(rows.find((row) => row.id === "reco-2")!)).toBeNull();

  render(
    <DataTable
      points={points}
      selectedOffice={null}
      selectedReco={null}
      onSelect={async () => undefined}
      onClear={() => undefined}
    />,
  );

  expect(screen.getByRole("button", { name: /homelife 247/i })).toHaveAttribute(
    "data-plot-color",
    SCORE_COLORS.homelife,
  );
  expect(screen.getByRole("button", { name: /royal lepage sample/i })).toHaveAttribute(
    "data-plot-color",
    SCORE_COLORS.medium,
  );
  expect(screen.getByRole("button", { name: /apex realty/i })).toHaveAttribute("data-plot-color", "none");
});

test("expands a HomeLife row with office fields", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn(async () => undefined);
  const { rerender } = render(
    <DataTable
      points={points}
      selectedOffice={null}
      selectedReco={null}
      onSelect={onSelect}
      onClear={() => undefined}
    />,
  );

  await user.click(screen.getByRole("button", { name: /homelife 247/i }));
  expect(onSelect).toHaveBeenCalledWith(
    expect.objectContaining({ id: "office-1", source: "office" }),
  );

  rerender(
    <DataTable
      points={points}
      selectedOffice={office}
      selectedReco={null}
      onSelect={onSelect}
      onClear={() => undefined}
    />,
  );

  expect(screen.getByText("372300")).toBeInTheDocument();
  expect(screen.getByText("Listed on HomeLife site")).toBeInTheDocument();
});

test("expands a RECO row with detail tabs", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn(async () => undefined);
  const { rerender } = render(
    <DataTable
      points={points}
      selectedOffice={null}
      selectedReco={null}
      onSelect={onSelect}
      onClear={() => undefined}
    />,
  );

  await user.click(screen.getByRole("button", { name: /royal lepage sample/i }));
  expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "reco-1", source: "reco" }));

  rerender(
    <DataTable
      points={points}
      selectedOffice={null}
      selectedReco={reco}
      onSelect={onSelect}
      onClear={() => undefined}
    />,
  );

  expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  await user.click(screen.getByRole("tab", { name: "Registry" }));
  expect(screen.getByTestId("registry-panel")).toHaveTextContent("R200");
});
