# hlfs-1pass

1Password integration / secrets management.

Keep live values in 1Password. Copy them into a root `.env` for local development. Never commit `.env`.

| Env var | Used by | Notes |
| --- | --- | --- |
| `MONGODB_URI` | hlfs-lambda → hlfs-mongo | Mongo connection string |
| `JWT_SECRET` | hlfs-lambda | Cookie auth signing key |
| `ADMIN_EMAIL` | hlfs-lambda | Seeded admin login |
| `ADMIN_PASSWORD` | hlfs-lambda | Seeded admin password |
| `MAPBOX_TOKEN` | hlfs-lambda | Server geocoding |
| `VITE_MAPBOX_TOKEN` | hlfs-admin | Public `pk.` browser map token |
| `INGEST_API_KEY` | hlfs-lambda | Franchise-scan ingest header |
| `CLIENT_ORIGIN` | hlfs-lambda | CORS origin for the admin UI |
| `COOKIE_SECURE` | hlfs-lambda | `true` behind HTTPS |
| `OFFICES_JSON_PATH` | hlfs-lambda / hlfs-scrape | Optional local import |
| `CITIES_CSV_PATH` | hlfs-lambda | Optional local import |
| `RECO_CSV_PATH` | hlfs-lambda / hlfs-scrape | Optional local import |
| `AGENTS_JSON_PATH` | hlfs-scrape | Optional website agent dump |
| `RECO_REGISTRANTS_CSV_PATH` | hlfs-scrape | Optional RECO people dump |
