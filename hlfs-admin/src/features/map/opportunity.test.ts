import { compareByOpportunity, opportunityScore } from "./opportunity";

test("scores cities with many desks and few HomeLife offices highest", () => {
  expect(opportunityScore(40, 0)).toBeGreaterThan(opportunityScore(40, 2));
  expect(opportunityScore(40, 1)).toBeGreaterThan(opportunityScore(10, 0));
});

test("sorts by that ratio, then by competitor count", () => {
  const rows = [
    { name: "Sparse", otherCount: 4, officeCount: 0 },
    { name: "Crowded", otherCount: 40, officeCount: 1 },
    { name: "Held", otherCount: 12, officeCount: 8 },
    { name: "Open field", otherCount: 40, officeCount: 0 },
  ];

  expect([...rows].sort(compareByOpportunity).map((row) => row.name)).toEqual([
    "Open field",
    "Crowded",
    "Sparse",
    "Held",
  ]);
});
