export type ScoreBand = "low" | "medium" | "good";

export const SCORE_COLORS = {
  good: "#4fd4a8",
  medium: "#e8b45a",
  low: "#e07a5f",
  default: "#6ec8f0",
  homelife: "#d4924a",
} as const;

export function overallScoreBand(score: number): ScoreBand {
  if (score >= 75) return "good";
  if (score >= 60) return "medium";
  return "low";
}

export function ratingTone(score: number): ScoreBand {
  if (score >= 70) return "good";
  if (score >= 40) return "medium";
  return "low";
}

export function formatScore(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function pinColor(band?: ScoreBand | string | null): string {
  if (band === "good" || band === "medium" || band === "low") return SCORE_COLORS[band];
  return SCORE_COLORS.default;
}

export function bandLabel(band?: ScoreBand | string | null): string {
  if (band === "good") return "High priority";
  if (band === "medium") return "Worth a conversation";
  if (band === "low") return "Research first";
  return "";
}

export const SCORE_COPY = {
  overall: {
    title: "Overall outreach score",
    meaning: "How strongly this desk should be on the call list",
  },
  need: {
    title: "Service need",
    meaning: "Gaps HomeLife can fill — higher means more we can help with",
  },
  foundation: {
    title: "Business foundation",
    meaning: "How solid the operation already is — people, listings, reputation",
  },
  conversion: {
    title: "Conversion potential",
    meaning: "How ready they look to take a meeting and move",
  },
} as const;
