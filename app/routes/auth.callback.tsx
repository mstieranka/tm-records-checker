import type { Route } from "./+types/auth.callback";
import { authenticateOAuth } from "~/auth/authenticator.server";

export async function loader({ request }: Route.LoaderArgs) {
  return authenticateOAuth(request, "github");
}
