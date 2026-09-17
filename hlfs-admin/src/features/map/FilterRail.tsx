import type { FilterFacets, MapFilters, SearchHit } from "../../types";

type Props = {
  filters: MapFilters;
  facets: FilterFacets;
  results?: SearchHit[];
  onChange: (next: MapFilters) => void;
  onSelectHit?: (hit: SearchHit) => void;
};

const coverageOptions: { id: MapFilters["coverage"]; label: string }[] = [
  { id: "all", label: "All layers" },
  { id: "offices", label: "Offices only" },
  { id: "covered", label: "Covered cities" },
  { id: "uncovered", label: "Open ground" },
];

const viewOptions: { id: MapFilters["view"]; label: string }[] = [
  { id: "both", label: "Pins + heat" },
  { id: "markers", label: "Pins" },
  { id: "heatmap", label: "Heat" },
];

const brandOptions: { id: MapFilters["brand"]; label: string }[] = [
  { id: "all", label: "All brokerages" },
  { id: "homelife", label: "HomeLife" },
];

export function FilterRail({ filters, facets, results = [], onChange, onSelectHit }: Props) {
  function set<K extends keyof MapFilters>(key: K, value: MapFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  const searching = filters.q.trim().length > 0;

  return (
    <aside className="atlas-scroll flex h-full flex-col gap-6 overflow-y-auto border-r border-white/10 bg-ink-900/92 p-5 backdrop-blur-md">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-copper-400">
          Survey filters
        </p>
        <h2 className="mt-1 font-display text-2xl text-parchment-100">Refine the field</h2>
      </div>

      <label className="block text-xs uppercase tracking-[0.2em] text-fog-400">
        Search brokerages
        <input
          value={filters.q}
          onChange={(event) => set("q", event.target.value)}
          placeholder="Name, street, registration…"
          className="mt-2 w-full border border-white/10 bg-ink-950 px-3 py-2 text-sm text-parchment-100 outline-none focus:border-copper-500"
        />
      </label>
      {searching && results.length ? (
        <ul className="space-y-1">
          {results.map((hit) => (
            <li key={`${hit.source}-${hit.id}`}>
              <button
                type="button"
                onClick={() => onSelectHit?.(hit)}
                className="w-full border border-white/10 px-3 py-2 text-left text-sm text-parchment-100 hover:border-copper-500"
              >
                <span className="block">{hit.name}</span>
                <span className="block text-xs text-fog-400">
                  {hit.city}, {hit.province}
                  {hit.source === "reco" ? " · RECO" : " · HomeLife"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <fieldset>
        <legend className="text-xs uppercase tracking-[0.2em] text-fog-400">Brand</legend>
        <div className="mt-2 grid grid-cols-1 gap-2">
          {brandOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => set("brand", option.id)}
              className={`px-2 py-2 text-left text-xs ${
                filters.brand === option.id
                  ? "bg-copper-500 text-ink-950"
                  : "border border-white/10 text-fog-300 hover:border-copper-500/50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <SelectField
        label="Province"
        value={filters.province}
        options={facets.provinces}
        onChange={(value) => set("province", value)}
      />

      <fieldset>
        <legend className="text-xs uppercase tracking-[0.2em] text-fog-400">Coverage</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {coverageOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => set("coverage", option.id)}
              className={`px-2 py-2 text-left text-xs ${
                filters.coverage === option.id
                  ? "bg-copper-500 text-ink-950"
                  : "border border-white/10 text-fog-300 hover:border-copper-500/50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xs uppercase tracking-[0.2em] text-fog-400">Office layer</legend>
        <div className="mt-2 flex gap-2">
          {viewOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => set("view", option.id)}
              className={`flex-1 px-2 py-2 text-xs ${
                filters.view === option.id
                  ? "bg-signal-500 text-ink-950"
                  : "border border-white/10 text-fog-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-3 text-sm text-fog-300">
        <input
          type="checkbox"
          checked={filters.showZones}
          onChange={(event) => set("showZones", event.target.checked)}
          className="accent-copper-500"
        />
        Show 5km HomeLife zones
      </label>
      <label className="flex items-center gap-3 text-sm text-fog-300">
        <input
          type="checkbox"
          checked={filters.outsideZones}
          onChange={(event) => set("outsideZones", event.target.checked)}
          className="accent-steel-500"
        />
        Only Brokerages outside 5km
      </label>
      <label className="flex items-center gap-3 text-sm text-fog-300">
        <input
          type="checkbox"
          checked={filters.scoredOnly}
          onChange={(event) => set("scoredOnly", event.target.checked)}
          className="accent-copper-500"
        />
        Only advanced data plots
      </label>
      <label className="flex items-center gap-3 text-sm text-fog-300">
        <input
          type="checkbox"
          checked={filters.showCities}
          onChange={(event) => set("showCities", event.target.checked)}
          className="accent-copper-500"
        />
        Show Ontario municipalities
      </label>
    </aside>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs uppercase tracking-[0.2em] text-fog-400">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full border border-white/10 bg-ink-950 px-3 py-2 text-sm normal-case tracking-normal text-parchment-100 outline-none focus:border-copper-500"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
