import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.PUBLIC_SITE_URL ?? 'https://startup-perks.com';

// https://astro.build/config
export default defineConfig({
  site,
  integrations: [sitemap()],
});
