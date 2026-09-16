export function opportunityScore(otherCount: number, homeLifeCount: number) {
  return (otherCount || 0) / ((homeLifeCount || 0) + 1);
}

export function compareByOpportunity<
  T extends { name: string; otherCount: number; officeCount: number },
>(a: T, b: T) {
  const scoreDiff =
    opportunityScore(b.otherCount, b.officeCount) - opportunityScore(a.otherCount, a.officeCount);
  if (scoreDiff !== 0) return scoreDiff;
  if (b.otherCount !== a.otherCount) return b.otherCount - a.otherCount;
  if (a.officeCount !== b.officeCount) return a.officeCount - b.officeCount;
  return a.name.localeCompare(b.name);
}
