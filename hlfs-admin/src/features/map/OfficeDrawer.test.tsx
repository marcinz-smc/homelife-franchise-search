import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Office } from "../../types";
import { OfficeDrawer } from "./OfficeDrawer";

const office: Office = {
  id: "1",
  externalId: "84719",
  slug: "homelife-247",
  name: "HomeLife 247 Realty Inc., Brokerage*",
  brokerageGroup: "HomeLife 247 Realty Inc.",
  groupKey: "homelife 247",
  broker: "Jane Broker",
  street: "2000 Argentia Rd",
  city: "Mississauga",
  province: "Ontario",
  postal: "L5N 1V9",
  address: "2000 Argentia Rd, Mississauga, Ontario, L5N 1V9",
  phone: "905.858.1999",
  fax: "905-858-3117",
  email: "office@homelife247realty.com",
  language: "English, Hindi",
  website: "www.homelife247realty.com",
  socials: [{ label: "youtube", url: "https://youtube.com/example" }],
  specialization: "Residential",
  mlsId: "372300",
  tollFree: "",
  primaryContactName: "Jane Broker",
  aboutParagraphs: ["A long-standing Mississauga desk."],
  listedOnCorporateWebsite: true,
  country: "Canada",
  photo: null,
  isPlaceholderLogo: false,
  lat: 43.6,
  lng: -79.7,
  matchStatus: "matched",
  matchNote: "",
  municipalityId: "abc",
};

test("renders office fields and closes", async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(<OfficeDrawer office={office} onClose={onClose} />);

  expect(screen.getByRole("heading", { name: office.name })).toBeInTheDocument();
  expect(screen.getByText("905.858.1999")).toBeInTheDocument();
  expect(screen.getByText("office@homelife247realty.com")).toBeInTheDocument();
  expect(screen.getByText("372300")).toBeInTheDocument();
  expect(screen.getByText("Listed on HomeLife site")).toBeInTheDocument();
  expect(screen.getByText("youtube")).toHaveAttribute("href", "https://youtube.com/example");

  await user.click(screen.getByRole("button", { name: /close/i }));
  expect(onClose).toHaveBeenCalled();
});

test("renders nothing without a selected office", () => {
  const { container } = render(<OfficeDrawer office={null} onClose={() => undefined} />);
  expect(container).toBeEmptyDOMElement();
});
