import type { LoaderFunctionArgs } from "react-router";
import { authenticateOAuth } from "~/auth/authenticator.server";

export async function loader({ request }: LoaderFunctionArgs) {
  return authenticateOAuth(request, "github");
}

export const action = loader;
