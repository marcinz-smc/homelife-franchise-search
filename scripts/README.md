# scripts

Deployment and build scripts for the franchise-search workspaces.

| Script | Command |
| --- | --- |
| `build.mjs` | `npm run build` — builds `hlfs-mongo`, `hlfs-lambda`, `hlfs-admin`, then `hlfs-cloudfront` |
| `deploy-preview.mjs` | `npm run deploy:preview` |
| `deploy-production.mjs` | `npm run deploy:production` |
| `deploy-lambda-preview.mjs` | `npm run deploy:lambda:preview` |
| `deploy-lambda-production.mjs` | `npm run deploy:lambda:production` |
| `deploy-cloudfront-preview.mjs` | `npm run deploy:cloudfront:preview` |
| `deploy-cloudfront-production.mjs` | `npm run deploy:cloudfront:production` |
| `deploy-s3-preview.mjs` | `npm run deploy:s3:preview` |
| `deploy-s3-production.mjs` | `npm run deploy:s3:production` |
| `deploy-ec2-preview.mjs` | `npm run deploy:ec2:preview` |
| `deploy-ec2-production.mjs` | `npm run deploy:ec2:production` |

Deploy scripts stay as no-ops until those environments are released. Do not ship unfinished deploy code.
