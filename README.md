# StartupPerks

Open-source directory of startup credits, discounts, and eligibility requirements.

The goal is simple: help founders find real perks in one clean place, then let the community keep the list current through pull requests.

## Stack

- Astro (latest)
- Bun
- Astro Content Collections with schema validation

## Quick start

```bash
bun install
bun run dev
```

Open `http://localhost:4321`.

Optional environment variables:

```bash
PUBLIC_REPO_URL=https://github.com/your-org/startupperks
PUBLIC_REPO_BRANCH=main
PUBLIC_SUBMISSION_API_URL=https://startup-perks-submit-api.<your-subdomain>.workers.dev/api/submit-perk
PUBLIC_SITE_URL=https://startup-perks.com
```

The repo currently defaults to `https://github.com/jnd0/startup-perks` and `main` if these are not set. Set these vars only if you want to override those defaults.
If `PUBLIC_SUBMISSION_API_URL` is set, the submit form creates a PR automatically via the Worker API, so contributors do not need GitHub accounts.
`PUBLIC_SITE_URL` controls canonical URLs and sitemap domain during build.

## Deploy to Cloudflare Pages

### Dashboard setup

1. Cloudflare Dashboard -> Workers & Pages -> Create -> Pages -> Connect to Git.
2. Select this repository and the default branch.
3. Configure build settings:
   - Build command: `bun run build`
   - Build output directory: `dist`
   - Root directory: repository root
4. Set environment variables for Preview and Production:
    - `PUBLIC_REPO_URL=https://github.com/your-org/startupperks`
    - `PUBLIC_REPO_BRANCH=main`
    - `PUBLIC_SITE_URL=https://startup-perks.com`
5. Save and deploy.

### Wrangler CLI (optional)

```bash
bun add -D wrangler
bunx wrangler login
bun run build
bunx wrangler pages deploy dist --project-name startupperks
```

If you want to publish as a Worker with static assets instead of Pages, this repo includes `wrangler.jsonc`.

```bash
bun run build
bunx wrangler deploy
```

Notes:

- This project is static Astro output (`dist/`), so no Cloudflare adapter is required.
- Bun is only needed at build time. If your Pages image does not support Bun, use `npm run build` as fallback.
- Cloudflare Workers with static assets do not support runtime Worker variables; use build-time envs or rely on the repository defaults in this codebase.
- SEO assets are generated at build time: `dist/sitemap-index.xml` and `public/robots.txt`.

## Outbound click tracking

Outbound "Claim Offer" links on perk pages go through a private redirect route instead of linking directly to the provider:

```text
/perks/shor-payroll/  ->  Claim Offer  ->  /go/shor-payroll/  ->  302 to the perk's applyUrl
```

How it works:

- An Astro integration in `astro.config.mjs` regenerates `functions/go/_map.ts` on every build. It maps every active perk id to its `applyUrl`, so adding a perk makes it trackable automatically. Set `DISABLE_REDIRECTS=1` at build time to fall back to direct provider links.
- The production Worker (`worker/index.ts`, wired up by `wrangler.jsonc` via `main` + the `ASSETS` binding) serves static assets first and handles `/go/*` requests itself, so redirects work on the deployed Worker.
- `bun run dev` handles `/go/*` with a dev-server middleware injected by the same integration (redirect only, no counting).
- Cloudflare Pages deployments are also supported via `functions/go/[slug].ts`.
- Clicks are recorded with an atomic SQL upsert (`INSERT ... ON CONFLICT ... DO UPDATE SET clicks = clicks + 1`) against a D1 database, so concurrent clicks never overwrite each other. The write runs through `waitUntil`, so redirects are never delayed by it, and a missing/misconfigured table logs an error without breaking the redirect.

To enable counting in production, create a D1 database and bind it once:

```bash
bunx wrangler d1 create startupperks-stats
```

Run the table DDL (exported as `CLICKS_TABLE_DDL` in `shared/go-redirect.ts`):

```bash
bunx wrangler d1 execute startupperks-stats --command "CREATE TABLE IF NOT EXISTS perk_clicks (slug TEXT PRIMARY KEY, clicks INTEGER NOT NULL)" --remote
```

Then uncomment the `d1_databases` block in `wrangler.jsonc`, fill in the returned `database_id`, and redeploy.

To read click counts:

```bash
bunx wrangler d1 execute startupperks-stats --command "SELECT slug, clicks FROM perk_clicks ORDER BY clicks DESC" --remote
```

Counts live only in your D1 database and are not exposed on the public site.

Note: `astro preview` serves plain static output and does not handle `/go/*`; use `bun run dev` or a deployed Worker to exercise redirects.

## Automated submissions API

The repository includes a separate Worker API at `workers/submit-api/` for automatic PR creation.

Deploy it with:

```bash
bunx wrangler secret put GITHUB_TOKEN --config workers/submit-api/wrangler.toml
bunx wrangler deploy --config workers/submit-api/wrangler.toml
```

Then set `PUBLIC_SUBMISSION_API_URL` in your frontend deployment to:

```text
https://startup-perks-submit-api.<your-subdomain>.workers.dev/api/submit-perk
```

## Project structure

```text
/
├── src/
│   ├── content/perks/        # One markdown file per perk
│   ├── components/           # UI components
│   ├── layouts/              # Shared layout and metadata
│   └── pages/                # Astro routes
├── functions/go/             # Pages Function redirect entry (Pages deployments)
│   └── _map.ts               # Generated at build time (gitignored)
├── worker/                   # Production Worker entry: assets + /go/ redirects
├── shared/                   # Redirect logic shared by Worker and Pages Function
├── CONTRIBUTING.md
└── .github/
    ├── workflows/validate.yml
    └── PULL_REQUEST_TEMPLATE.md
```

## Add a new perk

1. Create a new file in `src/content/perks/`.
2. Use kebab-case filename, for example: `cloudflare-startups.md`.
3. Fill required frontmatter fields (`company`, `title`, `eligibility`, `applyUrl`, `sourceUrl`, etc).
4. Run the checks locally:

```bash
bun run check
```

5. Open a pull request.

For full details, see `CONTRIBUTING.md`.

You can also use the homepage `Submit perk` form to generate a valid perk file and open GitHub with prefilled content.

## Notes

- Perk values and eligibility frequently change.
- Every entry should include an official source URL.
- If data is uncertain, mark it clearly in the summary/body and avoid overconfident claims.

## Release checklist

- README, CONTRIBUTING, and AGENTS docs are accurate.
- `.gitignore` covers local/build/deploy artifacts.
- `bun run check` passes.
- License is added before publishing (recommended: Apache-2.0 for code and CC BY 4.0 for content).

## License

- Code in this repository is licensed under `Apache-2.0` (see `LICENSE`).
- Perk/content data in `src/content/perks/` is licensed under `CC BY 4.0` (see `LICENSE-CONTENT`).
