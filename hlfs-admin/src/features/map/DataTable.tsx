import type { Feature, FeatureCollection } from "geojson";
import { useState } from "react";
import type { Office, RecoBrokerage, SearchHit } from "../../types";
import { featureHasLead, formatKm, nearestHomeLifeKm } from "./geo";
import { SCORE_COLORS, pinColor } from "./leadScore";
import { OfficeDossier } from "./OfficeDossier";
import { RecoDetail } from "./RecoDetail";

const emptyCenters: FeatureCollection = { type: "FeatureCollection", features: [] };

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
    .filter((row): row is BrokerageRow => row !== null)
    .sort((left, right) => {
      const city = left.city.localeCompare(right.city, undefined, { sensitivity: "base" });
      if (city !== 0) return city;
      return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
    });
}

export function groupRowsByCity(rows: BrokerageRow[]): { city: string; rows: BrokerageRow[] }[] {
  const groups: { city: string; rows: BrokerageRow[] }[] = [];
  for (const row of rows) {
    const city = row.city || "Unspecified";
    const last = groups[groups.length - 1];
    if (last && last.city === city) {
      last.rows.push(row);
    } else {
      groups.push({ city, rows: [row] });
    }
  }
  return groups;
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
  "grid-cols-1 gap-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)_minmax(6.75rem,0.7fr)_minmax(0,1.05fr)_3.6rem_4.6rem] lg:items-center lg:gap-x-3";

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
  const rows = rowsFromPoints(points, zoneCenters);
  const groups = groupRowsByCity(rows);
  const expandedId = selectedOffice?.id ?? selectedReco?.id ?? "";
  const [pendingId, setPendingId] = useState("");

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

  return (
    <div className="atlas-scroll flex h-full min-h-0 flex-col overflow-y-auto bg-ink-950" data-testid="data-table">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-ink-900/95 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-copper-400">
            {rows.length === 1 ? "1 desk" : `${rows.length} desks`} · sorted by city
          </p>
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
          <span>Broker of record</span>
          <span>Phone</span>
          <span>Email</span>
          <span>Brand</span>
          <span className="text-right">Closest HL</span>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="px-5 py-8 text-sm text-fog-400">No brokerages match the current filters.</p>
      ) : (
        <div key={`${rows.length}:${rows[0]?.id ?? ""}:${rows[rows.length - 1]?.id ?? ""}`}>
          {groups.map((group) => (
            <section key={group.city} className="[content-visibility:auto]">
              <h2 className="sticky top-[92px] z-[1] border-b border-white/5 bg-ink-900 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-fog-400">
                {group.city}
                <span className="ml-2 text-fog-500">{group.rows.length}</span>
              </h2>
              <ul>
                {group.rows.map((row) => {
                  const expanded = expandedId === row.id;
                  const pending = pendingId === row.id;
                  const plotColor = rowPlotColor(row);
                  return (
                    <li key={`${row.source}-${row.id}`} className="border-b border-white/5">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        data-plot-color={plotColor ?? "none"}
                        onClick={() => {
                          void toggle(row);
                        }}
                        className={`grid w-full min-w-0 px-5 py-3 text-left hover:bg-white/5 ${ROW_GRID} ${
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
                      >
                        <span className="flex min-w-0 items-start gap-2">
                          <PlotMark color={plotColor} shape={row.brand === "homelife" ? "house" : "diamond"} />
                          <span className="min-w-0">
                            <span
                              className={`block truncate text-sm ${plotColor ? "" : "text-parchment-100"}`}
                              style={{ color: plotColor ?? undefined }}
                            >
                              {row.name}
                            </span>
                            <span className="block truncate text-xs text-fog-400">
                              {[row.city, row.province].filter(Boolean).join(", ")}
                              {pending ? " · Opening…" : ""}
                            </span>
                          </span>
                        </span>
                        <span className="truncate text-xs text-fog-300">{blank(row.broker)}</span>
                        <span className="truncate text-xs text-fog-300">{blank(row.phone)}</span>
                        <span className="truncate text-xs text-fog-300">{blank(row.email)}</span>
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
                      </button>
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
            </section>
          ))}
        </div>
      )}
    </div>
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
