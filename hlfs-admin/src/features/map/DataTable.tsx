import type { Feature, FeatureCollection } from "geojson";
import { useMemo, useState } from "react";
import type { Office, RecoBrokerage, SearchHit } from "../../types";
import { featureHasLead, formatKm, nearestHomeLifeKm } from "./geo";
import { SCORE_COLORS, pinColor } from "./leadScore";
import { OfficeDossier } from "./OfficeDossier";
import { RecoDetail } from "./RecoDetail";

const emptyCenters: FeatureCollection = { type: "FeatureCollection", features: [] };

export type DeskSort = "city" | "name" | "distance";

export type BrokerageRow = {
  id: string;
  source: "office" | "reco";
  name: string;
  city: string;
  province: string;
  brand: "homelife" | "other";
  email: string;
  phone: string;
  broker: string;
  kmNearest: number | null;
  hasLead: boolean;
  scoreBand: string;
};

export function rowsFromPoints(
  points: FeatureCollection,
  centers: FeatureCollection = emptyCenters,
): BrokerageRow[] {
  return points.features
    .map((feature) => rowFromFeature(feature, centers))
    .filter((row): row is BrokerageRow => row !== null);
}

export function sortDeskRows(rows: BrokerageRow[], sort: DeskSort): BrokerageRow[] {
  return rows.slice().sort((left, right) => {
    if (sort === "city") {
      const city = left.city.localeCompare(right.city, undefined, { sensitivity: "base" });
      if (city !== 0) return city;
    }
    if (sort === "distance") {
      const km = compareFarthestKm(left.kmNearest, right.kmNearest);
      if (km !== 0) return km;
    }
    const name = left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
    if (name !== 0) return name;
    return left.city.localeCompare(right.city, undefined, { sensitivity: "base" });
  });
}

function compareFarthestKm(left: number | null, right: number | null) {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return right - left;
}

function rowFromFeature(feature: Feature, centers: FeatureCollection): BrokerageRow | null {
  const id = String(feature.properties?.id ?? "");
  if (!id) return null;
  const source = feature.properties?.source === "reco" ? "reco" : "office";
  const brand = feature.properties?.brand === "homelife" ? "homelife" : "other";
  return {
    id,
    source,
    name: String(feature.properties?.name ?? ""),
    city: String(feature.properties?.city ?? "").trim(),
    province: String(feature.properties?.province ?? ""),
    brand,
    email: String(feature.properties?.email ?? "").trim(),
    phone: String(feature.properties?.phone ?? "").trim(),
    broker: String(feature.properties?.broker ?? "").trim(),
    kmNearest: nearestHomeLifeKm(feature, centers),
    hasLead: featureHasLead(feature),
    scoreBand: String(feature.properties?.scoreBand ?? ""),
  };
}

export function rowPlotColor(row: Pick<BrokerageRow, "brand" | "hasLead" | "scoreBand">): string | null {
  if (row.brand === "homelife") return SCORE_COLORS.homelife;
  if (row.scoreBand === "good" || row.scoreBand === "medium" || row.scoreBand === "low") {
    return pinColor(row.scoreBand);
  }
  if (row.hasLead) return SCORE_COLORS.default;
  return null;
}

function blank(value: string) {
  return value || "—";
}

const ROW_GRID =
  "grid-cols-1 gap-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(5.5rem,0.65fr)_minmax(0,0.9fr)_minmax(7.5rem,0.85fr)_minmax(0,1fr)_3.6rem_4.75rem] lg:items-center lg:gap-x-3";

export function DataTable({
  points,
  zoneCenters = emptyCenters,
  selectedOffice,
  selectedReco,
  onSelect,
  onClear,
  onSelectLocation,
}: {
  points: FeatureCollection;
  zoneCenters?: FeatureCollection;
  selectedOffice: Office | null;
  selectedReco: RecoBrokerage | null;
  onSelect: (hit: SearchHit) => Promise<void> | void;
  onClear: () => void;
  onSelectLocation?: (id: string) => void;
}) {
  const [sort, setSort] = useState<DeskSort>("city");
  const [pendingId, setPendingId] = useState("");
  const [copiedKey, setCopiedKey] = useState("");
  const expandedId = selectedOffice?.id ?? selectedReco?.id ?? "";
  const rows = useMemo(
    () => sortDeskRows(rowsFromPoints(points, zoneCenters), sort),
    [points, sort, zoneCenters],
  );

  async function toggle(row: BrokerageRow) {
    if (expandedId === row.id) {
      onClear();
      setPendingId("");
      return;
    }
    setPendingId(row.id);
    try {
      await onSelect({
        id: row.id,
        source: row.source,
        name: row.name,
        city: row.city,
        province: row.province,
      });
    } finally {
      setPendingId("");
    }
  }

  async function copyValue(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? "" : current));
      }, 1600);
    } catch {
      setCopiedKey("");
    }
  }

  return (
    <div className="atlas-scroll flex h-full min-h-0 flex-col overflow-y-auto bg-ink-950" data-testid="data-table">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-ink-900">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-copper-400">
              {rows.length === 1 ? "1 desk" : `${rows.length} desks`}
            </p>
            <div className="flex border border-white/10" role="group" aria-label="Sort desks">
              <SortButton active={sort === "city"} onClick={() => setSort("city")}>
                City
              </SortButton>
              <SortButton active={sort === "name"} onClick={() => setSort("name")}>
                Name
              </SortButton>
              <SortButton active={sort === "distance"} onClick={() => setSort("distance")}>
                Farthest HL
              </SortButton>
            </div>
          </div>
          <p className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-fog-500">
            <LegendSwatch color={SCORE_COLORS.homelife} shape="house" label="HomeLife" />
            <LegendSwatch color={SCORE_COLORS.low} shape="diamond" label="Low" />
            <LegendSwatch color={SCORE_COLORS.medium} shape="diamond" label="Medium" />
            <LegendSwatch color={SCORE_COLORS.good} shape="diamond" label="Good" />
          </p>
        </div>
        <div
          className={`hidden px-5 pb-2 text-[10px] font-mono uppercase tracking-[0.14em] text-fog-500 lg:grid ${ROW_GRID}`}
        >
          <span>Name</span>
          <span>City</span>
          <span>Broker of record</span>
          <span>Phone</span>
          <span>Email</span>
          <span>Brand</span>
          <span className="text-right">Closest HL</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-8 text-sm text-fog-400">No brokerages match the current filters.</p>
      ) : (
        <ul key={`${rows.length}:${sort}`}>
          {rows.map((row) => {
            const expanded = expandedId === row.id;
            const pending = pendingId === row.id;
            const plotColor = rowPlotColor(row);
            return (
              <li
                key={`${row.source}-${row.id}`}
                className="border-b border-white/5 [content-visibility:auto] [contain-intrinsic-size:auto_3.5rem]"
              >
                <div
                  data-plot-color={plotColor ?? "none"}
                  className={`grid w-full min-w-0 cursor-pointer px-5 py-3 ${ROW_GRID} ${
                    expanded ? "bg-copper-500/10" : ""
                  }`}
                  style={
                    plotColor
                      ? {
                          boxShadow: `inset 3px 0 0 ${plotColor}`,
                          backgroundColor: expanded
                            ? undefined
                            : `color-mix(in srgb, ${plotColor} 12%, transparent)`,
                        }
                      : undefined
                  }
                  onClick={() => {
                    void toggle(row);
                  }}
                >
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={(event) => {
                      event.stopPropagation();
                      void toggle(row);
                    }}
                    className="flex min-w-0 items-start gap-2 text-left hover:opacity-90"
                  >
                    <PlotMark color={plotColor} shape={row.brand === "homelife" ? "house" : "diamond"} />
                    <span className="min-w-0">
                      <span
                        className={`block truncate text-sm ${plotColor ? "" : "text-parchment-100"}`}
                        style={{ color: plotColor ?? undefined }}
                      >
                        {row.name}
                      </span>
                      <span className="block truncate text-xs text-fog-400 lg:hidden">
                        {[row.city, row.province].filter(Boolean).join(", ")}
                        {pending ? " · Opening…" : ""}
                      </span>
                      {pending && row.city ? (
                        <span className="hidden truncate text-xs text-fog-400 lg:block">Opening…</span>
                      ) : null}
                    </span>
                  </button>
                  <span className="hidden min-w-0 lg:block">
                    <span className="block truncate text-sm text-parchment-100">{blank(row.city)}</span>
                    <span className="block truncate text-xs text-fog-400">{row.province}</span>
                  </span>
                  <span className="truncate text-xs text-fog-300">{blank(row.broker)}</span>
                  <CopyCell
                    value={row.phone}
                    copied={copiedKey === `${row.id}:phone`}
                    label={`Copy phone ${row.phone}`}
                    onCopy={() => copyValue(`${row.id}:phone`, row.phone)}
                  />
                  <CopyCell
                    value={row.email}
                    copied={copiedKey === `${row.id}:email`}
                    label={`Copy email ${row.email}`}
                    onCopy={() => copyValue(`${row.id}:email`, row.email)}
                  />
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.12em] ${
                      plotColor ? "" : "text-fog-400"
                    }`}
                    style={{ color: plotColor ?? undefined }}
                  >
                    {row.brand === "homelife" ? "HomeLife" : "RECO"}
                  </span>
                  <span className="text-right font-mono text-[10px] uppercase tracking-[0.12em] text-copper-400">
                    {formatKm(row.kmNearest)}
                  </span>
                </div>
                {expanded ? (
                  <div className="border-t border-white/5 bg-ink-900/70 px-5 py-5">
                    {selectedReco?.id === row.id ? (
                      <RecoDetail
                        brokerage={selectedReco}
                        onSelectLocation={onSelectLocation}
                        idPrefix="table"
                      />
                    ) : null}
                    {selectedOffice?.id === row.id ? (
                      <OfficeDossier office={selectedOffice} />
                    ) : pending ? (
                      <p className="text-sm text-fog-400">Opening dossier…</p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${
        active ? "bg-copper-500 text-ink-950" : "text-fog-300 hover:text-parchment-100"
      }`}
    >
      {children}
    </button>
  );
}

function CopyCell({
  value,
  copied,
  label,
  onCopy,
}: {
  value: string;
  copied: boolean;
  label: string;
  onCopy: () => void;
}) {
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className="truncate text-xs text-fog-300">{blank(value)}</span>
      {value ? (
        <button
          type="button"
          aria-label={copied ? "Copied" : label}
          title={copied ? "Copied" : "Copy to clipboard"}
          onClick={(event) => {
            event.stopPropagation();
            onCopy();
          }}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center border border-white/10 text-fog-400 hover:border-copper-500/60 hover:text-copper-400"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      ) : null}
    </span>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.6]">
      <rect x="5.2" y="5.2" width="7.3" height="8.2" rx="1.1" />
      <path d="M10.5 5.2V4.1A1.1 1.1 0 0 0 9.4 3H4.1A1.1 1.1 0 0 0 3 4.1v7.3A1.1 1.1 0 0 0 4.1 12.5H5.2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.8]">
      <path d="M3.5 8.3 6.4 11.2 12.5 4.8" />
    </svg>
  );
}

function PlotMark({
  color,
  shape,
}: {
  color: string | null;
  shape: "house" | "diamond";
}) {
  return (
    <span
      aria-hidden
      className="mt-1 inline-block h-2.5 w-2.5 shrink-0"
      style={{
        background: color ?? "#6b7280",
        opacity: color ? 1 : 0.45,
        clipPath:
          shape === "house"
            ? "polygon(50% 0, 100% 38%, 100% 100%, 0 100%, 0 38%)"
            : "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
      }}
    />
  );
}

function LegendSwatch({
  color,
  shape,
  label,
}: {
  color: string;
  shape: "house" | "diamond";
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <PlotMark color={color} shape={shape} />
      {label}
    </span>
  );
}
