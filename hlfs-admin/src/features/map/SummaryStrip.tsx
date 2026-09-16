import type { CoverageSummary } from "../../types";

export function SummaryStrip({ summary }: { summary: CoverageSummary | null }) {
  const cards = [
    { label: "Offices plotted", value: summary?.officeCount ?? 0 },
    { label: "Ontario desks", value: summary?.ontarioOfficeCount ?? 0 },
    { label: "Cities covered", value: summary?.coveredCount ?? 0 },
    { label: "Still open", value: summary?.uncoveredCount ?? 0 },
    { label: "Outside Ontario", value: summary?.otherOfficeCount ?? 0 },
  ];

  return (
    <div className="grid grid-cols-2 gap-px border-b border-white/10 bg-white/10 md:grid-cols-5">
      {cards.map((card, index) => (
        <div
          key={card.label}
          className="bg-ink-900/95 px-4 py-3"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-fog-400">
            {card.label}
          </p>
          <p className="font-display text-3xl text-parchment-100">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
