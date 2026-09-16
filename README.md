## ROR

- Each folder is an atomic feature.
- Do not place shared or unrelated code into `app-vite`.
- Keep features aligned to their domain boundaries.
- Prioritize clean, consistent organization.
- Never release unfinished code.
- Releases must pass `npm run build`.

## Folders

| Folder          | Description                                 |
|-----------------|---------------------------------------------|
| hlfs-admin      | Admin UI / management console               |
| hlfs-cloudfront | CloudFront distribution configuration       |
| hlfs-lambda     | Serverless Lambda functions                 |
| hlfs-mongo      | MongoDB schemas, seed data and access layer |
| hlfs-1pass      | 1Password integration / secrets management  |
| hlfs-scrape     | Franchise / RECO compare and scrape jobs    |
| scripts         | Deployment and build scripts                |

## Commands

Scripts are defined in `package.json`:

| Command                              | Description                     |
|--------------------------------------|---------------------------------|
| npm run build                        | Build all workspaces            |
| npm run deploy:preview               | Deploy preview environment      |
| npm run deploy:production            | Deploy production environment   |
| npm run deploy:lambda:preview        | Deploy Lambda to preview        |
| npm run deploy:lambda:production     | Deploy Lambda to production     |
| npm run deploy:cloudfront:preview    | Deploy CloudFront to preview    |
| npm run deploy:cloudfront:production | Deploy CloudFront to production |
| npm run deploy:s3:preview            | Deploy S3 assets to preview     |
| npm run deploy:s3:production         | Deploy S3 assets to production  |
| npm run deploy:ec2:preview           | Deploy EC2 to preview           |
| npm run deploy:ec2:production        | Deploy EC2 to production        |

## Coverage Atlas (local)

This workspace also runs the HomeLife Coverage Atlas: Mapbox plotting, RECO import, and franchise-scan ingest.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Admin UI + API together |
| `npm start` | Serve the API (and the admin build in production) |
| `npm test` | Workspace tests |
| `npm run seed:admin` | Create the env-configured admin if missing |
| `npm run import:local` | Import the configured JSON / CSV paths |
| `npm run import:reco` | Import the RECO brokerage CSV |
| `npm run geocode:reco` | Move RECO pins onto street addresses |
| `npm run scrape:silvercity` | Compare HomeLife SilverCity across RECO and website dumps |

### Setup

```bash
copy .env.example .env
npm install
npm run seed:admin
npm run dev
```

- App: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:4000](http://localhost:4000)

Vite proxies `/api` to Express. Secrets live in 1Password; see `hlfs-1pass/README.md`. Never commit `.env`.

### Production notes

- Set `NODE_ENV=production` and `COOKIE_SECURE=true` behind HTTPS
- Run `npm run build`, then `npm start` so Express serves `hlfs-admin/dist`
- The server-side Mapbox token is only used for geocoding and is never sent to the browser
