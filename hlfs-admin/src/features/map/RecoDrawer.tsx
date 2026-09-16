import { useEffect, useMemo, useState } from "react";
import type { LeadProfile, RecoBrokerage, RecoLocation } from "../../types";
import { bandLabel, formatScore, pinColor, ratingTone, SCORE_COLORS, SCORE_COPY } from "./leadScore";
import { recoLinkedinSearchUrl } from "./linkedin";

type DrawerTab = "overview" | "approach" | "signals" | "registry";

export function RecoDrawer({
  brokerage,
  onClose,
  onSelectLocation,
}: {
  brokerage: RecoBrokerage | null;
  onClose: () => void;
  onSelectLocation?: (id: string) => void;
}) {
  const [tab, setTab] = useState<DrawerTab>("overview");
  const lead = brokerage?.lead ?? null;
  const locations = brokerage?.locations ?? [];
  const companyId = brokerage?.companyKey || brokerage?.legalName || "";

  useEffect(() => {
    setTab("overview");
  }, [companyId]);

  const tabs = useMemo(() => {
    const items: { id: DrawerTab; label: string }[] = [{ id: "overview", label: "Overview" }];
    if (lead) {
      items.push({ id: "approach", label: "Approach" }, { id: "signals", label: "Signals" });
    }
    items.push({ id: "registry", label: "Registry" });
    return items;
  }, [lead]);

  if (!brokerage) return null;

  const active = tabs.some((item) => item.id === tab) ? tab : "overview";
  const profileUrl = lead?.personLinkedinUrl || lead?.contact.profileUrl || "";
  const linkedinSearchUrl = profileUrl ? "" : recoLinkedinSearchUrl(brokerage);

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

        {locations.length > 1 ? (
          <LocationSwitcher
            currentId={brokerage.id}
            locations={locations}
            onSelect={onSelectLocation}
          />
        ) : null}

        <div
          className="mt-5 flex gap-1 overflow-x-auto"
          role="tablist"
          aria-label="Brokerage sections"
          data-testid="drawer-tabs"
        >
          {tabs.map((item) => {
            const selected = item.id === active;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`drawer-tab-${item.id}`}
                aria-selected={selected}
                aria-controls={`drawer-panel-${item.id}`}
                onClick={() => setTab(item.id)}
                className={`shrink-0 border-b-2 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] ${
                  selected
                    ? "border-copper-400 text-parchment-100"
                    : "border-transparent text-fog-400 hover:text-parchment-200"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {active === "overview" ? (
          <OverviewPanel
            brokerage={brokerage}
            lead={lead}
            profileUrl={profileUrl}
            linkedinSearchUrl={linkedinSearchUrl}
          />
        ) : null}
        {active === "approach" && lead ? <ApproachPanel lead={lead} /> : null}
        {active === "signals" && lead ? <SignalsPanel lead={lead} /> : null}
        {active === "registry" ? <RegistryPanel brokerage={brokerage} /> : null}
      </div>
    </aside>
  );
}

function LocationSwitcher({
  currentId,
  locations,
  onSelect,
}: {
  currentId: string;
  locations: RecoLocation[];
  onSelect?: (id: string) => void;
}) {
  const index = Math.max(
    0,
    locations.findIndex((item) => item.id === currentId),
  );

  function go(delta: number) {
    const next = locations[(index + delta + locations.length) % locations.length];
    if (next && next.id !== currentId) onSelect?.(next.id);
  }

  return (
    <div className="mt-4 border border-white/10 bg-ink-900/70" data-testid="location-switcher">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog-400">
          {index + 1} of {locations.length}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Previous location"
            onClick={() => go(-1)}
            className="border border-white/15 px-2 py-1 text-xs text-fog-300 hover:border-steel-300"
          >
            Prev
          </button>
          <button
            type="button"
            aria-label="Next location"
            onClick={() => go(1)}
            className="border border-white/15 px-2 py-1 text-xs text-fog-300 hover:border-steel-300"
          >
            Next
          </button>
        </div>
      </div>
      <ul className="atlas-scroll max-h-36 overflow-y-auto">
        {locations.map((location) => {
          const current = location.id === currentId;
          return (
            <li key={location.id}>
              <button
                type="button"
                onClick={() => {
                  if (!current) onSelect?.(location.id);
                }}
                className={`w-full px-3 py-2 text-left ${
                  current
                    ? "bg-copper-500/15 text-parchment-100"
                    : "text-fog-300 hover:bg-white/5 hover:text-parchment-100"
                }`}
              >
                <span className="block text-sm">
                  {location.searchCity || "Ontario"}
                  {location.isOrigin ? " · scanned" : ""}
                  {current ? " · this desk" : ""}
                </span>
                <span className="block truncate text-xs text-fog-400">
                  {location.address || location.registrationNumber}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function originLabel(brokerage: RecoBrokerage) {
  const origin =
    brokerage.locations?.find((item) => item.isOrigin) ||
    brokerage.locations?.find((item) => item.registrationNumber === brokerage.lead?.originRegistrationNumber);
  if (origin?.searchCity) return origin.searchCity;
  if (brokerage.lead?.originRegistrationNumber) return `#${brokerage.lead.originRegistrationNumber}`;
  return "another location of this company";
}

function OverviewPanel({
  brokerage,
  lead,
  profileUrl,
  linkedinSearchUrl,
}: {
  brokerage: RecoBrokerage;
  lead: LeadProfile | null;
  profileUrl: string;
  linkedinSearchUrl: string;
}) {
  const contactName = lead?.contact.name || brokerage.brokerOfRecord;
  const contactRole = lead?.contact.role || (brokerage.brokerOfRecord ? "Broker of record" : "");
  const phone = lead?.contact.phone || brokerage.phone;
  const email = lead?.contact.email || brokerage.email;

  return (
    <div className="space-y-6">
      {lead?.shared ? (
        <p className="border border-copper-500/30 bg-copper-500/10 px-3 py-3 text-sm text-parchment-200">
          Scan copied from {originLabel(brokerage)}. Address and registration below are for this desk.
        </p>
      ) : null}
      {lead ? (
        <section data-testid="lead-brief">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-copper-400">
                {SCORE_COPY.overall.title}
              </p>
              <p className="mt-1 max-w-[16rem] text-xs text-fog-400">{SCORE_COPY.overall.meaning}</p>
              <p
                className="mt-2 font-display text-5xl leading-none"
                style={{ color: pinColor(lead.scoreBand) }}
              >
                {formatScore(lead.overallScore)}
              </p>
            </div>
            <div className="text-right">
              <p
                className="font-mono text-[10px] uppercase tracking-[0.16em]"
                style={{ color: pinColor(lead.scoreBand) }}
              >
                {bandLabel(lead.scoreBand)}
              </p>
              {lead.priorityBand ? (
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fog-400">
                  Band {lead.priorityBand}
                  {lead.isProvisional ? " · provisional" : ""}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <ScoreRail copy={SCORE_COPY.need} value={lead.serviceNeed} />
            <ScoreRail copy={SCORE_COPY.foundation} value={lead.foundation} />
            <ScoreRail copy={SCORE_COPY.conversion} value={lead.conversion} />
          </div>
        </section>
      ) : (
        <p className="border border-white/10 bg-ink-900/60 px-3 py-3 text-sm text-fog-300">
          No franchise scan on this desk yet. Registry details are on the last tab.
        </p>
      )}

      {lead?.reasons.length ? (
        <section>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog-400">Why this desk</p>
          <ul className="mt-2 space-y-2">
            {lead.reasons.map((reason) => (
              <li key={reason} className="border-l-2 border-copper-500/50 pl-3 text-sm text-fog-300">
                {reason}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog-400">Who to call</p>
        <dl className="mt-3 space-y-3 text-sm">
          {contactName ? (
            <Row
              label="Contact"
              value={contactRole ? `${contactName} · ${contactRole}` : contactName}
            />
          ) : null}
          <Row label="Phone" value={phone} href={phone ? `tel:${phone}` : undefined} />
          <Row label="Email" value={email} href={email ? `mailto:${email}` : undefined} />
          {profileUrl ? (
            <Row
              label="LinkedIn"
              value="Open LinkedIn profile"
              href={profileUrl}
              linkLabel="Open LinkedIn profile"
            />
          ) : linkedinSearchUrl ? (
            <Row
              label="LinkedIn"
              value="Find on LinkedIn"
              href={linkedinSearchUrl}
              linkLabel="Find on LinkedIn"
            />
          ) : null}
          {lead?.companyLinkedinUrl ? (
            <Row
              label="Company"
              value="Company LinkedIn"
              href={lead.companyLinkedinUrl}
              linkLabel="Company LinkedIn"
            />
          ) : null}
          {lead?.websiteUrl ? (
            <Row label="Website" value={lead.websiteUrl} href={lead.websiteUrl} linkLabel="Open website" />
          ) : null}
          <Row label="Address" value={brokerage.address} />
          <Row label="Registration #" value={brokerage.registrationNumber} />
          <Row label="Status" value={brokerage.registrationStatus} />
        </dl>
      </section>
    </div>
  );
}

function ApproachPanel({ lead }: { lead: LeadProfile }) {
  return (
    <div className="space-y-6" data-testid="approach-panel">
      {lead.talkingPoints.length ? (
        <section>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog-400">Talking points</p>
          <ul className="mt-3 space-y-4">
            {lead.talkingPoints.map((point) => (
              <li key={`${point.name}-${point.service}`} className="border border-white/10 bg-ink-900/50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-parchment-100">{humanize(point.name)}</p>
                  {point.needRating != null ? (
                    <span
                      className="font-mono text-[10px]"
                      style={{ color: SCORE_COLORS[ratingTone(point.needRating)] }}
                    >
                      {formatScore(point.needRating)}
                    </span>
                  ) : null}
                </div>
                {point.service ? (
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-copper-400">
                    Offer: {humanize(point.service)}
                  </p>
                ) : null}
                {point.summary ? <p className="mt-2 text-sm text-fog-300">{point.summary}</p> : null}
                {point.question ? (
                  <p className="mt-2 border-l-2 border-steel-400/40 pl-3 text-sm italic text-parchment-200">
                    {point.question}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {lead.questions.length ? (
        <section>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog-400">
            Discovery questions
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-fog-300">
            {lead.questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

function SignalsPanel({ lead }: { lead: LeadProfile }) {
  return (
    <div className="space-y-4" data-testid="signals-panel">
      <p className="text-sm text-fog-300">
        Public footprint captured in the scan — useful before you pick up the phone.
      </p>
      <dl className="space-y-3 text-sm">
        <Row label="Reviews" value={reviewLabel(lead.reviewRating, lead.reviewCount)} />
        <Row label="Listings" value={lead.listings != null ? String(lead.listings) : ""} />
        <Row label="Advertised roster" value={lead.roster != null ? String(lead.roster) : ""} />
        <Row label="Google Ads" value={humanize(lead.googleAds)} />
        <Row
          label="Mobile site"
          value={lead.mobilePerformance != null ? `${formatScore(lead.mobilePerformance)} / 100` : ""}
        />
        <Row
          label="Evidence coverage"
          value={lead.coveragePct != null ? `${formatScore(lead.coveragePct)}%` : ""}
        />
        <Row label="Scored" value={formatScraped(lead.scoredAt)} />
      </dl>
    </div>
  );
}

function RegistryPanel({ brokerage }: { brokerage: RecoBrokerage }) {
  return (
    <dl className="space-y-4 text-sm" data-testid="registry-panel">
      <Row label="Registration #" value={brokerage.registrationNumber} />
      <Row label="Status" value={brokerage.registrationStatus} />
      <Row label="Expiry" value={brokerage.registrationExpiry} />
      <Row label="Broker of record" value={brokerage.brokerOfRecord} />
      <Row label="Address" value={brokerage.address} />
      <Row label="Phone" value={brokerage.phone} href={brokerage.phone ? `tel:${brokerage.phone}` : undefined} />
      <Row
        label="Email"
        value={brokerage.email}
        href={brokerage.email ? `mailto:${brokerage.email}` : undefined}
      />
      <Row label="Search city" value={brokerage.searchCity} />
      <Row label="Conditions" value={emptyAsNone(brokerage.conditions)} />
      <Row label="Corporation" value={brokerage.corporationUrl} href={brokerage.corporationUrl || undefined} />
      <Row
        label="Employees"
        value={brokerage.employeeListUrl}
        href={brokerage.employeeListUrl || undefined}
      />
      <Row label="Scraped" value={formatScraped(brokerage.scrapedAt)} />
    </dl>
  );
}

function ScoreRail({
  copy,
  value,
}: {
  copy: { title: string; meaning: string };
  value: number | null;
}) {
  const tone = value == null ? "medium" : ratingTone(value);
  const color = SCORE_COLORS[tone];
  const width = Math.max(6, Math.min(100, value ?? 0));
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fog-300">{copy.title}</p>
          <p className="mt-1 text-xs text-fog-400">{copy.meaning}</p>
        </div>
        <p className="font-display text-3xl leading-none" style={{ color }}>
          {formatScore(value)}
        </p>
      </div>
      <span className="mt-2 block h-1 bg-white/10">
        <span className="block h-1" style={{ width: `${width}%`, background: color }} />
      </span>
    </div>
  );
}

function reviewLabel(rating: number | null, count: number | null) {
  if (rating == null && count == null) return "";
  const score = rating != null ? formatScore(rating) : "—";
  return count != null ? `${score} · ${count} reviews` : score;
}

function emptyAsNone(value?: string) {
  if (!value || /^none$/i.test(value.trim())) return "None";
  return value;
}

function formatScraped(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function humanize(value?: string) {
  if (!value) return "";
  return value
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function Row({
  label,
  value,
  href,
  linkLabel,
}: {
  label: string;
  value?: string | null;
  href?: string;
  linkLabel?: string;
}) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 border-b border-white/5 pb-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog-400">{label}</dt>
      <dd>
        {href ? (
          <a
            href={href}
            className="break-all text-parchment-100 underline decoration-steel-400/50 underline-offset-4"
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noreferrer" : undefined}
          >
            {href.startsWith("http") ? linkLabel ?? "Open on RECO" : value}
          </a>
        ) : (
          <span className="text-parchment-100">{value}</span>
        )}
      </dd>
    </div>
  );
}
