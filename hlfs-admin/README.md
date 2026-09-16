# hlfs-admin

Admin UI / management console for HomeLife franchise search.

This package owns the Coverage Atlas React app: login, map, import desk, and filter rails.

## Boundary

- Browser UI only. No Mongo schemas, no Express routes, no scrape jobs.
- Talks to the API through `/api` (Vite proxy in development).
- Do not place shared or unrelated code into `app-vite`.

## Commands

```bash
npm run dev -w hlfs-admin
npm run test -w hlfs-admin
npm run build -w hlfs-admin
```

The root `npm run build` includes this workspace.
