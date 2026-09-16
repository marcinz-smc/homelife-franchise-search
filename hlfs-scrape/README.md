# hlfs-scrape

Franchise / RECO compare and scrape jobs.

This folder is an atomic feature and is not a root npm workspace. Run jobs from the repo root.

## SilverCity compare

Joins RECO brokerages, RECO registrants, corporate `offices.json`, and `agents.json` for HomeLife SilverCity.

```bash
npm run scrape:silvercity
```

Outputs land at the repo root:

- `homelife-silvercity-locations.csv`
- `homelife-silvercity-people.csv`
