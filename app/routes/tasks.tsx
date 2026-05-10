import { useFetcher, useLoaderData } from "react-router";
import { IconClockPlay, IconClockStop, IconLoader2, IconPlayerPlay } from "@tabler/icons-react";
import { toast } from "sonner";
import type { Route } from "./+types/tasks";
import { requireUser } from "~/auth/session.server";
import { pollTask, tasks } from "../core/tasks.server";
import { PageContainer } from "~/components/PageContainer";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

function formatCron(cron: string): string {
  const [, hour, , , dow] = cron.split(" ");

  const formatHour = (h: number): string => {
    if (h === 0) return "12am";
    if (h === 12) return "12pm";
    if (h < 12) return `${h}am`;
    return `${h - 12}pm`;
  };

  const hours = hour
    .split(",")
    .map(Number)
    .sort((a, b) => a - b);
  const timeStr = hours.map(formatHour).join(", ");

  if (dow === "*") return `Daily at ${timeStr}`;

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const days = dow
    .split(",")
    .map((d) => dayNames[Number(d)])
    .join(", ");
  return `Every ${days} at ${timeStr}`;
}

export const meta: Route.MetaFunction = () => {
  return [{ title: "Tasks | TM Records Checker" }];
};

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  return {
    tasks: tasks.map(({ name, cron, polling }) => ({
      name,
      cron: formatCron(cron),
      polling,
    })),
  };
}

enum ActionType {
  Run = "run",
  Poll = "poll",
}

export async function action({ request }: Route.ActionArgs) {
  await requireUser(request);

  const formData = await request.formData();
  const action = formData.get("action")?.toString() as ActionType | null;
  const name = formData.get("name")?.toString();

  if (!name) {
    return { name: null, action, success: false };
  }
  const task = tasks.find((task) => task.name === name);
  if (!task) {
    return { name, action, success: false };
  }

  switch (action) {
    case ActionType.Run: {
      try {
        await task.task();
      } catch (error) {
        console.error("Error running task", name, error);
        return { name, action, success: false };
      }
      return { name, action, success: true };
    }
    case ActionType.Poll: {
      if (!task.polling) {
        task.polling = true;
        pollTask(task, 1000 * 60 * 5);
      } else {
        task.polling = false;
      }
      return { name, action, success: true, polling: task.polling };
    }
    default:
      return { name: null, action, success: false };
  }
}

export async function clientAction({ serverAction }: Route.ClientActionArgs) {
  const result = await serverAction();

  if (!result.name) {
    return result;
  }

  if (result.action === ActionType.Run) {
    if (result.success) {
      toast.success(`Task "${result.name}" executed successfully.`);
    } else {
      toast.error(`Task "${result.name}" failed to execute.`);
    }
  } else if (result.action === ActionType.Poll) {
    if (result.success) {
      const polling = "polling" in result ? result.polling : false;
      toast.success(`Task "${result.name}" is now ${polling ? "polling" : "not polling"}.`);
    } else {
      toast.error(`Failed to change polling status for task "${result.name}".`);
    }
  }

  return result;
}

type TaskData = { name: string; cron: string; polling: boolean };

function useTaskFetcher() {
  const fetcher = useFetcher<typeof action>();
  const isPending = fetcher.state !== "idle";
  return { fetcher, isPending };
}

function TaskActionsForm({
  name,
  polling,
  fetcher,
  isPending,
  size,
}: TaskData & {
  fetcher: ReturnType<typeof useTaskFetcher>["fetcher"];
  isPending: boolean;
  size?: "default" | "sm";
}) {
  const activeAction = isPending ? fetcher.formData?.get("action")?.toString() : null;

  return (
    <fetcher.Form method="post" className="flex flex-wrap gap-2">
      <input type="hidden" name="name" value={name} />
      <Button
        type="submit"
        name="action"
        value={ActionType.Run}
        variant="outline"
        size={size}
        disabled={isPending}
      >
        {activeAction === ActionType.Run ? (
          <IconLoader2 className="animate-spin" />
        ) : (
          <IconPlayerPlay />
        )}
        Run once
      </Button>
      <Button
        type="submit"
        name="action"
        value={ActionType.Poll}
        variant="outline"
        size={size}
        disabled={isPending}
      >
        {activeAction === ActionType.Poll ? (
          <IconLoader2 className="animate-spin" />
        ) : polling ? (
          <IconClockStop />
        ) : (
          <IconClockPlay />
        )}
        {polling ? "Stop polling" : "Start polling (5m)"}
      </Button>
    </fetcher.Form>
  );
}

function TaskRow({ name, cron, polling }: TaskData) {
  const { fetcher, isPending } = useTaskFetcher();

  return (
    <TableRow>
      <TableCell className="font-medium">{name}</TableCell>
      <TableCell className="text-muted-foreground">{cron}</TableCell>
      <TableCell>
        <Badge variant={polling ? "default" : "outline"}>
          {polling ? "Polling" : "Not polling"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex justify-end">
          <TaskActionsForm
            name={name}
            cron={cron}
            polling={polling}
            fetcher={fetcher}
            isPending={isPending}
            size="sm"
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

function TaskCard({ name, cron, polling }: TaskData) {
  const { fetcher, isPending } = useTaskFetcher();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>{cron}</CardDescription>
        <CardAction>
          <Badge variant={polling ? "default" : "outline"}>
            {polling ? "Polling" : "Not polling"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter>
        <TaskActionsForm
          name={name}
          cron={cron}
          polling={polling}
          fetcher={fetcher}
          isPending={isPending}
        />
      </CardFooter>
    </Card>
  );
}

export default function Tasks() {
  const { tasks } = useLoaderData<typeof loader>();

  return (
    <PageContainer>
      <h1 className="font-heading text-2xl font-semibold mb-6">Tasks</h1>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Interval</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TaskRow key={task.name} {...task} />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-4 md:hidden">
        {tasks.map((task) => (
          <TaskCard key={task.name} {...task} />
        ))}
      </div>
    </PageContainer>
  );
}
