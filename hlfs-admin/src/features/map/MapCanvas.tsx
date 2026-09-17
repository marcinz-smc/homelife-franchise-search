import type { Feature, FeatureCollection } from "geojson";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { MapFilters, Municipality, SearchHit } from "../../types";
import { homelifeZoneCollection, visibleBrokeragePoints } from "./geo";
import { formatScore, SCORE_COLORS } from "./leadScore";
import { SelectedPinCard, type SelectedMapPin } from "./SelectedPinCard";

type Props = {
  token: string;
  points: FeatureCollection;
  zoneCenters: FeatureCollection;
  municipalities: FeatureCollection;
  filters: MapFilters;
  focus: Municipality | null;
  selectedPin?: SelectedMapPin | null;
  relatedIds?: string[];
  onSelectHit: (hit: SearchHit) => void;
};

const emptyCollection: FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const hasLeadExpr = [">=", ["to-number", ["coalesce", ["get", "hasLead"], 0]], 1] as mapboxgl.ExpressionSpecification;

export function MapCanvas({
  token,
  points,
  zoneCenters,
  municipalities,
  filters,
  focus,
  selectedPin = null,
  relatedIds = [],
  onSelectHit,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const selectedMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const selectedRootRef = useRef<Root | null>(null);
  const onSelectRef = useRef(onSelectHit);
  const pointsRef = useRef(points);
  const zoneCentersRef = useRef(zoneCenters);
  const municipalitiesRef = useRef(municipalities);
  const filtersRef = useRef(filters);
  const selectedIdRef = useRef(selectedPin?.id ?? null);
  const relatedIdsRef = useRef(relatedIds);
  const [ready, setReady] = useState(false);
  pointsRef.current = points;
  zoneCentersRef.current = zoneCenters;
  municipalitiesRef.current = municipalities;
  filtersRef.current = filters;
  selectedIdRef.current = selectedPin?.id ?? null;
  relatedIdsRef.current = relatedIds;
  const [mapError, setMapError] = useState(
    token.startsWith("sk.")
      ? "This Mapbox token is a secret key. Paste a public token (pk.) into VITE_MAPBOX_TOKEN for the browser map. The server can keep using the secret key for geocoding."
      : "",
  );
  onSelectRef.current = onSelectHit;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    mapboxgl.accessToken = token;

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [-84.7, 44.7],
        zoom: 5.4,
        attributionControl: true,
      });
    } catch (error) {
      console.error(error);
      return;
    }
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), "bottom-right");
    map.on("error", (event) => {
      const message = event.error?.message || "Map failed to load";
      if (token.startsWith("sk.")) {
        setMapError(
          "This Mapbox token is a secret key. Paste a public token (pk.) into VITE_MAPBOX_TOKEN for the browser map. The server can keep using the secret key for geocoding.",
        );
        return;
      }
      setMapError(message);
    });
    mapRef.current = map;
    popupRef.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 16 });

    map.on("load", () => {
      if (cancelled || mapRef.current !== map) return;
      try {
      map.addSource("offices-heat", { type: "geojson", data: emptyCollection });
      try {
        map.addSource("offices", {
          type: "geojson",
          data: emptyCollection,
          cluster: true,
          clusterMaxZoom: 8,
          clusterRadius: 40,
          clusterProperties: {
            homelifeCount: ["+", ["case", ["==", ["get", "brand"], "homelife"], 1, 0]],
            scoredCount: ["+", ["case", hasLeadExpr, 1, 0]],
            goodCount: ["+", ["case", ["==", ["get", "scoreBand"], "good"], 1, 0]],
          },
        });
      } catch {
        map.addSource("offices", { type: "geojson", data: emptyCollection, cluster: true, clusterMaxZoom: 8, clusterRadius: 40 });
      }
      map.addSource("municipalities", { type: "geojson", data: emptyCollection });
      map.addSource("homelife-zones", { type: "geojson", data: emptyCollection });
      try {
        map.addImage("homelife-pin", createPinImage("homelife"), { pixelRatio: 2 });
        map.addImage("other-default", createPinImage("other-default"), { pixelRatio: 2 });
        map.addImage("other-low", createPinImage("other-low"), { pixelRatio: 2 });
        map.addImage("other-medium", createPinImage("other-medium"), { pixelRatio: 2 });
        map.addImage("other-good", createPinImage("other-good"), { pixelRatio: 2 });
        map.addImage("other-pin", createPinImage("other-default"), { pixelRatio: 2 });
      } catch (error) {
        console.error(error);
      }

      map.addLayer({
        id: "municipality-fill",
        type: "fill",
        source: "municipalities",
        paint: {
          "fill-color": ["case", ["get", "covered"], "#3d9b8f", "#c45c3e"],
          "fill-opacity": 0.16,
        },
      });
      map.addLayer({
        id: "municipality-outline",
        type: "line",
        source: "municipalities",
        paint: {
          "line-color": ["case", ["get", "covered"], "#5ec4b6", "#e07a5f"],
          "line-width": ["case", ["==", ["get", "municipalStatus"], "Upper Tier"], 2.4, 1.5],
          "line-opacity": 0.9,
        },
      });
      map.addLayer({
        id: "municipality-labels",
        type: "symbol",
        source: "municipalities",
        minzoom: 6,
        layout: {
          "text-field": ["get", "name"],
          "text-size": ["case", ["==", ["get", "municipalStatus"], "Upper Tier"], 12, 10],
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Regular"],
          "text-anchor": "center",
          "text-allow-overlap": false,
          "text-padding": 2,
        },
        paint: {
          "text-color": "#f4ead8",
          "text-halo-color": "#070b0e",
          "text-halo-width": 1.4,
        },
      });

      map.addLayer({
        id: "homelife-zone-fill",
        type: "fill",
        source: "homelife-zones",
        paint: {
          "fill-color": "#c9844a",
          "fill-opacity": 0.12,
        },
      });
      map.addLayer({
        id: "homelife-zone-outline",
        type: "line",
        source: "homelife-zones",
        paint: {
          "line-color": "#d9a066",
          "line-width": 1.6,
          "line-opacity": 0.85,
        },
      });

      map.addLayer({
        id: "office-heat",
        type: "heatmap",
        source: "offices-heat",
        maxzoom: 14,
        paint: {
          "heatmap-weight": 0.8,
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 5, 0.6, 12, 1.6],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 5, 18, 12, 36],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(12,16,20,0)",
            0.2,
            "rgba(201,132,74,0.25)",
            0.45,
            "rgba(201,132,74,0.55)",
            0.75,
            "rgba(61,155,143,0.75)",
            1,
            "rgba(232,220,200,0.9)",
          ],
        },
      });

      map.addLayer({
        id: "office-clusters",
        type: "circle",
        source: "offices",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "case",
            [">", ["get", "goodCount"], 0],
            SCORE_COLORS.good,
            ["==", ["get", "homelifeCount"], ["get", "point_count"]],
            "#c9844a",
            [">", ["get", "scoredCount"], 0],
            SCORE_COLORS.medium,
            ["==", ["get", "homelifeCount"], 0],
            SCORE_COLORS.default,
            "#8b6f4e",
          ],
          "circle-radius": ["step", ["get", "point_count"], 16, 8, 20, 20, 26],
          "circle-stroke-color": "#0b1014",
          "circle-stroke-width": 2,
        },
      });

      map.addLayer({
        id: "office-cluster-count",
        type: "symbol",
        source: "offices",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
        },
        paint: { "text-color": "#070b0e" },
      });

      map.addLayer({
        id: "brokerage-glow",
        type: "circle",
        source: "offices",
        filter: unclusteredFilter(null, hasLeadExpr),
        paint: {
          "circle-color": [
            "match",
            ["get", "scoreBand"],
            "good",
            SCORE_COLORS.good,
            "medium",
            SCORE_COLORS.medium,
            "low",
            SCORE_COLORS.low,
            SCORE_COLORS.default,
          ],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 10, 9, 18],
          "circle-blur": 0.85,
          "circle-opacity": 0.62,
        },
      });

      map.addLayer({
        id: "brokerage-related",
        type: "circle",
        source: "offices",
        filter: relatedFilter([]),
        paint: {
          "circle-color": "rgba(244,234,216,0.16)",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 11, 9, 20],
          "circle-stroke-width": 2.4,
          "circle-stroke-color": "#f4ead8",
          "circle-opacity": 1,
        },
      });

      map.addLayer({
        id: "brokerage-circles",
        type: "circle",
        source: "offices",
        filter: unclusteredFilter(null),
        paint: {
          "circle-color": [
            "case",
            ["==", ["get", "brand"], "homelife"],
            "#f3e6d0",
            ["==", ["get", "scoreBand"], "good"],
            SCORE_COLORS.good,
            ["==", ["get", "scoreBand"], "medium"],
            SCORE_COLORS.medium,
            ["==", ["get", "scoreBand"], "low"],
            SCORE_COLORS.low,
            SCORE_COLORS.default,
          ],
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            4,
            ["case", ["==", ["get", "brand"], "homelife"], 5, hasLeadExpr, 4.6, 3.8],
            8,
            ["case", ["==", ["get", "brand"], "homelife"], 7.5, hasLeadExpr, 6.4, 5],
          ],
          "circle-stroke-width": [
            "case",
            ["==", ["get", "brand"], "homelife"],
            2.4,
            hasLeadExpr,
            2,
            1.6,
          ],
          "circle-stroke-color": [
            "case",
            ["==", ["get", "brand"], "homelife"],
            "#c9844a",
            "#f4ead8",
          ],
          "circle-opacity": 0.92,
        },
      });

      if (map.hasImage("homelife-pin") && map.hasImage("other-default")) {
        map.addLayer({
          id: "brokerage-points",
          type: "symbol",
          source: "offices",
          filter: unclusteredFilter(null),
          layout: {
            "icon-image": [
              "case",
              ["==", ["get", "brand"], "homelife"],
              "homelife-pin",
              ["==", ["get", "scoreBand"], "good"],
              "other-good",
              ["==", ["get", "scoreBand"], "medium"],
              "other-medium",
              ["==", ["get", "scoreBand"], "low"],
              "other-low",
              "other-default",
            ],
            "icon-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              4,
              ["case", ["==", ["get", "brand"], "homelife"], 0.7, hasLeadExpr, 0.78, 0.66],
              7,
              ["case", ["==", ["get", "brand"], "homelife"], 1.05, hasLeadExpr, 1.18, 1],
            ],
            "icon-anchor": "bottom",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "symbol-sort-key": [
              "case",
              ["==", ["get", "brand"], "homelife"],
              30,
              hasLeadExpr,
              20,
              1,
            ],
          },
        });
      }

      map.on("click", "office-clusters", (event) => {
        const feature = event.features?.[0] as
          | {
              properties?: { cluster_id?: number };
              geometry?: { type: string; coordinates: [number, number] };
            }
          | undefined;
        const clusterId = feature?.properties?.cluster_id;
        const source = map.getSource("offices") as mapboxgl.GeoJSONSource;
        if (clusterId == null) return;
        source.getClusterExpansionZoom(clusterId, (error, zoom) => {
          if (error || !feature?.geometry || feature.geometry.type !== "Point") return;
          map.easeTo({
            center: feature.geometry.coordinates,
            zoom: zoom ?? map.getZoom() + 2,
          });
        });
      });

      const selectFromEvent = (event: mapboxgl.MapLayerMouseEvent) => {
        const feature = event.features?.[0] as
          | { properties?: { id?: string; source?: string; name?: string; city?: string; province?: string } }
          | undefined;
        const id = feature?.properties?.id;
        const source = feature?.properties?.source === "reco" ? "reco" : "office";
        if (id) {
          onSelectRef.current({
            id: String(id),
            source,
            name: String(feature?.properties?.name ?? ""),
            city: String(feature?.properties?.city ?? ""),
            province: String(feature?.properties?.province ?? ""),
          });
        }
      };

      map.on("click", "brokerage-circles", selectFromEvent);
      if (map.getLayer("brokerage-points")) {
        map.on("click", "brokerage-points", selectFromEvent);
      }
      if (map.getLayer("brokerage-glow")) {
        map.on("click", "brokerage-glow", selectFromEvent);
      }
      if (map.getLayer("brokerage-related")) {
        map.on("click", "brokerage-related", selectFromEvent);
      }

      map.on("mouseenter", "homelife-zone-fill", (event) => {
        const feature = event.features?.[0];
        const name = String(feature?.properties?.name ?? "HomeLife coverage");
        const officeCount = Number(feature?.properties?.officeCount ?? 1);
        const detail =
          officeCount > 1
            ? `Connected 5km zone · ${officeCount} HomeLife offices`
            : "5km HomeLife zone";
        if (event.lngLat) {
          popupRef.current
            ?.setLngLat(event.lngLat)
            .setHTML(
              `<strong>${escapeHtml(name)}</strong><br/><span>${escapeHtml(detail)}</span>`,
            )
            .addTo(map);
        }
      });
      map.on("mouseleave", "homelife-zone-fill", () => {
        map.getCanvas().style.cursor = "";
        popupRef.current?.remove();
      });

      const hoverLayers = ["brokerage-related", "brokerage-glow", "brokerage-circles", "brokerage-points"].filter((layer) =>
        map.getLayer(layer),
      );
      for (const layer of hoverLayers) {
        map.on("mouseenter", layer, (event) => {
          map.getCanvas().style.cursor = "pointer";
          const feature = event.features?.[0] as Feature | undefined;
          if (!feature || feature.geometry.type !== "Point") return;
          const name = String(feature.properties?.name ?? "Brokerage");
          const brand = feature.properties?.brand === "homelife" ? "HomeLife office" : hoverRecoLabel(feature);
          popupRef.current
            ?.setLngLat(feature.geometry.coordinates as [number, number])
            .setHTML(
              `<strong>${escapeHtml(name)}</strong><br/><span>${escapeHtml(brand)}</span>`,
            )
            .addTo(map);
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
          popupRef.current?.remove();
        });
      }
        const paint = () => {
          if (cancelled || mapRef.current !== map || !map.getSource("offices")) return;
          applyMapData(
            map,
            pointsRef.current,
            zoneCentersRef.current,
            municipalitiesRef.current,
            filtersRef.current,
            selectedIdRef.current,
            relatedIdsRef.current,
          );
        };
        paint();
        map.resize();
        map.once("idle", () => {
          paint();
          map.resize();
        });
      } finally {
        if (!cancelled && mapRef.current === map) setReady(true);
      }
    });

    return () => {
      cancelled = true;
      setReady(false);
      popupRef.current?.remove();
      selectedMarkerRef.current?.remove();
      selectedMarkerRef.current = null;
      selectedRootRef.current?.unmount();
      selectedRootRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map?.getSource("offices")) return;
    applyMapData(map, points, zoneCenters, municipalities, filters, selectedPin?.id ?? null, relatedIds);
  }, [filters, municipalities, points, ready, relatedIds, selectedPin?.id, zoneCenters]);

  useEffect(() => {
    const map = mapRef.current;
    const node = containerRef.current;
    if (!ready || !map || !node) return;
    map.resize();
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(node);
    return () => observer.disconnect();
  }, [ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    if (
      !selectedPin ||
      !Number.isFinite(selectedPin.lng) ||
      !Number.isFinite(selectedPin.lat)
    ) {
      selectedMarkerRef.current?.remove();
      selectedMarkerRef.current = null;
      selectedRootRef.current?.unmount();
      selectedRootRef.current = null;
      return;
    }
    if (!selectedMarkerRef.current) {
      const element = document.createElement("div");
      selectedRootRef.current = createRoot(element);
      selectedMarkerRef.current = new mapboxgl.Marker({ element, anchor: "bottom", offset: [0, 6] })
        .setLngLat([selectedPin.lng, selectedPin.lat])
        .addTo(map);
    } else {
      selectedMarkerRef.current.setLngLat([selectedPin.lng, selectedPin.lat]);
    }
    selectedRootRef.current?.render(<SelectedPinCard pin={selectedPin} />);
  }, [ready, selectedPin]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !selectedPin) return;
    if (!Number.isFinite(selectedPin.lng) || !Number.isFinite(selectedPin.lat)) return;
    map.easeTo({
      center: [selectedPin.lng, selectedPin.lat],
      zoom: Math.max(map.getZoom(), 12),
      duration: 700,
    });
  }, [ready, selectedPin?.id, selectedPin?.lat, selectedPin?.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus?.lng || !focus.lat) return;
    map.easeTo({ center: [focus.lng, focus.lat], zoom: Math.max(map.getZoom(), 9) });
    new mapboxgl.Popup({ closeButton: false, offset: 12 })
      .setLngLat([focus.lng, focus.lat])
      .setHTML(
        `<strong>${escapeHtml(focus.name)}</strong><br/><span>${escapeHtml(focus.region)} · ${
          focus.covered ? `${focus.officeCount} offices` : "no office yet"
        }</span>`,
      )
      .addTo(map);
  }, [focus]);

  if (!token) {
    return (
      <div className="flex h-full items-center justify-center bg-ink-800 p-8 text-center text-fog-300">
        Add `VITE_MAPBOX_TOKEN` to `.env` to load the map.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full min-h-[420px] w-full" />
      <div className="pointer-events-none absolute bottom-6 left-6 border border-white/10 bg-ink-900/92 px-3 py-3 text-xs text-fog-300 backdrop-blur-md">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-copper-400">Legend</p>
        <LegendRow color={SCORE_COLORS.homelife} shape="house" label="HomeLife office" />
        <LegendRow color="#d9a066" shape="line" label="5km HomeLife zone" />
        <LegendRow color={SCORE_COLORS.default} shape="diamond" label="Other brokerages" />
        <LegendRow color="#f4ead8" shape="ring" label="Same company" />
        <LegendRow color={SCORE_COLORS.low} shape="diamond" label="Low score" glow />
        <LegendRow color={SCORE_COLORS.medium} shape="diamond" label="Medium score" glow />
        <LegendRow color={SCORE_COLORS.good} shape="diamond" label="Good score" glow />
        <LegendRow color="#5ec4b6" shape="line" label="Covered municipality" />
        <LegendRow color="#e07a5f" shape="line" label="Open municipality" />
      </div>
      {mapError ? (
        <div className="absolute inset-x-6 top-6 border border-gap-500/40 bg-ink-900/95 p-4 text-sm text-gap-400">
          {mapError}
        </div>
      ) : null}
    </div>
  );
}

function LegendRow({
  color,
  shape,
  label,
  glow = false,
}: {
  color: string;
  shape: "house" | "diamond" | "line" | "ring";
  label: string;
  glow?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span
        aria-hidden
        className={shape === "line" ? "h-0.5 w-3.5" : "h-2.5 w-2.5"}
        style={{
          background: shape === "ring" ? "transparent" : color,
          border: shape === "ring" ? `2px solid ${color}` : undefined,
          borderRadius: shape === "ring" ? "999px" : undefined,
          boxShadow: glow ? `0 0 8px ${color}` : undefined,
          clipPath:
            shape === "diamond"
              ? "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)"
              : shape === "house"
                ? "polygon(50% 0, 100% 38%, 100% 100%, 0 100%, 0 38%)"
                : undefined,
        }}
      />
      <span>{label}</span>
    </div>
  );
}

type PinKind = "homelife" | "other-default" | "other-low" | "other-medium" | "other-good";

function createPinImage(kind: PinKind) {
  const pixelRatio = 2;
  const glow = kind === "other-low" || kind === "other-medium" || kind === "other-good";
  const diamondSize = kind === "homelife" ? 30 : glow ? 26 : 24;
  const pad = glow ? 12 : 3;
  const width = diamondSize + pad * 2;
  const height = diamondSize + pad * 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { width: canvas.width, height: canvas.height, data: new Uint8Array(canvas.width * canvas.height * 4) };
  }
  ctx.scale(pixelRatio, pixelRatio);
  const cx = width / 2;
  const palette: Record<PinKind, { fill: string; stroke: string; core: string }> = {
    homelife: { fill: "#d4924a", stroke: "#f6ead6", core: "#141b22" },
    "other-default": { fill: SCORE_COLORS.default, stroke: "#f4ead8", core: "#102028" },
    "other-low": { fill: SCORE_COLORS.low, stroke: "#f6ead6", core: "#140c0a" },
    "other-medium": { fill: SCORE_COLORS.medium, stroke: "#f6ead6", core: "#14100a" },
    "other-good": { fill: SCORE_COLORS.good, stroke: "#f4ead8", core: "#071410" },
  };
  const colors = palette[kind];

  if (kind === "homelife") {
    ctx.fillStyle = colors.fill;
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx, height - pad - 0.5);
    ctx.quadraticCurveTo(cx + 12, pad + 16, cx + 10, pad + 11);
    ctx.arc(cx, pad + 11, 10, 0.15, Math.PI - 0.15, true);
    ctx.quadraticCurveTo(cx - 12, pad + 16, cx, height - pad - 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = colors.core;
    ctx.beginPath();
    ctx.moveTo(cx, pad + 5.5);
    ctx.lineTo(cx + 6.4, pad + 11);
    ctx.lineTo(cx + 6.4, pad + 18);
    ctx.lineTo(cx - 6.4, pad + 18);
    ctx.lineTo(cx - 6.4, pad + 11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = colors.stroke;
    ctx.fillRect(cx - 1.5, pad + 13.4, 3, 4.6);
    return {
      width: canvas.width,
      height: canvas.height,
      data: new Uint8Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data),
    };
  }

  const top = pad;
  const bottom = height - pad;
  const left = pad;
  const right = width - pad;
  if (glow) {
    ctx.shadowColor = colors.fill;
    ctx.shadowBlur = 11;
  }
  ctx.fillStyle = colors.fill;
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.lineTo(right, cx);
  ctx.lineTo(cx, bottom);
  ctx.lineTo(left, cx);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = colors.stroke;
  ctx.lineWidth = glow ? 1.8 : 1.6;
  ctx.stroke();

  ctx.fillStyle = colors.core;
  const inset = glow ? 6.2 : 5.6;
  ctx.beginPath();
  ctx.moveTo(cx, top + inset);
  ctx.lineTo(right - inset, cx);
  ctx.lineTo(cx, bottom - inset);
  ctx.lineTo(left + inset, cx);
  ctx.closePath();
  ctx.fill();

  if (glow) {
    ctx.fillStyle = colors.stroke;
    ctx.beginPath();
    ctx.arc(cx, cx, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  return {
    width: canvas.width,
    height: canvas.height,
    data: new Uint8Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data),
  };
}

function applyMapData(
  map: mapboxgl.Map,
  points: FeatureCollection,
  zoneCenters: FeatureCollection,
  municipalities: FeatureCollection,
  filters: MapFilters,
  selectedId: string | null,
  relatedIds: string[] = [],
) {
  const heat = map.getSource("offices-heat") as mapboxgl.GeoJSONSource | undefined;
  const clustered = map.getSource("offices") as mapboxgl.GeoJSONSource | undefined;
  const cities = map.getSource("municipalities") as mapboxgl.GeoJSONSource | undefined;
  const zones = map.getSource("homelife-zones") as mapboxgl.GeoJSONSource | undefined;
  const visiblePoints = visibleBrokeragePoints(points, zoneCenters, {
    outsideZones: filters.outsideZones,
    coverage: filters.coverage,
    scoredOnly: filters.scoredOnly,
  });
  const homelifeHeat: FeatureCollection = {
    type: "FeatureCollection",
    features: visiblePoints.features.filter((feature) => feature.properties?.brand === "homelife"),
  };
  heat?.setData(homelifeHeat);
  clustered?.setData(visiblePoints);
  cities?.setData(filters.showCities ? municipalities : emptyCollection);
  zones?.setData(filters.showZones ? homelifeZoneCollection(zoneCenters) : emptyCollection);

  const showHeat = filters.view === "heatmap" || filters.view === "both";
  const showPins = filters.view === "markers" || filters.view === "both";
  const showCities = filters.showCities && filters.coverage !== "offices";
  setVisibility(map, "office-heat", showHeat);
  setVisibility(map, "office-clusters", showPins);
  setVisibility(map, "office-cluster-count", showPins);
  setVisibility(map, "brokerage-glow", showPins);
  setVisibility(map, "brokerage-related", showPins);
  setVisibility(map, "brokerage-circles", showPins);
  setVisibility(map, "brokerage-points", showPins);
  setVisibility(map, "homelife-zone-fill", filters.showZones);
  setVisibility(map, "homelife-zone-outline", filters.showZones);
  setVisibility(map, "municipality-fill", showCities);
  setVisibility(map, "municipality-outline", showCities);
  setVisibility(map, "municipality-labels", showCities);

  if (map.getLayer("brokerage-glow")) {
    map.setFilter("brokerage-glow", unclusteredFilter(selectedId, hasLeadExpr));
  }
  if (map.getLayer("brokerage-related")) {
    map.setFilter("brokerage-related", relatedFilter(relatedIds));
  }
  if (map.getLayer("brokerage-circles")) {
    map.setFilter("brokerage-circles", unclusteredFilter(selectedId));
  }
  if (map.getLayer("brokerage-points")) {
    map.setFilter("brokerage-points", unclusteredFilter(selectedId));
  }

  const cityFilter =
    filters.coverage === "covered"
      ? (["==", ["get", "covered"], true] as mapboxgl.FilterSpecification)
      : filters.coverage === "uncovered"
        ? (["==", ["get", "covered"], false] as mapboxgl.FilterSpecification)
        : null;
  if (map.getLayer("municipality-fill")) map.setFilter("municipality-fill", cityFilter);
  if (map.getLayer("municipality-outline")) map.setFilter("municipality-outline", cityFilter);
  if (map.getLayer("municipality-labels")) map.setFilter("municipality-labels", cityFilter);
}

function setVisibility(map: mapboxgl.Map, layer: string, visible: boolean) {
  if (!map.getLayer(layer)) return;
  map.setLayoutProperty(layer, "visibility", visible ? "visible" : "none");
}

function relatedFilter(relatedIds: string[]): mapboxgl.FilterSpecification {
  if (!relatedIds.length) {
    return ["==", ["get", "id"], "__none__"] as mapboxgl.FilterSpecification;
  }
  return [
    "all",
    ["!", ["has", "point_count"]],
    ["in", ["get", "id"], ["literal", relatedIds]],
  ] as mapboxgl.FilterSpecification;
}

function unclusteredFilter(
  selectedId: string | null,
  extra?: mapboxgl.ExpressionSpecification,
): mapboxgl.FilterSpecification {
  const parts: unknown[] = ["all", ["!", ["has", "point_count"]]];
  if (selectedId) parts.push(["!=", ["get", "id"], selectedId]);
  if (extra) parts.push(extra);
  return parts as mapboxgl.FilterSpecification;
}

function hoverRecoLabel(feature: Feature) {
  const band = String(feature.properties?.scoreBand ?? "");
  const score = Number(feature.properties?.overallScore);
  if (band && Number.isFinite(score)) {
    return `Overall ${formatScore(score)} · ${band}`;
  }
  return "Other brokerage";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
