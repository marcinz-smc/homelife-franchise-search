import type { RecoBrokerage } from "../../types";
import { RecoDetail } from "./RecoDetail";

export function RecoDrawer({
  brokerage,
  onClose,
  onSelectLocation,
}: {
  brokerage: RecoBrokerage | null;
  onClose: () => void;
  onSelectLocation?: (id: string) => void;
}) {
  if (!brokerage) return null;

  const locations = brokerage.locations ?? [];
  const lead = brokerage.lead ?? null;

  return (
    <aside
      className="absolute inset-y-0 right-0 z-20 flex w-full max-w-md flex-col border-l border-steel-500/30 bg-ink-800/96 shadow-panel backdrop-blur-md"
      aria-label="RECO brokerage details"
    >
      <header className="shrink-0 border-b border-white/10 px-5 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-steel-300">
              {brokerage.searchCity || "Ontario"}
              {locations.length > 1 ? ` · ${locations.length} locations` : ""}
              {lead ? (lead.shared ? " · Company scan" : " · Scored desk") : " · Other brokerage"}
            </p>
            <h2 className="mt-2 font-display text-3xl leading-tight text-parchment-100">
              {brokerage.legalName}
            </h2>
            <p className="mt-2 text-sm text-fog-300">{brokerage.registrationCategory}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.18em] text-fog-300 hover:border-steel-300"
          >
            Close
          </button>
        </div>
      </header>

      <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <RecoDetail brokerage={brokerage} onSelectLocation={onSelectLocation} idPrefix="drawer" />
      </div>
    </aside>
  );
}
