import { handleGoRedirect, type GoRedirectContext } from "../../shared/go-redirect";

export async function onRequest(context: GoRedirectContext): Promise<Response> {
  return handleGoRedirect(context);
}
