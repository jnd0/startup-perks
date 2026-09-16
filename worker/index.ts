import { handleGoRedirect, type GoRedirectEnv } from "../shared/go-redirect";
import { handleDashboard } from "../shared/go-dashboard";

interface Env extends GoRedirectEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
  ADMIN_KEY?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: { waitUntil(promise: Promise<unknown>): void }): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/admin/dashboard" || pathname === "/admin/dashboard/") {
      return handleDashboard({ request, env });
    }
    if (pathname === "/go" || pathname.startsWith("/go/")) {
      return handleGoRedirect({ request, env, waitUntil: (p) => ctx.waitUntil(p) });
    }
    return env.ASSETS.fetch(request);
  },
};
