import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-950 text-parchment-200">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(201,132,74,0.16),_transparent_42%),radial-gradient(ellipse_at_bottom_left,_rgba(61,155,143,0.12),_transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-40 bg-topo bg-[size:22px_22px]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
        <div className="grid w-full gap-16 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rise">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.38em] text-copper-400">
              Internal field atlas
            </p>
            <h1 className="font-display text-6xl leading-[0.92] text-parchment-100 sm:text-7xl">
              Where HomeLife
              <span className="italic text-copper-400"> already stands</span>
              <br />
              and where it still can.
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-fog-300">
              A private coverage desk for Ontario municipalities and the rest of Canada.
              Plot every brokerage, read the heat, and keep hunting the empty towns.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="rise rounded-sm border border-copper-500/25 bg-ink-800/80 p-8 shadow-panel backdrop-blur-md"
            style={{ animationDelay: "120ms" }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-fog-400">
              Restricted desk
            </p>
            <h2 className="mt-2 font-display text-3xl text-parchment-100">Sign in</h2>
            <label className="mt-8 block text-sm text-fog-300">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-2 w-full border border-white/10 bg-ink-950 px-3 py-3 text-parchment-100 outline-none ring-copper-500/40 focus:ring-2"
              />
            </label>
            <label className="mt-5 block text-sm text-fog-300">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="mt-2 w-full border border-white/10 bg-ink-950 px-3 py-3 text-parchment-100 outline-none ring-copper-500/40 focus:ring-2"
              />
            </label>
            {error ? (
              <p role="alert" className="mt-4 text-sm text-gap-400">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="mt-8 w-full bg-copper-500 px-4 py-3 font-medium tracking-wide text-ink-950 transition hover:bg-copper-400 disabled:opacity-60"
            >
              {submitting ? "Opening ledger…" : "Enter the atlas"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
