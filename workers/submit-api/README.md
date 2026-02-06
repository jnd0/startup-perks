# Submit API Worker

This Worker receives public perk submissions and opens draft pull requests automatically.

## Endpoints

- `POST /api/submit-perk`
- `POST /submit-perk`
- `POST /`

## Required secrets and vars

Set these in Cloudflare:

- `GITHUB_TOKEN` (secret): GitHub token with `repo` scope for `jnd0/startup-perks`
- `GITHUB_REPO`: `jnd0/startup-perks`
- `GITHUB_BASE_BRANCH`: `main`
- `ALLOWED_ORIGIN`: your site origin (for example `https://startup-perks.pages.dev`)

## Deploy

```bash
bunx wrangler login
bunx wrangler secret put GITHUB_TOKEN --config workers/submit-api/wrangler.toml
bunx wrangler deploy --config workers/submit-api/wrangler.toml
```

Then set `PUBLIC_SUBMISSION_API_URL` in the frontend deployment to your Worker URL plus `/api/submit-perk`.
