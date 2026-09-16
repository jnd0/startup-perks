import { REDIRECTS } from "../functions/go/_map";

export interface TrackingDatabase {
  prepare(query: string): {
    bind(...values: unknown[]): { run(): Promise<unknown> };
    all(): Promise<{ results?: unknown }>;
  };
}

export interface GoRedirectEnv {
  TRACKING_DB?: TrackingDatabase;
}

export interface GoRedirectContext {
  request: Request;
  env?: GoRedirectEnv;
  waitUntil?: (promise: Promise<unknown>) => void;
}

export const CLICKS_TABLE_DDL =
  "CREATE TABLE IF NOT EXISTS perk_clicks (slug TEXT PRIMARY KEY, clicks INTEGER NOT NULL)";

const CLICKS_UPSERT =
  "INSERT INTO perk_clicks (slug, clicks) VALUES (?1, 1) ON CONFLICT (slug) DO UPDATE SET clicks = clicks + 1";

export async function handleGoRedirect(context: GoRedirectContext): Promise<Response> {
  const { pathname, origin } = new URL(context.request.url);
  const slug = decodeURIComponent(pathname.replace(/^\/go\/?/, "").replace(/\/+$/, ""));
  const target = REDIRECTS[slug];
  if (!target || !/^https?:\/\//.test(target)) {
    return Response.redirect(new URL("/", origin).toString(), 302);
  }
  const db = context.env?.TRACKING_DB;
  if (db && context.waitUntil) {
    context.waitUntil(recordClick(db, slug));
  }
  return Response.redirect(target, 302);
}

async function recordClick(db: TrackingDatabase, slug: string): Promise<void> {
  try {
    await db.prepare(CLICKS_UPSERT).bind(slug).run();
  } catch (error) {
    console.error("click tracking failed", slug, error);
  }
}
