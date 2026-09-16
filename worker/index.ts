import { handleGoRedirect, type GoRedirectEnv } from "../shared/go-redirect";

interface Env extends GoRedirectEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env, ctx: { waitUntil(promise: Promise<unknown>): void }): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/go" || pathname.startsWith("/go/")) {
      return handleGoRedirect({ request, env, waitUntil: (p) => ctx.waitUntil(p) });
    }
    return env.ASSETS.fetch(request);
  },
};
