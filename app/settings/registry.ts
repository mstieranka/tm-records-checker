import { z } from "zod/v4";

type Base = {
  id: string;
  name: string;
  description: string;
  /** Present on settings required before authentication can work. Collected in the /setup UI. */
  setup?: true;
};

export type SettingDef =
  | (Base & {
      kind: "string";
      schema: z.ZodType<string | undefined>;
      default?: string;
      multiline?: boolean;
    })
  | (Base & {
      kind: "number";
      schema: z.ZodType<number | undefined>;
      default?: number;
      min?: number;
      max?: number;
      step?: number;
    })
  | (Base & { kind: "boolean"; schema: z.ZodType<boolean>; default?: boolean })
  | (Base & {
      kind: "enum";
      schema: z.ZodEnum<Record<string, string>>;
      options: { value: string; label: string }[];
      default?: string;
    })
  | (Base & { kind: "secret"; schema: z.ZodType<string | undefined> })
  | (Base & { kind: "array"; schema: z.ZodType<string[]>; default?: string[] });

export const SETTINGS = [
  {
    id: "base.url",
    name: "Base URL",
    description: "Public URL of this deployment. Used to build OAuth redirect URIs.",
    kind: "string",
    schema: z.url().optional(),
    setup: true,
  },
  {
    id: "api.tmx.userId",
    name: "TMX user ID",
    description: "Your TMX numeric user ID — used to fetch your uploaded maps.",
    kind: "number",
    schema: z.coerce.number().int().positive().optional(),
    setup: true,
    min: 1,
  },
  {
    id: "api.tmBasic.username",
    name: "TM basic auth username",
    description: "Username for the Trackmania dedicated server basic auth API.",
    kind: "string",
    schema: z.string().min(1).optional(),
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
    schema: z.string().min(1).optional(),
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
    schema: z.string().min(1).optional(),
    default: "tm-records-checker",
  },
  {
    id: "github.clientId",
    name: "GitHub OAuth client ID",
    description: "Client ID of the GitHub OAuth application used for login.",
    kind: "string",
    schema: z.string().min(1).optional(),
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
      (v) =>
        typeof v === "string"
          ? v
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean)
          : v,
      z.array(z.string().min(1)),
    ),
    default: [],
    setup: true,
  },
  {
    id: "notifications.ntfy.baseUrl",
    name: "ntfy base URL",
    description:
      "Base URL for the ntfy push notification server. Leave blank to disable notifications.",
    kind: "string",
    schema: z.url().optional(),
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
    schema: z.coerce.number().int().positive().optional(),
    default: 4096,
    min: 1,
  },
  {
    id: "notifications.emptyCountBeforeNotify",
    name: "Empty count before notify",
    description: "How many consecutive empty record checks before sending a notification.",
    kind: "number",
    schema: z.coerce.number().int().positive().optional(),
    default: 5,
    min: 1,
  },
] as const satisfies readonly SettingDef[];

export type SettingId = (typeof SETTINGS)[number]["id"];

export type SettingValue<Id extends SettingId> = z.infer<
  Extract<(typeof SETTINGS)[number], { id: Id }>["schema"]
>;

export function getDef<Id extends SettingId>(id: Id) {
  return SETTINGS.find((s) => s.id === id) as Extract<(typeof SETTINGS)[number], { id: Id }>;
}

export const SETUP_SETTINGS = SETTINGS.filter((s) => "setup" in s && s.setup);

/**
 * Conform treats dots in field names as nested object paths, which conflicts with
 * our dot-notation setting IDs. Convert to double-underscore for form field names.
 */
export function getFormKey(id: SettingId): string {
  return id.replaceAll(".", "__");
}

export function getSettingId(formKey: string): SettingId {
  return formKey.replaceAll("__", ".") as SettingId;
}

/** Flat Zod object schema for use with Conform's parseWithZod. Keys use __ separators. */
export const settingsFormSchema = z.object(
  Object.fromEntries(SETTINGS.map((s) => [getFormKey(s.id), s.schema])),
);

export const setupFormSchema = z.object(
  Object.fromEntries(SETUP_SETTINGS.map((s) => [getFormKey(s.id), s.schema])),
);
