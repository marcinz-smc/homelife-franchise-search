import type { Office } from "../../types";

export function OfficeDossier({ office }: { office: Office }) {
  const website = normalizeWebsite(office.website);

  return (
    <div>
      {office.photo && !office.isPlaceholderLogo ? (
        <img
          src={office.photo}
          alt=""
          className="h-40 w-full object-cover object-center opacity-90"
        />
      ) : null}

      <dl className="mt-6 space-y-4 text-sm">
        <Row label="Broker / contact" value={office.broker || office.primaryContactName} />
        <Row label="Address" value={office.address} />
        <Row label="Phone" value={office.phone} href={office.phone ? `tel:${office.phone}` : undefined} />
        <Row label="Toll-free" value={office.tollFree} />
        <Row label="Fax" value={office.fax} />
        <Row
          label="Email"
          value={office.email}
          href={office.email ? `mailto:${office.email}` : undefined}
        />
        <Row label="Website" value={office.website} href={website} />
        <Row label="Languages" value={office.language} />
        <Row label="Specialization" value={office.specialization} />
        <Row label="MLS ID" value={office.mlsId} />
        <Row
          label="Corporate listing"
          value={office.listedOnCorporateWebsite ? "Listed on HomeLife site" : "Not listed"}
        />
        <Row
          label="Match"
          value={
            office.matchStatus === "matched"
              ? "Matched to Ontario municipality"
              : office.matchStatus === "non_ontario"
                ? "Outside Ontario"
                : office.matchNote || "Unmatched city"
          }
        />
      </dl>

      {office.socials?.length ? (
        <div className="mt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-fog-400">Social</p>
          <ul className="mt-2 space-y-1 text-sm">
            {office.socials.map((social) => (
              <li key={`${social.label}-${social.url}`}>
                <a
                  href={social.url}
                  className="text-signal-400 underline decoration-signal-400/40 underline-offset-4"
                  target="_blank"
                  rel="noreferrer"
                >
                  {social.label || social.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {office.aboutParagraphs?.length ? (
        <div className="mt-6 space-y-3 text-sm leading-6 text-fog-300">
          {office.aboutParagraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  href,
}: {
  label: string;
  value?: string | null;
  href?: string;
}) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 border-b border-white/5 pb-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog-400">{label}</dt>
      <dd>
        {href ? (
          <a
            href={href}
            className="text-parchment-100 underline decoration-copper-500/50 underline-offset-4"
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noreferrer" : undefined}
          >
            {value}
          </a>
        ) : (
          <span className="text-parchment-100">{value}</span>
        )}
      </dd>
    </div>
  );
}

function normalizeWebsite(website?: string) {
  if (!website) return undefined;
  if (website.startsWith("http")) return website;
  return `https://${website}`;
}
