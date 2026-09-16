# hlfs-lambda

Serverless Lambda functions and the local Express API that will wrap them.

This package owns HTTP routes, auth, ingest, import jobs, geocoding, and coverage queries. Persistence goes through `hlfs-mongo`.

## Boundary

- API and job orchestration only.
- Schemas and `connectDb` live in `hlfs-mongo`.
- The React console lives in `hlfs-admin`.
- One-off RECO vs website compares live in `hlfs-scrape`.

## Local runtime

Until the Lambda adapter is released, `npm run dev -w hlfs-lambda` starts Express on `PORT` (default 4000).

```bash
npm run test -w hlfs-lambda
npm run build -w hlfs-lambda
```
