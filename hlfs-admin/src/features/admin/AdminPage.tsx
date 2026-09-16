import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import type { ImportJob, Office } from "../../types";

type Unresolved = {
  id: string;
  name: string;
  region: string;
  geocodeStatus: string;
  geocodePlaceName: string;
};

export function AdminPage() {
  const [officeFile, setOfficeFile] = useState<File | null>(null);
  const [cityFile, setCityFile] = useState<File | null>(null);
  const [recoFile, setRecoFile] = useState<File | null>(null);
  const [leadFiles, setLeadFiles] = useState<File[]>([]);
  const [confirmOffices, setConfirmOffices] = useState(false);
  const [confirmCities, setConfirmCities] = useState(false);
  const [confirmReco, setConfirmReco] = useState(false);
  const [confirmLeads, setConfirmLeads] = useState(false);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [unresolved, setUnresolved] = useState<Unresolved[]>([]);
  const [unmatched, setUnmatched] = useState<Pick<Office, "id" | "name" | "city" | "province" | "matchNote">[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [jobData, geoData, unmatchedData] = await Promise.all([
      api.importJobs(),
      api.unresolvedGeocodes(),
      api.unmatched(),
    ]);
    setJobs(jobData.jobs);
    setUnresolved(geoData.items);
    setUnmatched(unmatchedData.offices);
  }

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : "Unable to load admin desk"));
  }, []);

  async function submitOffices(event: FormEvent) {
    event.preventDefault();
    if (!officeFile) return;
    if (!confirmOffices) {
      setError("Confirm that you want to re-import offices.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api.importOffices(officeFile);
      setMessage(
        `Offices: ${result.job.summary.inserted} inserted, ${result.job.summary.updated} updated, ${result.job.summary.unmatched} unmatched.`,
      );
      setConfirmOffices(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Office import failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitCities(event: FormEvent) {
    event.preventDefault();
    if (!cityFile) return;
    if (!confirmCities) {
      setError("Confirm that you want to re-import municipalities. This will geocode missing cities.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api.importMunicipalities(cityFile);
      setMessage(
        `Municipalities: ${result.job.summary.inserted} inserted, ${result.job.summary.updated} updated, ${result.job.summary.geocoded} geocoded.`,
      );
      setConfirmCities(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Municipality import failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitReco(event: FormEvent) {
    event.preventDefault();
    if (!recoFile) return;
    if (!confirmReco) {
      setError("Confirm that you want to import RECO brokerages.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api.importReco(recoFile);
      setMessage(
        `RECO brokerages: ${result.job.summary.inserted} added, ${result.job.summary.skipped} already on the map, ${result.job.summary.invalid} invalid.`,
      );
      setConfirmReco(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "RECO import failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitLeads(event: FormEvent) {
    event.preventDefault();
    if (!leadFiles.length) return;
    if (!confirmLeads) {
      setError("Confirm that you want to attach lead scores to matching RECO desks.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api.importLeads(leadFiles);
      setMessage(
        `Lead scores: ${result.job.summary.updated} updated, ${result.job.summary.unmatched} unmatched, ${result.job.summary.invalid} invalid.`,
      );
      setConfirmLeads(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lead import failed");
    } finally {
      setBusy(false);
    }
  }

  async function retryGeocodes() {
    setBusy(true);
    try {
      const result = await api.retryGeocodes();
      setMessage(`Geocode retry: ${result.geocoded} ok, ${result.geocodeFailed} still unresolved.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Geocode retry failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 text-parchment-200">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-copper-400">Import desk</p>
          <h1 className="font-display text-3xl">Feed the atlas</h1>
        </div>
        <Link to="/" className="border border-copper-500/40 px-3 py-1.5 text-sm text-copper-400">
          Back to map
        </Link>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 md:grid-cols-2">
        <form onSubmit={submitOffices} className="border border-white/10 bg-ink-800/80 p-6 shadow-panel">
          <h2 className="font-display text-2xl">Office JSON</h2>
          <p className="mt-2 text-sm text-fog-400">
            Upload `offices.json`. Existing records upsert by office id, so a re-import is safe.
          </p>
          <input
            type="file"
            accept=".json,application/json"
            onChange={(event) => setOfficeFile(event.target.files?.[0] ?? null)}
            className="mt-4 block w-full text-sm"
          />
          <label className="mt-4 flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={confirmOffices}
              onChange={(event) => setConfirmOffices(event.target.checked)}
            />
            I want to import or replace office records
          </label>
          <button
            type="submit"
            disabled={busy || !officeFile}
            className="mt-5 bg-copper-500 px-4 py-2 text-ink-950 disabled:opacity-50"
          >
            Import offices
          </button>
        </form>

        <form onSubmit={submitCities} className="border border-white/10 bg-ink-800/80 p-6 shadow-panel">
          <h2 className="font-display text-2xl">Ontario cities CSV</h2>
          <p className="mt-2 text-sm text-fog-400">
            Upload `cities.csv`. Missing municipalities are geocoded once and cached in MongoDB.
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setCityFile(event.target.files?.[0] ?? null)}
            className="mt-4 block w-full text-sm"
          />
          <label className="mt-4 flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={confirmCities}
              onChange={(event) => setConfirmCities(event.target.checked)}
            />
            I want to import municipalities and geocode gaps
          </label>
          <button
            type="submit"
            disabled={busy || !cityFile}
            className="mt-5 bg-signal-500 px-4 py-2 text-ink-950 disabled:opacity-50"
          >
            Import municipalities
          </button>
        </form>

        <form onSubmit={submitReco} className="border border-white/10 bg-ink-800/80 p-6 shadow-panel">
          <h2 className="font-display text-2xl">RECO brokerages CSV</h2>
          <p className="mt-2 text-sm text-fog-400">
            Upload `all_brokerages.csv`. Desks already on the map stay put — scores, pins, and addresses are not
            overwritten. Only new registration numbers are added.
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setRecoFile(event.target.files?.[0] ?? null)}
            className="mt-4 block w-full text-sm"
          />
          <label className="mt-4 flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={confirmReco}
              onChange={(event) => setConfirmReco(event.target.checked)}
            />
            I want to add RECO desks that are not already on the map
          </label>
          <button
            type="submit"
            disabled={busy || !recoFile}
            className="mt-5 bg-steel-500 px-4 py-2 text-ink-950 disabled:opacity-50"
          >
            Import RECO brokerages
          </button>
        </form>

        <form onSubmit={submitLeads} className="border border-white/10 bg-ink-800/80 p-6 shadow-panel">
          <h2 className="font-display text-2xl">Lead score JSON</h2>
          <p className="mt-2 text-sm text-fog-400">
            Upload one or more franchise-scan JSON files. Matching is by RECO registration number; only the compact
            scores and contact brief are stored on that desk.
          </p>
          <input
            type="file"
            accept=".json,application/json"
            multiple
            onChange={(event) => setLeadFiles(Array.from(event.target.files ?? []))}
            className="mt-4 block w-full text-sm"
          />
          <label className="mt-4 flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={confirmLeads}
              onChange={(event) => setConfirmLeads(event.target.checked)}
            />
            I want to attach these lead scores to matching brokerages
          </label>
          <button
            type="submit"
            disabled={busy || !leadFiles.length}
            className="mt-5 bg-signal-500 px-4 py-2 text-ink-950 disabled:opacity-50"
          >
            Import lead scores
          </button>
        </form>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-16">
        {error ? <p className="mb-4 text-sm text-gap-400">{error}</p> : null}
        {message ? (
          <p data-testid="import-result" className="mb-4 text-sm text-signal-400">
            {message}
          </p>
        ) : null}

        <section className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl">Recent jobs</h2>
            <button
              type="button"
              onClick={retryGeocodes}
              disabled={busy}
              className="border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.16em]"
            >
              Retry failed geocodes
            </button>
          </div>
          <JobTable jobs={jobs} />
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="font-display text-2xl">Unresolved geocodes</h2>
            <ul className="mt-3 max-h-80 overflow-auto border border-white/10">
              {unresolved.map((item) => (
                <li key={item.id} className="border-b border-white/5 px-3 py-2 text-sm">
                  <span className="text-parchment-100">{item.name}</span>
                  <span className="ml-2 text-fog-400">{item.region}</span>
                  <span className="ml-2 font-mono text-[10px] uppercase text-gap-400">
                    {item.geocodeStatus}
                  </span>
                </li>
              ))}
              {!unresolved.length ? (
                <li className="px-3 py-4 text-sm text-fog-400">All geocodes resolved or none imported yet.</li>
              ) : null}
            </ul>
          </section>
          <section>
            <h2 className="font-display text-2xl">Unmatched office cities</h2>
            <ul className="mt-3 max-h-80 overflow-auto border border-white/10">
              {unmatched.map((item) => (
                <li key={item.id} className="border-b border-white/5 px-3 py-2 text-sm">
                  <span className="text-parchment-100">{item.city}</span>
                  <span className="ml-2 text-fog-400">{item.name}</span>
                  <span className="block text-xs text-gap-400">{item.matchNote}</span>
                </li>
              ))}
              {!unmatched.length ? (
                <li className="px-3 py-4 text-sm text-fog-400">No unmatched Ontario office cities.</li>
              ) : null}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function JobTable({ jobs }: { jobs: ImportJob[] }) {
  if (!jobs.length) {
    return <p className="text-sm text-fog-400">No imports yet.</p>;
  }
  return (
    <div className="overflow-auto border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-ink-800 font-mono text-[10px] uppercase tracking-[0.16em] text-fog-400">
          <tr>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">File</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Inserted</th>
            <th className="px-3 py-2">Updated</th>
            <th className="px-3 py-2">Invalid</th>
            <th className="px-3 py-2">Unmatched</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job._id} className="border-t border-white/5">
              <td className="px-3 py-2">{job.type}</td>
              <td className="px-3 py-2">{job.filename}</td>
              <td className="px-3 py-2">{job.status}</td>
              <td className="px-3 py-2">{job.summary.inserted}</td>
              <td className="px-3 py-2">{job.summary.updated}</td>
              <td className="px-3 py-2">{job.summary.invalid}</td>
              <td className="px-3 py-2">{job.summary.unmatched}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
