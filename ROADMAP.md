# Roadmap

Planned refactors in order of execution:

- [ ] 1. Move configuration from `config.json` into the database; add initial setup UI
- [ ] 2. Switch package manager from Bun to `pnpm`

## Moving configuration into the database

A reference for storing app-wide configuration in a database, with type-safe access, Zod validation, and dynamic UI rendering.

**Stack:** React Router Framework Mode · Drizzle ORM · Postgres · Zod · Conform

**Prerequisites:** several packages are not yet installed — run `bun add zod @conform-to/react @conform-to/zod` before starting.

---

### Overview

The design has four pieces:

1. **A key-value table in Postgres** — dumb storage, no per-setting columns.
2. **A typed registry** in TypeScript — the single source of truth for IDs, schemas, defaults, and UI hints.
3. **Server accessors** — typed `getSetting` / `setSetting` functions with an in-process cache.
4. **A polymorphic UI control** — switches on a `kind` discriminator to render the right input.

The registry drives everything: TypeScript types, runtime validation, and UI rendering. Adding a setting means adding one entry to the registry; no migration, no new column, no UI change.

Settings marked `setup: true` form a subset that must be present before authentication can work. These are collected in an unauthenticated `/setup` route shown to new deployments.

---

### 1. Database schema

Add the `settings` table alongside the existing tables in `app/models/schema.ts`:

```ts
// app/models/schema.ts  (add alongside existing tables)
import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const settings = pgTable("settings", {
  id:        text("id").primaryKey(),
  value:     jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

`jsonb` is the right column type — it stores whatever the schema produces (strings, numbers, booleans, arrays, nested objects) and supports indexing if needed later. No `type` column is required; the registry already knows the type for each ID.

After adding the table, regenerate and run migrations:

```
bun db:generate
bun db:migrate
```

---

### 2. Settings registry

```ts
// app/settings/registry.ts
import { z } from "zod";

type Base = {
  id: string;
  name: string;
  description: string;
  /** Present on settings required before authentication can work. Collected in the /setup UI. */
  setup?: true;
};

export type SettingDef =
  | (Base & { kind: "string";  schema: z.ZodType<string | undefined>;  default?: string; multiline?: boolean })
  | (Base & { kind: "number";  schema: z.ZodType<number | undefined>;  default?: number; min?: number; max?: number; step?: number })
  | (Base & { kind: "boolean"; schema: z.ZodType<boolean>;             default?: boolean })
  | (Base & { kind: "enum";    schema: z.ZodEnum<[string, ...string[]]>; options: { value: string; label: string }[]; default?: string })
  | (Base & { kind: "secret";  schema: z.ZodType<string | undefined> })
  | (Base & { kind: "array";   schema: z.ZodType<string[]>;            default?: string[] });

export const SETTINGS = [
  {
    id: "base.url",
    name: "Base URL",
    description: "Public URL of this deployment. Used to build OAuth redirect URIs.",
    kind: "string",
    schema: z.string().url(),
    setup: true,
  },
  {
    id: "api.tmx.userId",
    name: "TMX user ID",
    description: "Your TMX numeric user ID — used to fetch your uploaded maps.",
    kind: "number",
    schema: z.number().int().positive(),
    setup: true,
    min: 1,
  },
  {
    id: "api.tmBasic.username",
    name: "TM basic auth username",
    description: "Username for the Trackmania dedicated server basic auth API.",
    kind: "string",
    schema: z.string().min(1),
    setup: true,
  },
  {
    id: "api.tmBasic.password",
    name: "TM basic auth password",
    description: "Password for the Trackmania dedicated server basic auth API.",
    kind: "secret",
    schema: z.string().min(1).optional(),
    setup: true,
  },
  {
    id: "api.tmOauth.clientId",
    name: "TM OAuth client ID",
    description: "Trackmania OAuth application client ID.",
    kind: "string",
    schema: z.string().min(1),
    setup: true,
  },
  {
    id: "api.tmOauth.clientSecret",
    name: "TM OAuth client secret",
    description: "Trackmania OAuth application client secret.",
    kind: "secret",
    schema: z.string().min(1).optional(),
    setup: true,
  },
  {
    id: "api.userAgent",
    name: "User-Agent",
    description: "Value sent as the User-Agent header on outgoing API requests.",
    kind: "string",
    schema: z.string().min(1),
    default: "tm-records-checker",
  },
  {
    id: "github.clientId",
    name: "GitHub OAuth client ID",
    description: "Client ID of the GitHub OAuth application used for login.",
    kind: "string",
    schema: z.string().min(1),
    setup: true,
  },
  {
    id: "github.clientSecret",
    name: "GitHub OAuth client secret",
    description: "Client secret of the GitHub OAuth application used for login.",
    kind: "secret",
    schema: z.string().min(1).optional(),
    setup: true,
  },
  {
    id: "github.allowedUsers",
    name: "Allowed GitHub usernames",
    description: "One GitHub username per line. Only these users can log in.",
    kind: "array",
    schema: z.preprocess(
      v => typeof v === "string" ? v.split("\n").map(s => s.trim()).filter(Boolean) : v,
      z.array(z.string().min(1))
    ),
    default: [],
    setup: true,
  },
  {
    id: "notifications.ntfy.baseUrl",
    name: "ntfy base URL",
    description: "Base URL for the ntfy push notification server. Leave blank to disable notifications.",
    kind: "string",
    schema: z.string().url().optional(),
    default: "https://ntfy.sh",
  },
  {
    id: "notifications.ntfy.topic",
    name: "ntfy topic",
    description: "The ntfy topic to publish notifications to.",
    kind: "string",
    schema: z.string().min(1).optional(),
  },
  {
    id: "notifications.ntfy.lengthLimit",
    name: "ntfy message length limit",
    description: "Truncate notifications longer than this many characters.",
    kind: "number",
    schema: z.number().int().positive().optional(),
    default: 4096,
    min: 1,
  },
  {
    id: "notifications.emptyCountBeforeNotify",
    name: "Empty count before notify",
    description: "How many consecutive empty record checks before sending a notification.",
    kind: "number",
    schema: z.number().int().positive().optional(),
    default: 5,
    min: 1,
  },
] as const satisfies readonly SettingDef[];

export type SettingId = (typeof SETTINGS)[number]["id"];

export type SettingValue<Id extends SettingId> = z.infer<
  Extract<(typeof SETTINGS)[number], { id: Id }>["schema"]
>;

export function getDef<Id extends SettingId>(id: Id) {
  return SETTINGS.find(s => s.id === id) as Extract<(typeof SETTINGS)[number], { id: Id }>;
}

export const SETUP_SETTINGS = SETTINGS.filter(s => s.setup);

/**
 * Conform treats dots in field names as nested object paths, which conflicts with
 * our dot-notation setting IDs. Convert to double-underscore for form field names,
 * and back to dots for storage lookups.
 */
export function getFormKey(id: SettingId): string {
  return id.replaceAll(".", "__");
}

export function getSettingId(formKey: string): SettingId {
  return formKey.replaceAll("__", ".") as SettingId;
}

/** Flat Zod object schema for use with Conform's parseWithZod. Keys use __ separators. */
export const settingsFormSchema = z.object(
  Object.fromEntries(SETTINGS.map(s => [getFormKey(s.id), s.schema]))
);

export const setupFormSchema = z.object(
  Object.fromEntries(SETUP_SETTINGS.map(s => [getFormKey(s.id), s.schema]))
);
```

**Why `as const satisfies readonly SettingDef[]`:** the `as const` keeps literal types narrow so `SettingValue<"api.tmx.userId">` resolves to `number | undefined` rather than `unknown`. The `satisfies` clause keeps the registry checked against `SettingDef` without widening. Drop either keyword and the inference falls apart.

**Setup subset:** `SETUP_SETTINGS`, `setupFormSchema`, and `isSetupComplete` are the list, schema, and check used by the `/setup` route.

---

### 3. Server accessors

```ts
// app/settings/server.ts
import { db } from "~/models/database";
import { settings as settingsTable } from "~/models/schema";
import { SETTINGS, getDef, type SettingId, type SettingValue } from "./registry";
import { encrypt, decrypt } from "./crypto";

let cache: Map<string, unknown> | null = null;
let loading: Promise<void> | null = null;

async function ensureCache() {
  if (cache) return;
  loading ??= (async () => {
    const rows = await db.select().from(settingsTable);
    cache = new Map(rows.map(r => [r.id, r.value]));
  })().finally(() => { loading = null; });
  await loading;
}

export function invalidateSettings() { cache = null; }

export async function getSetting<Id extends SettingId>(id: Id): Promise<SettingValue<Id> | undefined> {
  await ensureCache();
  const def = getDef(id);
  const raw = cache!.has(id) ? cache!.get(id) : def.default;
  const decoded = def.kind === "secret" && typeof raw === "string" ? decrypt(raw) : raw;
  const parsed = def.schema.safeParse(decoded);
  return (parsed.success ? parsed.data : def.default) as SettingValue<Id> | undefined;
}

export async function getAllSettings(): Promise<Record<SettingId, unknown>> {
  await ensureCache();
  return Object.fromEntries(
    SETTINGS.map(s => [s.id, cache!.has(s.id) ? cache!.get(s.id) : s.default])
  ) as Record<SettingId, unknown>;
}

export async function getAllSettingsForUI(): Promise<Record<SettingId, unknown>> {
  const all = await getAllSettings();
  return Object.fromEntries(
    SETTINGS.map(s => [
      s.id,
      s.kind === "secret"
        ? { isSet: Boolean(all[s.id]) }
        : all[s.id],
    ])
  ) as Record<SettingId, unknown>;
}

export async function setSetting<Id extends SettingId>(id: Id, value: unknown) {
  const def = getDef(id);
  const parsed = def.schema.parse(value); // throws on invalid
  const toStore = def.kind === "secret" ? encrypt(parsed as string) : parsed;
  await db.insert(settingsTable)
    .values({ id, value: toStore as any })
    .onConflictDoUpdate({
      target: settingsTable.id,
      set: { value: toStore as any, updatedAt: new Date() },
    });
  invalidateSettings();
}

/** Returns true when every setup-required setting has a value stored in the database. */
export async function isSetupComplete(): Promise<boolean> {
  await ensureCache();
  return SETTINGS.filter(s => s.setup).every(s => cache!.has(s.id));
}
```

**Caching caveat:** the in-process cache assumes a single Node instance. When scaling horizontally, writes on instance A won't invalidate instance B. Two fixes when that day comes:

- Use Postgres `LISTEN/NOTIFY` on a `settings_changed` channel.
- Drop the cache — settings are tiny and reads stay fast without it.

For now the cache is worth the few lines; it can be removed later without changing any callers.

---

### 4. Form coercion

`coerce.ts` is not needed. Conform's `parseWithZod` reads `FormData` and coerces each field to the type declared in the Zod schema automatically — strings to numbers, present/absent checkboxes to booleans, etc.

The one exception is the `"array"` kind, where a textarea submits a single newline-joined string rather than a native array. A `z.preprocess` step in the registry schema handles this before Zod validates:

```ts
schema: z.preprocess(
  v => typeof v === "string" ? v.split("\n").map(s => s.trim()).filter(Boolean) : v,
  z.array(z.string().min(1))
),
```

This is already reflected in the `github.allowedUsers` entry in section 2. Any future `"array"` setting follows the same pattern.

---

### 5. Loader, action, and route component

The settings route replaces the current `app/routes/settings.tsx`. Auth is required here; setup-required settings are also editable from this page once the app is running.

`parseWithZod` validates and coerces the submitted `FormData` in one step. Its return value (`submission`) is passed back to the client as `lastResult`, which Conform uses to populate field errors without a page reload.

```ts
// app/routes/settings.tsx
import { Form, useLoaderData } from "react-router";
import { useForm, getFormProps } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import {
  SETTINGS, settingsFormSchema,
  getFormKey, getSettingId, getDef,
} from "~/settings/registry";
import { getAllSettingsForUI, setSetting } from "~/settings/server";
import { requireUser } from "~/auth/session.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return {
    registry: SETTINGS,
    values: await getAllSettingsForUI(),
    lastResult: null,
  };
}

export async function action({ request }: Route.ActionArgs) {
  await requireUser(request);
  const fd = await request.formData();
  const submission = parseWithZod(fd, { schema: settingsFormSchema });

  if (submission.status !== "success") {
    return submission.reply();
  }

  for (const [formKey, value] of Object.entries(submission.value)) {
    const id = getSettingId(formKey);
    // Secrets: empty submission means "don't change".
    if (getDef(id).kind === "secret" && (value === undefined || value === "")) continue;
    await setSetting(id, value);
  }

  return submission.reply();
}

export default function Settings() {
  const { registry, values, lastResult } = useLoaderData<typeof loader>();

  const [form, fields] = useForm({
    lastResult,
    defaultValue: Object.fromEntries(
      SETTINGS.map(s => {
        const v = values[s.id];
        // Secrets: form value is always empty; isSet is shown by the component separately.
        if (s.kind === "secret") return [getFormKey(s.id), ""];
        // Arrays: join to a newline-separated string for the textarea.
        if (s.kind === "array") return [getFormKey(s.id), (v as string[] ?? []).join("\n")];
        return [getFormKey(s.id), v];
      })
    ),
  });

  return (
    <Form method="post" {...getFormProps(form)}>
      {registry.map(def => {
        const meta = fields[getFormKey(def.id)];
        return (
          <div key={def.id}>
            <label htmlFor={meta.id}>{def.name}</label>
            <p>{def.description}</p>
            <SettingControl def={def} meta={meta} rawValue={values[def.id]} />
            {meta.errors && <p>{meta.errors}</p>}
          </div>
        );
      })}
      <button type="submit">Save</button>
    </Form>
  );
}
```

---

### 6. UI component

`SettingControl` receives Conform's `FieldMetadata` instead of a raw value. For native HTML controls, the Conform helpers (`getInputProps`, `getSelectProps`, `getTextareaProps`) spread the correct `name`, `id`, `defaultValue`, `aria-invalid`, and `aria-describedby` attributes automatically. `rawValue` is only needed for the `secret` case, where the component needs to know whether a value is already stored without receiving the plaintext.

```tsx
import {
  getInputProps, getSelectProps, getTextareaProps, useInputControl,
  type FieldMetadata,
} from "@conform-to/react";

function SettingControl({
  def,
  meta,
  rawValue,
}: {
  def: SettingDef;
  meta: FieldMetadata;
  rawValue: unknown;
}) {
  switch (def.kind) {
    case "string":
      return def.multiline
        ? <textarea {...getTextareaProps(meta)} />
        : <input {...getInputProps(meta, { type: "text" })} />;
    case "number":
      return <input {...getInputProps(meta, { type: "number" })}
                    min={def.min} max={def.max} step={def.step} />;
    case "boolean":
      return <input {...getInputProps(meta, { type: "checkbox" })} />;
    case "enum":
      return (
        <select {...getSelectProps(meta)}>
          {def.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case "secret": {
      const isSet = Boolean((rawValue as { isSet?: boolean } | null)?.isSet);
      return <SecretInput meta={meta} isSet={isSet} />;
    }
    case "array":
      return <ArrayInput meta={meta} />;
  }
}
```

**Adding a new `kind` backed by a native control** (e.g. `date`, `color`): add it to the `SettingDef` union and add a case that calls the appropriate Conform helper. No other changes needed.

**Adding a custom `kind` that needs local state** uses `useInputControl` instead of a hidden input. `useInputControl(meta)` returns a `{ value, change, blur, focus }` object that keeps the field in sync with Conform's form state. This replaces the hidden-input workaround entirely:

```tsx
// custom component — can call useState/useInputControl freely (not inside a switch case)
function ArrayInput({ meta }: { meta: FieldMetadata }) {
  const control = useInputControl(meta);
  const tags = typeof control.value === "string"
    ? control.value.split("\n").filter(Boolean)
    : [];

  function add(tag: string) {
    control.change([...tags, tag].join("\n"));
  }
  function remove(i: number) {
    control.change(tags.filter((_, idx) => idx !== i).join("\n"));
  }

  return (
    <div>
      {tags.map((t, i) => <Tag key={i} label={t} onRemove={() => remove(i)} />)}
      <AddTagInput onAdd={add} onFocus={control.focus} onBlur={control.blur} />
    </div>
  );
}

function SecretInput({ meta, isSet }: { meta: FieldMetadata; isSet: boolean }) {
  return (
    <input
      {...getInputProps(meta, { type: "password" })}
      placeholder={isSet ? "••••••••" : ""}
      autoComplete="new-password"
    />
  );
}
```

`useInputControl` registers a synthetic hidden input that Conform manages — the visual component calls `control.change(value)` and Conform handles serialisation into `FormData` on submit. No manually written hidden inputs anywhere.

---

### 7. Secret handling — encryption at rest

Encryption is not optional for this project: the config contains API passwords, OAuth client secrets, and access tokens. Generate a 32-byte key, put it in the environment, and AES-GCM-encrypt all `kind: "secret"` values before storing.

```
openssl rand -base64 32   # generate SETTINGS_ENC_KEY
```

Add `SETTINGS_ENC_KEY` to `.env` and `.env.example` (placeholder value only in the example).

```ts
// app/settings/crypto.ts
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const KEY = Buffer.from(process.env.SETTINGS_ENC_KEY!, "base64"); // must be 32 bytes

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decrypt(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv  = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct  = buf.subarray(28);
  const d = createDecipheriv("aes-256-gcm", KEY, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
}
```

The `getSetting` and `setSetting` accessors in section 3 already wire this in for `kind: "secret"`.

**Key rotation** when needed: read all secrets with the old key, re-encrypt with the new key, write them back. A one-off script.

**Startup validation:** on boot, attempt to decrypt a known stored secret and throw if it fails, to catch key mismatches before they cause silent data loss.

---

### 8. Initial setup UI

Settings marked `setup: true` are required before authentication can work (GitHub OAuth credentials, TM API credentials, base URL). The app exposes a public `/setup` route — no auth required — that collects only these settings.

**Route: `app/routes/setup.tsx`**

```ts
import { redirect, Form, useLoaderData } from "react-router";
import { useForm, getFormProps } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import {
  SETUP_SETTINGS, setupFormSchema,
  getFormKey, getSettingId, getDef,
} from "~/settings/registry";
import { getAllSettingsForUI, isSetupComplete, setSetting } from "~/settings/server";

export async function loader() {
  if (await isSetupComplete()) throw redirect("/");
  return {
    registry: SETUP_SETTINGS,
    values: await getAllSettingsForUI(),
    lastResult: null,
  };
}

export async function action({ request }: Route.ActionArgs) {
  if (await isSetupComplete()) throw redirect("/");
  const fd = await request.formData();
  const submission = parseWithZod(fd, { schema: setupFormSchema });

  if (submission.status !== "success") {
    return submission.reply();
  }

  for (const [formKey, value] of Object.entries(submission.value)) {
    const id = getSettingId(formKey);
    if (getDef(id).kind === "secret" && (value === undefined || value === "")) continue;
    await setSetting(id, value);
  }

  throw redirect("/");
}

export default function Setup() {
  const { registry, values, lastResult } = useLoaderData<typeof loader>();
  const [form, fields] = useForm({
    lastResult,
    defaultValue: Object.fromEntries(
      SETUP_SETTINGS.map(s => {
        const v = values[s.id];
        if (s.kind === "secret") return [getFormKey(s.id), ""];
        if (s.kind === "array") return [getFormKey(s.id), (v as string[] ?? []).join("\n")];
        return [getFormKey(s.id), v];
      })
    ),
  });

  return (
    <Form method="post" {...getFormProps(form)}>
      {registry.map(def => {
        const meta = fields[getFormKey(def.id)];
        return (
          <div key={def.id}>
            <label htmlFor={meta.id}>{def.name}</label>
            <p>{def.description}</p>
            <SettingControl def={def} meta={meta} rawValue={values[def.id]} />
            {meta.errors && <p>{meta.errors}</p>}
          </div>
        );
      })}
      <button type="submit">Complete setup</button>
    </Form>
  );
}
```

The loader redirects away immediately if setup is already complete, so the route is inert for normal use.

**Redirect unauthenticated users to `/setup` if setup is incomplete**

In `requireUser` (or a root loader), add a check before sending users to the login page:

```ts
if (!(await isSetupComplete())) {
  throw redirect("/setup");
}
```

This ensures a fresh deployment with an empty database surfaces `/setup` rather than a broken login page.

**GitHub OAuth strategy — lazy initialization**

`app/auth/authenticator.server.ts` currently instantiates `GitHubStrategy` at module load time using synchronous `getConfig()`. After migration, credentials live in the DB and `getSetting` is async, so the strategy must be built per-request instead:

```ts
// app/auth/authenticator.server.ts
import { Authenticator } from "remix-auth";
import { GitHubStrategy } from "remix-auth-github";
import { getSetting } from "~/settings/server";
import type { User } from "~/auth/types";

export async function getAuthenticator() {
  const [clientId, clientSecret, baseUrl, allowedUsers, userAgent] = await Promise.all([
    getSetting("github.clientId"),
    getSetting("github.clientSecret"),
    getSetting("base.url"),
    getSetting("github.allowedUsers"),
    getSetting("api.userAgent"),
  ]);

  const authenticator = new Authenticator<User>();
  authenticator.use(new GitHubStrategy<User>(
    {
      clientId: clientId ?? "",
      clientSecret: clientSecret ?? "",
      redirectURI: process.env.NODE_ENV === "development"
        ? "http://localhost:3000/auth/callback"
        : `${baseUrl}/auth/callback`,
    },
    async ({ tokens }) => {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokens.accessToken()}`,
          Accept: "application/vnd.github+json",
          "User-Agent": userAgent ?? "tm-records-checker",
        },
      });
      if (!res.ok) throw new Error(`GitHub user fetch failed: ${res.status}`);
      const profile = (await res.json()) as { login: string };
      if (!(allowedUsers ?? []).includes(profile.login)) {
        throw new Error('User not allowed, check the "allowedUsers" setting.');
      }
      return { username: profile.login };
    },
  ));
  return authenticator;
}
```

Because `getSetting` caches in-process, this is fast after the first call. Update `auth.callback.tsx` and `auth.logout.tsx` to call `getAuthenticator()` instead of importing the old `authenticator` constant.

---

### 9. Migration from `config.json`

On first deploy after this change, seed the existing `data/config.json` values into the database before removing the old config system. Add a one-off script:

```ts
// scripts/seed-settings.ts
import { setSetting } from "~/settings/server";
import config from "../data/config.json";

await setSetting("base.url",                             config.baseUrl);
await setSetting("api.tmx.userId",                       config.api.tmx.searchParams.userId);
await setSetting("api.tmBasic.username",                 config.api.tmBasic.username);
await setSetting("api.tmBasic.password",                 config.api.tmBasic.password);
await setSetting("api.tmOauth.clientId",                 config.api.tmOauth.clientId);
await setSetting("api.tmOauth.clientSecret",             config.api.tmOauth.clientSecret);
await setSetting("api.userAgent",                        config.api.userAgent);
await setSetting("github.clientId",                      config.githubAuth.clientId);
await setSetting("github.clientSecret",                  config.githubAuth.clientSecret);
await setSetting("github.allowedUsers",                  config.githubAuth.allowedUsers);
await setSetting("notifications.ntfy.baseUrl",           config.notifications.ntfy.baseUrl);
await setSetting("notifications.ntfy.topic",             config.notifications.ntfy.topic);
await setSetting("notifications.ntfy.lengthLimit",       config.notifications.ntfy.lengthLimit);
await setSetting("notifications.emptyCountBeforeNotify", config.notifications.emptyCountBeforeNotify);

console.log("Settings seeded.");
```

Secrets are encrypted by `setSetting` before being stored, so no plaintext ends up in the database.

Deployment order:

```
bun db:generate
bun db:migrate
SETTINGS_ENC_KEY=<key> bun scripts/seed-settings.ts
# verify app works, then remove data/config.json and app/core/config.server.ts
```

After confirming everything works, remove `data/config.json`, `app/core/config.server.ts`, and update all `getConfig()` callers in `app/core/tasks.server.ts` and `app/core/notifier.ts` to use `getSetting` directly.

---

### Gotchas

**Schema changes are migrations.** If you tighten a schema (e.g. `min(1)` → `min(5)`) or change a type, existing stored values may fail validation on read. The accessor falls back to the default in that case rather than throwing, so the app keeps working — but for renames or type changes, write a small backfill script as part of the same change.

There needs to be a migrations folder with scripts that can be run manually when deploying breaking changes. For non-breaking changes (e.g. adding a new setting), just add to the registry and deploy.

**The `as const satisfies` pattern is load-bearing.** Before building out the rest, verify that `getSetting("github.clientId")` returns `string | undefined`, not `unknown`. If it widens, you've lost a keyword somewhere.

**`SETTINGS_ENC_KEY` must be set before the first write.** If it's missing, the process will crash on first access of any secret. This is intentional — silent data loss is worse than a startup crash.

**Cache invalidation across processes.** The single-instance cache is a known tradeoff. Use `LISTEN/NOTIFY` or drop the cache when you scale out.

**Per-user / per-tenant settings.** Out of scope for this design — a separate table with a `user_id` column plus a context-aware accessor is the right move. The registry, types, and UI components can be reused as-is.
