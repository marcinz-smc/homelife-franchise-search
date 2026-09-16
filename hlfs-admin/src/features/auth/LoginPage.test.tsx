import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "./LoginPage";

const login = vi.fn();

vi.mock("./AuthContext", () => ({
  useAuth: () => ({ login, user: null, loading: false, logout: vi.fn() }),
}));

test("submits credentials", async () => {
  const user = userEvent.setup();
  login.mockResolvedValue(undefined);
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );

  await user.type(screen.getByLabelText(/email/i), "admin@homelife.local");
  await user.type(screen.getByLabelText(/password/i), "secret-pass");
  await user.click(screen.getByRole("button", { name: /enter the atlas/i }));

  expect(login).toHaveBeenCalledWith("admin@homelife.local", "secret-pass");
});
