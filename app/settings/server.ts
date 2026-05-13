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
    cache = new Map(rows.map((r) => [r.id, r.value]));
  })().finally(() => {
    loading = null;
  });
  await loading;
}

export function invalidateSettings() {
  cache = null;
}

export async function getSetting<Id extends SettingId>(id: Id): Promise<SettingValue<Id> | undefined> {
  await ensureCache();
  const def = getDef(id);
  const raw = cache!.has(id) ? cache!.get(id) : (def as { default?: unknown }).default;
  const decoded = def.kind === "secret" && typeof raw === "string" ? decrypt(raw) : raw;
  const parsed = def.schema.safeParse(decoded);
  return (parsed.success ? parsed.data : (def as { default?: unknown }).default) as SettingValue<Id> | undefined;
}

export async function getAllSettings(): Promise<Record<SettingId, unknown>> {
  await ensureCache();
  return Object.fromEntries(
    SETTINGS.map((s) => [s.id, cache!.has(s.id) ? cache!.get(s.id) : (s as { default?: unknown }).default]),
  ) as Record<SettingId, unknown>;
}

export async function getAllSettingsForUI(): Promise<Record<SettingId, unknown>> {
  const all = await getAllSettings();
  return Object.fromEntries(
    SETTINGS.map((s) => [
      s.id,
      s.kind === "secret" ? { isSet: Boolean(all[s.id]) } : all[s.id],
    ]),
  ) as Record<SettingId, unknown>;
}

export async function setSetting<Id extends SettingId>(id: Id, value: unknown) {
  const def = getDef(id);
  const parsed = def.schema.parse(value);
  const toStore = def.kind === "secret" ? encrypt(parsed as string) : parsed;
  await db
    .insert(settingsTable)
    .values({ id, value: toStore as string })
    .onConflictDoUpdate({
      target: settingsTable.id,
      set: { value: toStore as string, updatedAt: new Date() },
    });
  invalidateSettings();
}

/** Returns true when every setup-required setting has a value stored in the database. */
export async function isSetupComplete(): Promise<boolean> {
  await ensureCache();
  return SETTINGS.filter((s) => "setup" in s && s.setup).every((s) => cache!.has(s.id));
}
