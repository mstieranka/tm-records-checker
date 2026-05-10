import cron from "node-cron";
import { tasks } from "~/core/tasks.server.js";

for (const task of tasks) {
  console.log(`Scheduling task ${task.name}`);
  cron.schedule(
    task.cron,
    () => {
      task.task();
    },
    {
      timezone: "Europe/Prague",
      name: task.name,
      scheduled: true,
      runOnInit: false,
    },
  );
}
