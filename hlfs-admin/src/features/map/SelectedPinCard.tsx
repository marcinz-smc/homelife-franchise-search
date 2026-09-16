import type { ReactNode } from "react";
import { formatScore, pinColor, ratingTone, SCORE_COLORS, type ScoreBand } from "./leadScore";

export type SelectedMapPin = {
  id: string;
  brand: "homelife" | "other";
  name: string;
  lng: number;
  lat: number;
  scoreBand?: ScoreBand | string | null;
  serviceNeed?: number | null;
  foundation?: number | null;
  conversion?: number | null;
};

export function SelectedPinCard({ pin }: { pin: SelectedMapPin }) {
  const color = pin.brand === "homelife" ? SCORE_COLORS.homelife : pinColor(pin.scoreBand);
  const showScores =
    pin.brand === "other" &&
    [pin.serviceNeed, pin.foundation, pin.conversion].some((value) => value != null);

  return (
    <div
      className="pointer-events-none flex flex-col items-center"
      data-testid="selected-pin"
      style={{ color }}
    >
      {showScores ? (
        <div className="mb-1.5 flex items-end gap-1">
          <ScoreChip
            label="Service need"
            value={pin.serviceNeed}
            icon={<NeedIcon />}
          />
          <ScoreChip
            label="Business foundation"
            value={pin.foundation}
            icon={<FoundationIcon />}
          />
          <ScoreChip
            label="Conversion potential"
            value={pin.conversion}
            icon={<ConversionIcon />}
          />
        </div>
      ) : null}
      <span
        aria-hidden
        className="selected-pin-core block"
        style={{
          width: pin.brand === "homelife" ? 30 : 28,
          height: pin.brand === "homelife" ? 32 : 28,
          background: color,
          clipPath:
            pin.brand === "homelife"
              ? "polygon(50% 0, 100% 38%, 100% 100%, 0 100%, 0 38%)"
              : "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
          ["--pin-glow" as string]: color,
        }}
      />
      <span className="sr-only">{pin.name} selected</span>
    </div>
  );
}

function ScoreChip({
  label,
  value,
  icon,
}: {
  label: string;
  value?: number | null;
  icon: ReactNode;
}) {
  const tone = value == null ? "medium" : ratingTone(value);
  const color = SCORE_COLORS[tone];
  return (
    <span
      className="flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[11px] leading-none"
      style={{
        color,
        borderColor: `${color}99`,
        background: "rgba(7, 11, 14, 0.92)",
        boxShadow: `0 0 12px ${color}55`,
      }}
      aria-label={`${label} ${formatScore(value)}`}
    >
      {icon}
      {formatScore(value)}
    </span>
  );
}

function NeedIcon() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14.2 6.1 9.9 1.8 8.5 3.2l1.1 1.1-6 6L2 8.6l-.8.8 2.7 2.7c.6.6 1.6.6 2.2 0l6-6 1.1 1.1 1-1.1ZM3.7 13.4c-.7.9-2.2 1.5-3.2 1.6.1-1 .7-2.5 1.6-3.2l.8.8c-.3.4-.6 1-.7 1.6.6-.1 1.2-.4 1.6-.7l.8.9Z"
      />
    </svg>
  );
}

function FoundationIcon() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 1.2 1.5 5v1.3h13V5L8 1.2ZM3.2 7.2v5.2H2V14h12v-1.6h-1.2V7.2H10v5.2H8.8V7.2H6v5.2H4.8V7.2H3.2Z"
      />
    </svg>
  );
}

function ConversionIcon() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 1.2A6.8 6.8 0 1 0 14.8 8 6.8 6.8 0 0 0 8 1.2Zm0 2.2A4.6 4.6 0 1 1 3.4 8 4.6 4.6 0 0 1 8 3.4Zm0 2.3A2.3 2.3 0 1 0 10.3 8 2.3 2.3 0 0 0 8 5.7Zm0 1.4A.9.9 0 1 1 7.1 8 .9.9 0 0 1 8 7.1Z"
      />
    </svg>
  );
}
