import { useMemo, useState } from "react";
import type { Municipality } from "../../types";
import { compareByOpportunity } from "./opportunity";

type Props = {
  municipalities: Municipality[];
  open: boolean;
  onToggle: () => void;
  onFocus: (item: Municipality) => void;
};

export function OpportunityPanel({ municipalities, open, onToggle, onFocus }: Props) {
  const [tier, setTier] = useState<"city" | "region">("city");
  const [onlyOpen, setOnlyOpen] = useState(false);

  const rows = useMemo(() => {
    const wanted = municipalities.filter((item) => {
      const isRegion = item.municipalStatus === "Upper Tier";
      if (tier === "city" && isRegion) return false;
      if (tier === "region" && !isRegion) return false;
      if (onlyOpen && item.covered) return false;
      return true;
    });
    return [...wanted].sort(compareByOpportunity);
  }, [municipalities, onlyOpen, tier]);

  return (
    <div
      className={`pointer-events-none absolute inset-y-0 right-0 z-10 flex transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        open ? "translate-x-0" : "translate-x-80"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="opportunity-ledger"
        aria-label={open ? "Close where to keep looking" : "Open where to keep looking"}
        className="pointer-events-auto my-auto flex h-40 w-9 flex-col items-center justify-center gap-3 border border-r-0 border-copper-500/45 bg-ink-900/96 text-copper-400 shadow-panel backdrop-blur-md hover:bg-ink-800 hover:text-parchment-100"
      >
        <Chevron open={open} />
        <span className="font-mono text-[9px] uppercase tracking-[0.28em] [writing-mode:vertical-rl]">
          Looking
        </span>
      </button>

      <section
        id="opportunity-ledger"
        aria-hidden={!open}
        inert={!open || undefined}
        className="pointer-events-auto flex h-full w-80 min-h-0 flex-col border-l border-white/10 bg-ink-900/96 backdrop-blur-md"
      >
        <div className="border-b border-white/10 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-copper-400">
            Opportunity ledger
          </p>
          <h2 className="font-display text-2xl text-parchment-100">Where to keep looking</h2>
          <p className="mt-2 text-xs leading-relaxed text-fog-400">
            Ranked by other desks versus HomeLife offices.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTier("city")}
              className={`px-2 py-1 text-xs ${tier === "city" ? "bg-copper-500 text-ink-950" : "border border-white/10"}`}
            >
              Cities
            </button>
            <button
              type="button"
              onClick={() => setTier("region")}
              className={`px-2 py-1 text-xs ${tier === "region" ? "bg-copper-500 text-ink-950" : "border border-white/10"}`}
            >
              Regions
            </button>
            <button
              type="button"
              onClick={() => setOnlyOpen((value) => !value)}
              className={`px-2 py-1 text-xs ${onlyOpen ? "bg-gap-500 text-parchment-100" : "border border-white/10"}`}
            >
              {onlyOpen ? "Open only" : "Include covered"}
            </button>
          </div>
        </div>

        <ul className="atlas-scroll min-h-0 flex-1 overflow-y-auto">
          {rows.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onFocus(item)}
                className="flex w-full items-start justify-between gap-3 border-b border-white/5 px-4 py-3 text-left hover:bg-white/5"
              >
                <span>
                  <span className="block text-sm text-parchment-100">{item.name}</span>
                  <span className="block text-xs text-fog-400">{item.region}</span>
                </span>
                <span className="text-right font-mono text-[10px] uppercase tracking-[0.12em] text-fog-300">
                  <span className="block text-steel-300">{item.otherCount} other</span>
                  <span className={item.officeCount ? "text-signal-400" : "text-gap-400"}>
                    {item.officeCount ? `${item.officeCount} HomeLife` : "no HomeLife"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 12 16" aria-hidden="true" className="h-4 w-3 fill-none stroke-current stroke-[1.6]">
      {open ? <path d="M4 2.5 L9 8 L4 13.5" /> : <path d="M8 2.5 L3 8 L8 13.5" />}
    </svg>
  );
}
