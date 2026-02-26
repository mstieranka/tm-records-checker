import { createRequestHandler } from '@react-router/express';
import express from 'express';
import cron from 'node-cron';
import { tasks } from '~/core/tasks.server.js';

// Run server

// notice that the result of `react-router build` is "just a module"
const build = await import('./build/server/index.js');

const app = express();
app.use(express.static('build/client'));

// and your app is "just a request handler"
app.all('*', createRequestHandler({ build }));

app.listen(3000, () => {
  console.log('App listening on http://localhost:3000');

  // Schedule tasks
  for (const task of tasks) {
    console.log(`Scheduling task ${task.name}`);
    cron.schedule(
      task.cron,
      () => {
        task.task();
      },
      {
        timezone: 'Europe/Prague',
        name: task.name,
        scheduled: true,
        runOnInit: false,
      }
    );
  }
});
