import { brokerageSearchHint, linkedinPeopleSearchUrl, recoLinkedinSearchUrl } from "./linkedin";

test("builds a LinkedIn people search from name, city, and brokerage", () => {
  expect(
    recoLinkedinSearchUrl({
      brokerOfRecord: "John Broker",
      searchCity: "Toronto",
      legalName: "Royal LePage Sample Inc.",
    }),
  ).toBe(
    "https://www.linkedin.com/search/results/people/?keywords=John%20Broker%20Toronto%20Royal%20LePage%20Sample",
  );
});

test("returns nothing without a broker of record", () => {
  expect(recoLinkedinSearchUrl({ searchCity: "Toronto", legalName: "Royal LePage Sample Inc." })).toBe("");
  expect(linkedinPeopleSearchUrl("", "  ")).toBe("");
});

test("strips brokerage suffixes from the company hint", () => {
  expect(brokerageSearchHint("HomeLife Landmark Realty Inc., Brokerage*")).toBe("HomeLife Landmark Realty");
});
