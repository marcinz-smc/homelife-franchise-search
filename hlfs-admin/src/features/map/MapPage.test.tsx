import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { FeatureCollection } from "geojson";
import { MapPage } from "./MapPage";

const points: FeatureCollection = {
  type: "FeatureCollection",
  features: [
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
      },
    },
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
        hasLead: 1,
        scoreBand: "medium",
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
      },
    },
  ],
};

vi.mock("./MapCanvas", () => ({
  MapCanvas: () => <div data-testid="map-canvas" />,
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "1", email: "admin@homelife.local", role: "admin" },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual<typeof import("../../api/client")>("../../api/client");
  return {
    ...actual,
    api: {
      filters: vi.fn(async () => ({ provinces: ["Ontario"], cities: [], groups: [], regions: [] })),
      mapPoints: vi.fn(async (params?: URLSearchParams) => {
        const brand = params?.get("brand");
        const features =
          brand === "homelife"
            ? points.features.filter((feature) => feature.properties?.brand === "homelife")
            : points.features;
        return { type: "FeatureCollection" as const, features };
      }),
      municipalities: vi.fn(async () => ({ items: [] })),
      municipalityGeojson: vi.fn(async () => ({ type: "FeatureCollection", features: [] })),
      searchBrokerages: vi.fn(async () => ({ results: [] })),
      reco: vi.fn(),
      office: vi.fn(),
    },
  };
});

test("switches between map and data without dropping the list", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <MapPage />
    </MemoryRouter>,
  );

  expect(screen.getByTestId("map-canvas")).toBeInTheDocument();
  expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Data" }));
  expect(await screen.findByRole("button", { name: /homelife 247/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /royal lepage sample/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /apex realty/i })).toBeInTheDocument();

  await user.click(screen.getByLabelText(/only advanced data plots/i));
  expect(await screen.findByRole("button", { name: /royal lepage sample/i })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /homelife 247/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /apex realty/i })).not.toBeInTheDocument();

  await user.click(screen.getByLabelText(/only advanced data plots/i));
  await user.click(screen.getByRole("button", { name: "HomeLife" }));
  expect(await screen.findByRole("button", { name: /homelife 247/i })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /royal lepage sample/i })).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Map" }));
  expect(screen.getByTestId("map-canvas")).toBeInTheDocument();
});
