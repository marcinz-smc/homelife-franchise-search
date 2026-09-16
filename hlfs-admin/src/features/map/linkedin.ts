export function brokerageSearchHint(legalName: string) {
  return legalName
    .replace(/,?\s*brokerage\*?\s*$/i, "")
    .replace(/\s+(inc\.?|ltd\.?|limited|corp\.?|corporation)\s*$/i, "")
    .trim();
}

export function linkedinPeopleSearchUrl(...parts: Array<string | null | undefined>) {
  const keywords = parts
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ");
  if (!keywords) return "";
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;
}

export function recoLinkedinSearchUrl(brokerage: {
  brokerOfRecord?: string;
  searchCity?: string;
  legalName?: string;
}) {
  const name = (brokerage.brokerOfRecord ?? "").trim();
  if (!name) return "";
  return linkedinPeopleSearchUrl(name, brokerage.searchCity, brokerageSearchHint(brokerage.legalName ?? ""));
}
