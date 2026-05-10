import { pollTask, tasks } from "../core/tasks.server";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import type { Route } from "./+types/tasks";
import { requireUser } from "~/auth/session.server";
import { ClockPlayIcon, ClockStopIcon, PlayIcon } from "~/assets/Icons";

export const meta: Route.MetaFunction = () => {
  return [{ title: "Tasks | TM Records Checker" }];
};

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  return {
    tasks: tasks.map(({ name, cron, polling }) => ({ name, cron, polling })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  await requireUser(request);

  const formData = await request.formData();
  const action = formData.get("action");
  const name = formData.get("name");

  console.log(formData);

  if (!name) {
    return { name: null, success: false };
  }
  const task = tasks.find((task) => task.name === name);
  if (!task) {
    return { name, success: false };
  }

  switch (action) {
    case "run": {
      console.log("Running task", name);
      try {
        await task.task();
      } catch (error) {
        console.error("Error running task", name, error);
        return { name, success: false };
      }
      return { name, success: true };
    }
    case "poll": {
      console.log("Toggling polling for task", name, "from", task.polling);
      if (!task.polling) {
        task.polling = true;
        pollTask(task, 1000 * 60 * 5);
      } else {
        task.polling = false;
      }

      return { name, success: true };
    }
    default:
      return { name: null, success: false };
  }
}

export default function Tasks() {
  const { tasks } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  return (
    <main className="container">
      <div className="flex">
        <h1 className="flex-grow">Tasks:</h1>
      </div>
      <div className="grid">
        {tasks.map(({ name, cron, polling }) => (
          <div key={name}>
            <Form method="POST" key={name}>
              <h4>{name}</h4>
              <p>
                <strong>Cron schedule:</strong> {cron}
              </p>
              <p>
                <strong>Polling manually:</strong> {polling ? "Yes" : "No"}
              </p>
              <input type="hidden" name="name" value={name} />
              <button type="submit" name="action" value="run" className="outline flex gap middle">
                <PlayIcon />
                Run once
              </button>
              <button type="submit" name="action" value="poll" className="outline flex gap middle">
                {polling ? (
                  <>
                    <ClockStopIcon /> Stop polling
                  </>
                ) : (
                  <>
                    <ClockPlayIcon /> Start polling (every 5 min)
                  </>
                )}
              </button>
            </Form>
            {navigation.formData?.get("name") === name ? (
              <p>Waiting for server response...</p>
            ) : (
              actionData?.name === name && (
                <p>
                  <strong>Success:</strong> {actionData.success ? "Yes" : "No"}
                </p>
              )
            )}
          </div>
        ))}
      </div>
      {actionData?.name === null && (
        <p>
          <strong>Error:</strong> Invalid task name
        </p>
      )}
    </main>
  );
}
