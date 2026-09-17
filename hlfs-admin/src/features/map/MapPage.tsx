import type { FeatureCollection } from "geojson";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, officeQuery } from "../../api/client";
import {
  defaultFilters,
  type FilterFacets,
  type MapFilters,
  type Municipality,
  type Office,
  type RecoBrokerage,
  type SearchHit,
} from "../../types";
import { useAuth } from "../auth/AuthContext";
import { DataTable } from "./DataTable";
import { FilterRail } from "./FilterRail";
import { visibleBrokeragePoints } from "./geo";
import { MapCanvas } from "./MapCanvas";
import { OfficeDrawer } from "./OfficeDrawer";
import { OpportunityPanel } from "./OpportunityPanel";
import { RecoDrawer } from "./RecoDrawer";
import type { SelectedMapPin } from "./SelectedPinCard";

const emptyFacets: FilterFacets = {
  provinces: [],
  cities: [],
  groups: [],
  regions: [],
};

const emptyGeojson: FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export function MapPage() {
  const { user, logout } = useAuth();
  const [filters, setFilters] = useState<MapFilters>(defaultFilters);
  const [facets, setFacets] = useState<FilterFacets>(emptyFacets);
  const [points, setPoints] = useState<FeatureCollection>(emptyGeojson);
  const [zoneCenters, setZoneCenters] = useState<FeatureCollection>(emptyGeojson);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [cityGeojson, setCityGeojson] = useState<FeatureCollection>(emptyGeojson);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [selectedReco, setSelectedReco] = useState<RecoBrokerage | null>(null);
  const [focus, setFocus] = useState<Municipality | null>(null);
  const [error, setError] = useState("");
  const [atlasView, setAtlasView] = useState<"map" | "data">("map");

  const query = useMemo(
    () =>
      officeQuery({
        province: filters.province,
        region: filters.region,
        city: filters.city,
        group: filters.group,
        q: filters.q,
        brand: filters.brand,
      }),
    [filters.brand, filters.city, filters.group, filters.province, filters.q, filters.region],
  );

  const zoneQuery = useMemo(
    () =>
      officeQuery({
        province: filters.province,
        region: "",
        city: "",
        group: "",
        q: "",
        brand: "homelife",
      }),
    [filters.province],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [facetData, pointData, zoneData, cityData, cityCollection] = await Promise.all([
          api.filters(query),
          api.mapPoints(query),
          api.mapPoints(zoneQuery),
          api.municipalities(new URLSearchParams()),
          api.municipalityGeojson(new URLSearchParams()),
        ]);
        if (cancelled) return;
        setFacets(facetData);
        setPoints(pointData);
        setZoneCenters(zoneData);
        setMunicipalities(cityData.items);
        setCityGeojson(cityCollection);
        setError("");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load the atlas");
        }
      }
    }
    const handle = window.setTimeout(load, filters.q ? 200 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query, zoneQuery, filters.q]);

  useEffect(() => {
    let cancelled = false;
    const term = filters.q.trim();
    if (!term) {
      setResults([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      try {
        const payload = await api.searchBrokerages(query);
        if (!cancelled) setResults(payload.results);
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query, filters.q]);

  const selectedPin = useMemo<SelectedMapPin | null>(() => {
    if (selectedOffice?.lng != null && selectedOffice.lat != null) {
      return {
        id: selectedOffice.id,
        brand: "homelife",
        name: selectedOffice.name,
        lng: selectedOffice.lng,
        lat: selectedOffice.lat,
      };
    }
    if (selectedReco?.lng != null && selectedReco.lat != null) {
      return {
        id: selectedReco.id,
        brand: "other",
        name: selectedReco.legalName,
        lng: selectedReco.lng,
        lat: selectedReco.lat,
        scoreBand: selectedReco.lead?.scoreBand,
        serviceNeed: selectedReco.lead?.serviceNeed,
        foundation: selectedReco.lead?.foundation,
        conversion: selectedReco.lead?.conversion,
      };
    }
    return null;
  }, [selectedOffice, selectedReco]);

  const relatedIds = useMemo(() => {
    if (!selectedReco?.locations?.length) return [];
    return selectedReco.locations
      .filter((item) => item.id !== selectedReco.id)
      .map((item) => item.id);
  }, [selectedReco]);

  const listPoints = useMemo(
    () =>
      visibleBrokeragePoints(points, zoneCenters, {
        outsideZones: filters.outsideZones,
        coverage: filters.coverage,
        scoredOnly: filters.scoredOnly,
      }),
    [filters.coverage, filters.outsideZones, filters.scoredOnly, points, zoneCenters],
  );

  async function selectHit(hit: SearchHit) {
    try {
      if (hit.source === "reco") {
        const payload = await api.reco(hit.id);
        setSelectedOffice(null);
        setSelectedReco(payload.brokerage);
        return;
      }
      const payload = await api.office(hit.id);
      setSelectedReco(null);
      setSelectedOffice(payload.office);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open that brokerage");
    }
  }

  function openRecoLocation(id: string) {
    void selectHit({ id, source: "reco", name: "", city: "", province: "" });
  }

  return (
    <div className="flex h-screen flex-col bg-ink-950 text-parchment-200">
      <header className="flex items-center justify-between border-b border-white/10 bg-ink-900 px-5 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-copper-400">
            HomeLife · Coverage Atlas
          </p>
          <h1 className="font-display text-2xl italic text-parchment-100">The ground we hold</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-fog-300">
          <nav className="flex border border-white/10" aria-label="Atlas views">
            <button
              type="button"
              aria-pressed={atlasView === "map"}
              onClick={() => setAtlasView("map")}
              className={`px-3 py-1.5 text-xs uppercase tracking-[0.16em] ${
                atlasView === "map"
                  ? "bg-copper-500 text-ink-950"
                  : "text-fog-300 hover:text-parchment-100"
              }`}
            >
              Map
            </button>
            <button
              type="button"
              aria-pressed={atlasView === "data"}
              onClick={() => setAtlasView("data")}
              className={`px-3 py-1.5 text-xs uppercase tracking-[0.16em] ${
                atlasView === "data"
                  ? "bg-copper-500 text-ink-950"
                  : "text-fog-300 hover:text-parchment-100"
              }`}
            >
              Data
            </button>
          </nav>
          <span className="hidden sm:inline">{user?.email}</span>
          <Link to="/admin" className="border border-copper-500/40 px-3 py-1.5 text-copper-400">
            Import desk
          </Link>
          <button type="button" onClick={() => logout()} className="text-fog-400 hover:text-parchment-100">
            Sign out
          </button>
        </div>
      </header>

      {error ? (
        <p className="border-b border-gap-500/30 bg-gap-600/20 px-5 py-2 text-sm text-gap-400">
          {error}
        </p>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <FilterRail
          filters={filters}
          facets={facets}
          results={results}
          onChange={setFilters}
          onSelectHit={selectHit}
        />
        <div className="relative min-h-[420px] overflow-hidden">
          <div
            className={`absolute inset-0 ${atlasView === "map" ? "" : "invisible pointer-events-none"}`}
            aria-hidden={atlasView !== "map"}
          >
            <MapCanvas
              token={import.meta.env.VITE_MAPBOX_TOKEN ?? ""}
              points={points}
              zoneCenters={zoneCenters}
              municipalities={cityGeojson}
              filters={filters}
              focus={focus}
              selectedPin={selectedPin}
              relatedIds={relatedIds}
              onSelectHit={selectHit}
            />
            {atlasView === "map" ? (
              <>
                <OfficeDrawer office={selectedOffice} onClose={() => setSelectedOffice(null)} />
                <RecoDrawer
                  brokerage={selectedReco}
                  onClose={() => setSelectedReco(null)}
                  onSelectLocation={openRecoLocation}
                />
                <OpportunityPanel
                  municipalities={municipalities}
                  open={ledgerOpen}
                  onToggle={() => setLedgerOpen((value) => !value)}
                  onFocus={setFocus}
                />
              </>
            ) : null}
          </div>
          {atlasView === "data" ? (
            <div className="absolute inset-0">
              <DataTable
                points={listPoints}
                zoneCenters={zoneCenters}
                selectedOffice={selectedOffice}
                selectedReco={selectedReco}
                onSelect={selectHit}
                onClear={() => {
                  setSelectedOffice(null);
                  setSelectedReco(null);
                }}
                onSelectLocation={openRecoLocation}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
