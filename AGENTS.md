# AGENTS.md

Repository-level instructions for AI coding agents working on StartupPerks.

## Project intent

- Open-source directory of startup credits/perks.
- Astro + Bun stack.
- Content-first workflow via markdown files in `src/content/perks/`.

## Core commands

- Install: `bun install`
- Dev: `bun run dev`
- Validate/build: `bun run check`
- Production build: `bun run build`

## Implementation expectations

- Keep UI minimal, compact, and accessible.
- Preserve homepage search/filter/sort functionality.
- Preserve submit modal behavior and GitHub prefilled PR flow.
- Keep schemas and content validation aligned with `src/content.config.ts`.

## Content rules

- One perk per markdown file in `src/content/perks/`.
- Use official source URLs when possible.
- Prefer factual wording over promotional wording.
- Mark inactive offers with `isActive: false` instead of deleting history.

## Before finishing

- Run `bun run check`.
- Update docs if behavior, setup, or contribution flow changed.
