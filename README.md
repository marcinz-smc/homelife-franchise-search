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
| script          | Deployment and build scripts                |

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