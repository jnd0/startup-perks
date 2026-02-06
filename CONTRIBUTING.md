# Contributing to StartupPerks

Thanks for helping founders save time.

## How to add a perk

Preferred fast path: use the homepage `Submit perk` form to open a prefilled GitHub PR flow.

If the site is configured with `PUBLIC_SUBMISSION_API_URL`, the same form can create a draft PR automatically without requiring the submitter to have a GitHub account.

1. Create a file in `src/content/perks/` using kebab-case.
2. Add frontmatter using the template below.
3. Add a short body note with context or caveats.
4. Run `bun run check`.
5. Open a pull request.

## Required frontmatter template

```md
---
company: Example Company
title: Up to $50,000 in Example Cloud credits
summary: One sentence describing what the startup gets.
perkType: credit
amountDisplay: Up to $50,000 in credits
creditValueUsd: 50000
currency: USD
eligibility: Clear eligibility criteria in one sentence.
fundingStages:
  - Pre-seed
  - Seed
regions:
  - Global
categories:
  - Cloud
  - Infrastructure
applyUrl: https://example.com/startups
sourceUrl: https://example.com/startups
lastVerified: 2026-02-05
verified: false
isActive: true
---

Add caveats here, such as partner-only tracks, deadlines, or limited regions.
```

## Quality bar

- Use official links whenever possible.
- Keep language factual, concise, and non-promotional.
- Do not copy marketing text directly.
- If a perk is no longer active, set `isActive: false` instead of deleting history.

## Helpful commands

```bash
bun run dev
bun run check
bun run build
```

## License

- Code contributions are licensed under `Apache-2.0`.
- Perk/content contributions in `src/content/perks/` are licensed under `CC BY 4.0`.
