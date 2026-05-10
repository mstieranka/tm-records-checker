import { data, redirect } from "react-router";
import { Form, useLoaderData } from "react-router";
import type { Route } from "./+types/login";
import { AUTH_ERROR_KEY, commitSession, getSession, getUser } from "~/auth/session.server";

export const meta: Route.MetaFunction = () => {
  return [{ title: "Login | TM Records Checker" }];
};

export default function Screen() {
  const loaderData = useLoaderData<typeof loader>();

  return (
    <main className="container-fluid">
      {loaderData?.error ? (
        <p>{loaderData.error.message}</p>
      ) : (
        <Form action="/auth/github" method="post">
          <button>Login with GitHub</button>
        </Form>
      )}
    </main>
  );
}

export async function loader({ request }: Route.LoaderArgs) {
  if (await getUser(request)) {
    throw redirect("/");
  }

  let session = await getSession(request.headers.get("cookie"));
  let error = session.get(AUTH_ERROR_KEY);
  if (error) {
    return data(
      { error },
      {
        headers: {
          "Set-Cookie": await commitSession(session), // You must commit the session whenever you read a flash
        },
      },
    );
  }

  return null;
}
