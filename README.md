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

- An Astro integration in `astro.config.mjs` regenerates `functions/go/_map.ts` on every build. It maps every active perk id to its `applyUrl`, so adding a perk makes it trackable automatically.
- `functions/go/[slug].ts` is a Cloudflare Pages Function: it resolves the target URL, records the click, and responds with a `302` redirect. Unknown slugs redirect to the homepage.
- Clicks are counted in a Cloudflare KV namespace. The write runs through `waitUntil`, so redirects are never delayed by it.
- Locally (`bun run dev`, `wrangler pages dev`), the function works without the KV binding: redirects work and counting is simply skipped.

To enable counting in production, create and bind a KV namespace once:

```bash
bunx wrangler pages project list
bunx wrangler kv namespace create TRACKING_KV
```

Then in the Cloudflare Pages dashboard: your project -> Settings -> Functions -> KV namespace bindings -> add `TRACKING_KV` pointing at the new namespace, and redeploy.

To read click counts, use the dashboard (Storage & Databases -> KV -> the namespace) or:

```bash
bunx wrangler kv key get "go:shor-payroll" --namespace-id=<NAMESPACE_ID>
```

Counts are stored one key per perk (`go:<perk-id>`) and are not exposed on the public site.

Note: this uses Pages Functions, so it applies to Cloudflare Pages deployments. Serving `dist/` as a plain Worker with static assets (`wrangler.jsonc`) will not include the redirect route.

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
├── functions/go/             # Cloudflare Pages Function for outbound redirects
│   └── _map.ts               # Generated at build time (gitignored)
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
