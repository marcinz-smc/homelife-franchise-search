import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RecoBrokerage } from "../../types";
import { RecoDrawer } from "./RecoDrawer";

const brokerage: RecoBrokerage = {
  id: "reco-1",
  legalName: "Royal LePage Sample Inc.",
  registrationCategory: "Brokerage",
  registrationNumber: "R200",
  registrationStatus: "REGISTERED",
  registrationExpiry: "2027/02/01",
  brokerOfRecord: "John Broker",
  address: "200 Queen St Toronto, ON M5H 2N2 Canada",
  email: "royal@example.com",
  phone: "416-555-0200",
  conditions: "None",
  corporationUrl: "https://example.com/royal",
  employeeListUrl: "https://example.com/royal-staff",
  searchCity: "Toronto",
  scrapedAt: "2026-09-10T18:45:19+00:00",
  isHomeLife: false,
  lat: 43.7,
  lng: -79.4,
};

const scored: RecoBrokerage = {
  ...brokerage,
  lead: {
    scoredAt: "2026-09-14T19:04:16+00:00",
    overallScore: 63,
    scoreBand: "medium",
    priorityBand: "C",
    isProvisional: true,
    coveragePct: 72,
    serviceNeed: 38,
    foundation: 90,
    conversion: 85,
    contact: {
      name: "Cameron Paine",
      role: "Broker of Record / Owner",
      phone: "519-948-8171",
      email: "cpaine@buckinghamrealty.ca",
      profileUrl: "https://www.linkedin.com/in/cameron-paine-19150736",
    },
    reasons: ["Poor mobile website performance indicates a clear gap in technology support."],
    talkingPoints: [
      {
        name: "technology",
        needRating: 41.67,
        type: "observation",
        summary: "Mobile performance score is 21/100.",
        service: "website improvement",
        question: "Which aspects of mobile performance cause the most friction?",
      },
    ],
    questions: ["What specific technology or CRM systems are currently in use?"],
    websiteUrl: "https://www.buckinghamrealty.ca/",
    companyLinkedinUrl: "https://www.linkedin.com/company/buckingham-realty-windsor-ltd-",
    personLinkedinUrl: "https://www.linkedin.com/in/cameron-paine-19150736",
    reviewRating: 4.9,
    reviewCount: 62,
    listings: 4775,
    roster: null,
    googleAds: "active",
    mobilePerformance: 21,
  },
};

test("renders RECO fields on overview and closes", async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(<RecoDrawer brokerage={brokerage} onClose={onClose} />);

  expect(screen.getByRole("heading", { name: brokerage.legalName })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText("R200")).toBeInTheDocument();
  expect(screen.getByText("REGISTERED")).toBeInTheDocument();
  expect(screen.getByText("John Broker · Broker of record")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /find on linkedin/i })).toHaveAttribute(
    "href",
    "https://www.linkedin.com/search/results/people/?keywords=John%20Broker%20Toronto%20Royal%20LePage%20Sample",
  );
  expect(screen.getByText("416-555-0200")).toBeInTheDocument();
  expect(screen.getByText("royal@example.com")).toBeInTheDocument();

  await user.click(screen.getByRole("tab", { name: "Registry" }));
  expect(screen.getByText("None")).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: /open on reco/i })).toHaveLength(2);

  await user.click(screen.getByRole("button", { name: /close/i }));
  expect(onClose).toHaveBeenCalled();
});

test("hides the LinkedIn search when there is no broker of record", () => {
  render(
    <RecoDrawer brokerage={{ ...brokerage, brokerOfRecord: "" }} onClose={() => undefined} />,
  );
  expect(screen.queryByRole("link", { name: /find on linkedin/i })).not.toBeInTheDocument();
});

test("opens scored desks on overview with clear score names", () => {
  render(<RecoDrawer brokerage={scored} onClose={() => undefined} />);

  expect(screen.getByTestId("lead-brief")).toHaveTextContent("63");
  expect(screen.getByText("Service need")).toBeInTheDocument();
  expect(screen.getByText(/gaps homelife can fill/i)).toBeInTheDocument();
  expect(screen.getByText("Business foundation")).toBeInTheDocument();
  expect(screen.getByText("Conversion potential")).toBeInTheDocument();
  expect(screen.getByText("Cameron Paine · Broker of Record / Owner")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /open linkedin profile/i })).toHaveAttribute(
    "href",
    "https://www.linkedin.com/in/cameron-paine-19150736",
  );
  expect(screen.queryByRole("link", { name: /find on linkedin/i })).not.toBeInTheDocument();
  expect(screen.getByText(/poor mobile website performance/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /open website/i })).toHaveAttribute(
    "href",
    "https://www.buckinghamrealty.ca/",
  );
  expect(screen.queryByText(/mobile performance score is 21/i)).not.toBeInTheDocument();
});

test("moves talking points and public signals onto their own tabs", async () => {
  const user = userEvent.setup();
  render(<RecoDrawer brokerage={scored} onClose={() => undefined} />);

  await user.click(screen.getByRole("tab", { name: "Approach" }));
  expect(screen.getByTestId("approach-panel")).toHaveTextContent("Technology");
  expect(screen.getByText(/mobile performance score is 21/i)).toBeInTheDocument();
  expect(screen.getByText(/which aspects of mobile performance/i)).toBeInTheDocument();
  expect(screen.getByText(/what specific technology or crm systems/i)).toBeInTheDocument();

  await user.click(screen.getByRole("tab", { name: "Signals" }));
  expect(screen.getByTestId("signals-panel")).toHaveTextContent("4.9 · 62 reviews");
  expect(screen.getByText("4775")).toBeInTheDocument();
  expect(screen.getByText("Active")).toBeInTheDocument();
});

test("lets you step between related locations", async () => {
  const user = userEvent.setup();
  const onSelectLocation = vi.fn();
  render(
    <RecoDrawer
      brokerage={{
        ...brokerage,
        locations: [
          {
            id: "reco-1",
            legalName: brokerage.legalName,
            searchCity: "Toronto",
            address: brokerage.address,
            registrationNumber: "R200",
            lat: 43.7,
            lng: -79.4,
            isOrigin: true,
          },
          {
            id: "reco-2",
            legalName: brokerage.legalName,
            searchCity: "Mississauga",
            address: "1 Hurontario St",
            registrationNumber: "R201",
            lat: 43.59,
            lng: -79.65,
            isOrigin: false,
          },
        ],
      }}
      onClose={() => undefined}
      onSelectLocation={onSelectLocation}
    />,
  );

  expect(screen.getByText(/2 locations/i)).toBeInTheDocument();
  const switcher = screen.getByTestId("location-switcher");
  expect(switcher).toHaveTextContent("1 of 2");
  expect(within(switcher).getByText(/this desk/i)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Next location" }));
  expect(onSelectLocation).toHaveBeenCalledWith("reco-2");
  await user.click(within(switcher).getByRole("button", { name: /mississauga/i }));
  expect(onSelectLocation).toHaveBeenCalledWith("reco-2");
});

test("renders nothing without a selected brokerage", () => {
  const { container } = render(<RecoDrawer brokerage={null} onClose={() => undefined} />);
  expect(container).toBeEmptyDOMElement();
});
