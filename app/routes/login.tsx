import { data, LoaderFunctionArgs, redirect } from "react-router";
import { Form, MetaFunction, useLoaderData } from "react-router";
import { AUTH_ERROR_KEY, commitSession, getSession, getUser } from "~/auth/session.server";

export const meta: MetaFunction = () => {
  return [{ title: "Login | TM Records Checker" }];
};

export default function Screen() {
  const loaderData = useLoaderData<{ error: any } | undefined>();

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

export async function loader({ request }: LoaderFunctionArgs) {
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
