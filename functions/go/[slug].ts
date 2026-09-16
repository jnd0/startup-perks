import { REDIRECTS } from "./_map";

interface TrackingKV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

interface RedirectEnv {
  TRACKING_KV?: TrackingKV;
}

interface RedirectContext {
  request: Request;
  env?: RedirectEnv;
  waitUntil?: (promise: Promise<unknown>) => void;
}

export async function onRequest(context: RedirectContext): Promise<Response> {
  const { pathname, origin } = new URL(context.request.url);
  const slug = decodeURIComponent(pathname.replace(/^\/go\//, "").replace(/\/+$/, ""));
  const target = REDIRECTS[slug];
  if (!target || !/^https?:\/\//.test(target)) {
    return Response.redirect(new URL("/", origin).toString(), 302);
  }
  const kv = context.env?.TRACKING_KV;
  if (kv && context.waitUntil) {
    context.waitUntil(recordClick(kv, slug));
  }
  return Response.redirect(target, 302);
}

async function recordClick(kv: TrackingKV, slug: string): Promise<void> {
  try {
    const key = `go:${slug}`;
    const current = await kv.get(key);
    const count = current ? Number.parseInt(current, 10) : 0;
    await kv.put(key, String(Number.isFinite(count) ? count + 1 : 1));
  } catch {}
}
