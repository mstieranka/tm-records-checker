import { Form, useLoaderData, useNavigation } from "react-router";
import { useForm, getFormProps, getInputProps, getTextareaProps, type FieldMetadata } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { IconDeviceFloppy, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";
import type { Route } from "./+types/settings";
import { SETTINGS, settingsFormSchema, getFormKey, getSettingId, getDef, type SettingDef } from "~/settings/registry";
import { getAllSettingsForUI, setSetting } from "~/settings/server";
import { requireUser } from "~/auth/session.server";
import { PageContainer } from "~/components/PageContainer";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

export const meta: Route.MetaFunction = () => {
  return [{ title: "Settings | TM Records Checker" }];
};

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return {
    values: await getAllSettingsForUI(),
    lastResult: null,
  };
}

export async function action({ request }: Route.ActionArgs) {
  await requireUser(request);
  const fd = await request.formData();
  const submission = parseWithZod(fd as unknown as FormData, { schema: settingsFormSchema });

  if (submission.status !== "success") {
    return submission.reply();
  }

  for (const [formKey, value] of Object.entries(submission.value)) {
    const id = getSettingId(formKey);
    if (getDef(id).kind === "secret" && (value === undefined || value === "")) continue;
    await setSetting(id, value);
  }

  return submission.reply();
}

export async function clientAction({ serverAction }: Route.ClientActionArgs) {
  const result = await serverAction();
  if (result && "status" in result && result.status === "success") {
    toast.success("Settings saved.");
  } else if (result && "status" in result && result.status !== "success") {
    toast.error("Please fix the errors below.");
  }
  return result;
}

const SECTIONS = [
  { title: "General", ids: ["base.url", "api.userAgent"] },
  {
    title: "Trackmania",
    ids: [
      "api.tmx.userId",
      "api.tmBasic.username",
      "api.tmBasic.password",
      "api.tmOauth.clientId",
      "api.tmOauth.clientSecret",
    ],
  },
  { title: "GitHub", ids: ["github.clientId", "github.clientSecret", "github.allowedUsers"] },
  {
    title: "Notifications",
    ids: [
      "notifications.ntfy.baseUrl",
      "notifications.ntfy.topic",
      "notifications.ntfy.lengthLimit",
      "notifications.emptyCountBeforeNotify",
    ],
  },
] as const;

export default function Settings() {
  const { values, lastResult } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isPending = navigation.state === "submitting";

  const [form, fields] = useForm({
    lastResult,
    defaultValue: Object.fromEntries(
      SETTINGS.map((s) => {
        const v = values[s.id];
        if (s.kind === "secret") return [getFormKey(s.id), ""];
        if (s.kind === "array") return [getFormKey(s.id), ((v as string[] | undefined) ?? []).join("\n")];
        return [getFormKey(s.id), v];
      }),
    ),
  });

  return (
    <PageContainer>
      <Form method="post" {...getFormProps(form)} className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <h1 className="font-heading text-2xl font-semibold flex-1">Settings</h1>
          <Button type="submit" disabled={isPending}>
            {isPending ? <IconLoader2 className="animate-spin" /> : <IconDeviceFloppy />}
            Save
          </Button>
        </div>

        {SECTIONS.map((section) => (
          <div key={section.title} className="flex flex-col gap-4">
            <h2 className="font-heading text-lg font-semibold border-b pb-2">{section.title}</h2>
            <div className="flex flex-col gap-5">
              {section.ids.map((id) => {
                const def = getDef(id);
                const meta = fields[getFormKey(id)];
                return (
                  <div key={id} className="flex flex-col gap-1.5">
                    <label htmlFor={meta.id} className="text-sm font-medium">
                      {def.name}
                      {"setup" in def && def.setup && (
                        <span className="ml-2 text-xs text-muted-foreground font-normal">(required for setup)</span>
                      )}
                    </label>
                    <p className="text-xs text-muted-foreground">{def.description}</p>
                    <SettingControl def={def} meta={meta} rawValue={values[id]} />
                    {meta.errors && (
                      <p className="text-xs text-destructive">{meta.errors.join(", ")}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </Form>
    </PageContainer>
  );
}

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
      return def.multiline ? (
        <Textarea {...getTextareaProps(meta)} className="font-mono" />
      ) : (
        <StyledInput {...getInputProps(meta, { type: "text" })} />
      );
    case "number":
      return (
        <StyledInput
          {...getInputProps(meta, { type: "number" })}
          min={def.min}
          max={def.max}
          step={def.step}
        />
      );
    case "boolean":
      return (
        <div className="flex items-center gap-2">
          <input
            {...getInputProps(meta, { type: "checkbox" })}
            className="h-4 w-4 rounded border accent-primary"
          />
        </div>
      );
    case "enum":
      return (
        <select
          name={meta.name}
          id={meta.id}
          defaultValue={meta.initialValue as string}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          )}
        >
          {def.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "secret": {
      const isSet = Boolean((rawValue as { isSet?: boolean } | null)?.isSet);
      return <SecretInput meta={meta} isSet={isSet} />;
    }
    case "array":
      return (
        <Textarea
          {...getTextareaProps(meta)}
          placeholder="One item per line"
          className="font-mono min-h-[6rem]"
        />
      );
  }
}

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        props.className,
      )}
    />
  );
}

function SecretInput({ meta, isSet }: { meta: FieldMetadata; isSet: boolean }) {
  return (
    <StyledInput
      {...getInputProps(meta, { type: "password" })}
      placeholder={isSet ? "••••••••" : ""}
      autoComplete="new-password"
    />
  );
}
