# hlfs-mongo

MongoDB schemas, seed data, and the access layer.

## Boundary

- Mongoose models and `connectDb` / `disconnectDb` only.
- Callers pass the Mongo URI; this package does not load `.env`.
- Import parsers, HTTP, and UI stay in their own feature folders.

## Models

- `User`
- `Office`
- `Municipality`
- `RecoBrokerage`
- `ImportJob`

```bash
npm run build -w hlfs-mongo
```
