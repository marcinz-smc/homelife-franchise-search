import type { Office } from "../../types";
import { OfficeDossier } from "./OfficeDossier";

export function OfficeDrawer({
  office,
  onClose,
}: {
  office: Office | null;
  onClose: () => void;
}) {
  if (!office) return null;

  return (
    <aside
      className="atlas-scroll absolute inset-y-0 right-0 z-20 w-full max-w-md overflow-y-auto border-l border-copper-500/25 bg-ink-800/96 p-6 shadow-panel backdrop-blur-md"
      aria-label="Office details"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-copper-400">
            {office.city}, {office.province}
          </p>
          <h2 className="mt-2 font-display text-3xl leading-tight text-parchment-100">
            {office.name}
          </h2>
          <p className="mt-2 text-sm text-fog-300">{office.brokerageGroup}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.18em] text-fog-300 hover:border-copper-400"
        >
          Close
        </button>
      </div>

      <div className="mt-5">
        <OfficeDossier office={office} />
      </div>
    </aside>
  );
}
