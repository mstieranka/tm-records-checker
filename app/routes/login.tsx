import { data, redirect } from "react-router";
import { Form, useLoaderData } from "react-router";
import { IconBrandGithub } from "@tabler/icons-react";
import type { Route } from "./+types/login";
import { AUTH_ERROR_KEY, commitSession, getSession, getUser } from "~/auth/session.server";
import { isSetupComplete } from "~/settings/server";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export const meta: Route.MetaFunction = () => {
  return [{ title: "Login | TM Records Checker" }];
};

export default function Screen() {
  const loaderData = useLoaderData<typeof loader>();

  return (
    <main className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use your GitHub account to access TM Records Checker.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {loaderData?.error && (
            <>
              <Alert variant="destructive">
                <AlertDescription>{loaderData.error.message}</AlertDescription>
              </Alert>
              <Form action="/auth/logout" method="post">
                <Button type="submit" variant="outline" className="w-full">
                  Logout & try again
                </Button>
              </Form>
            </>
          )}
          {!loaderData?.error && (
            <Form action="/auth/github" method="post">
              <Button type="submit" className="w-full">
                <IconBrandGithub />
                Login with GitHub
              </Button>
            </Form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export async function loader({ request }: Route.LoaderArgs) {
  if (!(await isSetupComplete())) {
    throw redirect("/setup");
  }
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
          "Set-Cookie": await commitSession(session),
        },
      },
    );
  }

  return null;
}
