import { createRequestHandler } from '@remix-run/express';
import { ServerBuild, broadcastDevReady } from '@remix-run/node';
import express from 'express';
import cron from 'node-cron';
import { tasks } from '~/core/tasks.server.js';

// Run Remix server

// notice that the result of `remix build` is "just a module"
import * as built from './build/index.js';
const build = built as unknown as ServerBuild;

const app = express();
app.use(express.static('public'));

// and your app is "just a request handler"
app.all('*', createRequestHandler({ build }));

app.listen(3000, () => {
  if (process.env.NODE_ENV === 'development' && build.mode === 'development') {
    broadcastDevReady(build);
  }
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
