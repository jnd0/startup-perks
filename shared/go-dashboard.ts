import type { TrackingDatabase } from "./go-redirect";

export interface DashboardEnv {
  TRACKING_DB?: TrackingDatabase;
  ADMIN_KEY?: string;
}

export interface DashboardContext {
  request: Request;
  env?: DashboardEnv;
}

export interface ClickRow {
  slug: string;
  clicks: number;
}

const NO_STORE = "no-store";

export async function handleDashboard(context: DashboardContext): Promise<Response> {
  const url = new URL(context.request.url);
  const authorized = await isAuthorized(url.searchParams.get("key") ?? "", context.env?.ADMIN_KEY);
  if (!authorized) {
    return new Response("Unauthorized\n", {
      status: 401,
      headers: { "Cache-Control": NO_STORE, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const db = context.env?.TRACKING_DB;
  if (!db) {
    return htmlResponse(renderPage([], "Local dev mode: D1 binding not found"));
  }

  let rows: ClickRow[];
  try {
    rows = await fetchClicks(db);
  } catch {
    return htmlResponse(renderPage([], "Click tracking table not initialized yet (run CLICKS_TABLE_DDL)"));
  }

  if (url.searchParams.get("format") === "json") {
    return new Response(JSON.stringify({ totalClicks: sumClicks(rows), perks: rows }), {
      status: 200,
      headers: {
        "Cache-Control": NO_STORE,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  }

  return htmlResponse(renderPage(rows));
}

async function isAuthorized(provided: string, expected: string | undefined): Promise<boolean> {
  if (!expected || !provided) return false;
  return timingSafeEqualStrings(provided, expected);
}

async function timingSafeEqualStrings(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [digestA, digestB] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const bytesA = new Uint8Array(digestA);
  const bytesB = new Uint8Array(digestB);
  let diff = 0;
  for (let i = 0; i < bytesA.length; i += 1) {
    diff |= bytesA[i]! ^ bytesB[i]!;
  }
  return diff === 0;
}

async function fetchClicks(db: TrackingDatabase): Promise<ClickRow[]> {
  const result = await db.prepare("SELECT slug, clicks FROM perk_clicks ORDER BY clicks DESC").all();
  const results = Array.isArray(result.results) ? result.results : [];
  return results.map((row) => {
    const record = row as { slug?: unknown; clicks?: unknown };
    return {
      slug: typeof record.slug === "string" ? record.slug : "unknown",
      clicks: typeof record.clicks === "number" && Number.isFinite(record.clicks) ? record.clicks : 0,
    };
  });
}

function sumClicks(rows: ClickRow[]): number {
  return rows.reduce((total, row) => total + row.clicks, 0);
}

function htmlResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Cache-Control": NO_STORE,
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPage(rows: ClickRow[], notice?: string): string {
  const total = sumClicks(rows);
  const bodyRows = rows.length
    ? rows
        .map(
          (row) =>
            `<tr><td class="slug">${escapeHtml(row.slug)}</td><td class="clicks">${row.clicks.toLocaleString("en-US")}</td></tr>`,
        )
        .join("\n")
    : `<tr><td class="slug" colspan="2">${
        notice ? escapeHtml(notice) : "No clicks recorded yet"
      }</td></tr>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Perk Click Analytics | StartupPerks</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0b0e14;
    color: #e6e9ef;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    padding: 3rem 1.25rem;
  }
  main { width: 100%; max-width: 680px; }
  h1 { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; }
  .badge {
    display: inline-block;
    margin-top: 0.75rem;
    padding: 0.35rem 0.85rem;
    border: 1px solid #2a3140;
    border-radius: 999px;
    background: #131722;
    color: #9fb3c8;
    font-size: 0.85rem;
  }
  .badge strong { color: #e6e9ef; font-variant-numeric: tabular-nums; }
  table {
    width: 100%;
    margin-top: 1.75rem;
    border-collapse: collapse;
    border: 1px solid #2a3140;
    border-radius: 10px;
    overflow: hidden;
  }
  th, td { padding: 0.7rem 1rem; text-align: left; }
  th {
    background: #131722;
    color: #9fb3c8;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  th:last-child, td:last-child { text-align: right; }
  tbody tr { border-top: 1px solid #1d2330; }
  tbody tr:nth-child(even) { background: #0f131c; }
  td.slug {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.9rem;
    word-break: break-all;
  }
  td.clicks {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: #7ee2a8;
  }
  td[colspan] { color: #9fb3c8; font-style: italic; text-align: center; }
  .foot {
    margin-top: 1.5rem;
    color: #5d6b7e;
    font-size: 0.78rem;
    text-align: center;
  }
</style>
</head>
<body>
<main>
  <h1>Perk Click Analytics</h1>
  <div class="badge">Total clicks across all perks: <strong>${total.toLocaleString("en-US")}</strong></div>
  <table>
    <thead>
      <tr><th>Perk Slug</th><th>Total Clicks</th></tr>
    </thead>
    <tbody>
${bodyRows}
    </tbody>
  </table>
  <p class="foot">StartupPerks internal dashboard</p>
</main>
</body>
</html>
`;
}
