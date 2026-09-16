import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AdminPage } from "./AdminPage";

const importOffices = vi.fn();
const importMunicipalities = vi.fn();
const importLeads = vi.fn();

vi.mock("../../api/client", () => ({
  api: {
    importJobs: vi.fn().mockResolvedValue({ jobs: [] }),
    unresolvedGeocodes: vi.fn().mockResolvedValue({ items: [] }),
    unmatched: vi.fn().mockResolvedValue({ offices: [] }),
    importOffices: (...args: unknown[]) => importOffices(...args),
    importMunicipalities: (...args: unknown[]) => importMunicipalities(...args),
    importReco: vi.fn(),
    importLeads: (...args: unknown[]) => importLeads(...args),
    retryGeocodes: vi.fn(),
  },
}));

test("shows import result after a confirmed office upload", async () => {
  const user = userEvent.setup();
  importOffices.mockResolvedValue({
    job: {
      summary: { inserted: 12, updated: 4, unmatched: 1, invalid: 0, skipped: 0, geocoded: 0, geocodeFailed: 0 },
    },
  });

  render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>,
  );

  const file = new File([JSON.stringify([])], "offices.json", { type: "application/json" });
  const inputs = document.querySelectorAll('input[type="file"]');
  await user.upload(inputs[0] as HTMLInputElement, file);
  await user.click(screen.getByLabelText(/replace office records/i));
  await user.click(screen.getByRole("button", { name: /import offices/i }));

  await waitFor(() => {
    expect(screen.getByTestId("import-result")).toHaveTextContent("12 inserted");
  });
});

test("shows import result after a confirmed lead score upload", async () => {
  const user = userEvent.setup();
  importLeads.mockResolvedValue({
    job: {
      summary: { inserted: 0, updated: 3, unmatched: 1, invalid: 0, skipped: 0, geocoded: 0, geocodeFailed: 0 },
    },
  });

  render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>,
  );

  const file = new File([JSON.stringify({ registration_number: "R200", overall_score: 80 })], "lead.json", {
    type: "application/json",
  });
  const inputs = document.querySelectorAll('input[type="file"]');
  await user.upload(inputs[3] as HTMLInputElement, file);
  await user.click(screen.getByLabelText(/attach these lead scores/i));
  await user.click(screen.getByRole("button", { name: /import lead scores/i }));

  await waitFor(() => {
    expect(screen.getByTestId("import-result")).toHaveTextContent("3 updated");
  });
});
