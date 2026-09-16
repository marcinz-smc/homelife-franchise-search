export function outlinePolygon(
  lng: number,
  lat: number,
  municipalStatus: string,
  bbox?: number[] | null,
): { type: "Polygon"; coordinates: number[][][] } {
  if (bbox && bbox.length === 4) {
    const [west, south, east, north] = bbox;
    return {
      type: "Polygon",
      coordinates: [
        [
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ],
      ],
    };
  }

  const radius = municipalStatus === "Upper Tier" ? 0.16 : 0.04;
  const points: [number, number][] = [];
  for (let i = 0; i <= 16; i += 1) {
    const angle = (i / 16) * Math.PI * 2;
    points.push([lng + Math.cos(angle) * radius * 1.15, lat + Math.sin(angle) * radius]);
  }
  return { type: "Polygon", coordinates: [points] };
}
