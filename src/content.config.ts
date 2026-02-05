import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const perks = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/perks" }),
  schema: z.object({
    company: z.string().min(2),
    title: z.string().min(8),
    summary: z.string().min(24),
    perkType: z.enum(["credit", "discount", "trial", "mixed"]).default("credit"),
    amountDisplay: z.string().min(2),
    creditValueUsd: z.number().nonnegative().optional(),
    currency: z.string().min(3).max(3).default("USD"),
    eligibility: z.string().min(12),
    fundingStages: z.array(z.string().min(2)).default([]),
    regions: z.array(z.string().min(2)).default(["Global"]),
    categories: z.array(z.string().min(2)).min(1),
    applyUrl: z.string().url(),
    sourceUrl: z.string().url(),
    lastVerified: z.coerce.date(),
    expiresAt: z.coerce.date().optional(),
    verified: z.boolean().default(false),
    isActive: z.boolean().default(true),
  }),
});

export const collections = { perks };
