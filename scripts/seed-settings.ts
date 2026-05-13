/**
 * One-off migration script: seeds settings from data/config.json into the database.
 *
 * Run after migrating the DB schema:
 *   SETTINGS_ENC_KEY=<key> bun scripts/seed-settings.ts
 */
import { setSetting } from "~/settings/server";

const configPath = new URL("../data/config.json", import.meta.url);
const config = (await Bun.file(configPath.pathname).json()) as {
  baseUrl: string;
  api: {
    tmx: { searchParams: { userId: number } };
    tmBasic: { username: string; password: string };
    tmOauth: { clientId: string; clientSecret: string };
    userAgent: string;
  };
  githubAuth: {
    clientId: string;
    clientSecret: string;
    allowedUsers: string[];
  };
  notifications: {
    ntfy?: { baseUrl: string; topic: string; lengthLimit?: number };
    emptyCountBeforeNotify: number;
  };
};

await setSetting("base.url", config.baseUrl);
await setSetting("api.tmx.userId", config.api.tmx.searchParams.userId);
await setSetting("api.tmBasic.username", config.api.tmBasic.username);
await setSetting("api.tmBasic.password", config.api.tmBasic.password);
await setSetting("api.tmOauth.clientId", config.api.tmOauth.clientId);
await setSetting("api.tmOauth.clientSecret", config.api.tmOauth.clientSecret);
await setSetting("api.userAgent", config.api.userAgent);
await setSetting("github.clientId", config.githubAuth.clientId);
await setSetting("github.clientSecret", config.githubAuth.clientSecret);
await setSetting("github.allowedUsers", config.githubAuth.allowedUsers);

if (config.notifications.ntfy) {
  await setSetting("notifications.ntfy.baseUrl", config.notifications.ntfy.baseUrl);
  await setSetting("notifications.ntfy.topic", config.notifications.ntfy.topic);
  if (config.notifications.ntfy.lengthLimit !== undefined) {
    await setSetting("notifications.ntfy.lengthLimit", config.notifications.ntfy.lengthLimit);
  }
}
await setSetting(
  "notifications.emptyCountBeforeNotify",
  config.notifications.emptyCountBeforeNotify,
);

console.log("Settings seeded successfully.");
