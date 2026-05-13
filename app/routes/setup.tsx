import { redirect, Form, useLoaderData } from "react-router";
import { useForm, getFormProps, getInputProps, getTextareaProps, type FieldMetadata } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { IconSettings } from "@tabler/icons-react";
import type { Route } from "./+types/setup";
import {
  SETUP_SETTINGS,
  setupFormSchema,
  getFormKey,
  getSettingId,
  getDef,
  type SettingDef,
} from "~/settings/registry";
import { getAllSettingsForUI, isSetupComplete, setSetting } from "~/settings/server";
import { PageContainer } from "~/components/PageContainer";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

export const meta: Route.MetaFunction = () => {
  return [{ title: "Setup | TM Records Checker" }];
};

export async function loader() {
  if (await isSetupComplete()) throw redirect("/");
  return {
    values: await getAllSettingsForUI(),
    lastResult: null,
  };
}

export async function action({ request }: Route.ActionArgs) {
  if (await isSetupComplete()) throw redirect("/");
  const fd = await request.formData();
  const submission = parseWithZod(fd as unknown as FormData, { schema: setupFormSchema });

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
  const { values, lastResult } = useLoaderData<typeof loader>();

  const [form, fields] = useForm({
    lastResult,
    defaultValue: Object.fromEntries(
      SETUP_SETTINGS.map((s) => {
        const v = values[s.id];
        if (s.kind === "secret") return [getFormKey(s.id), ""];
        if (s.kind === "array") return [getFormKey(s.id), ((v as string[] | undefined) ?? []).join("\n")];
        return [getFormKey(s.id), v];
      }),
    ),
  });

  return (
    <PageContainer>
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <IconSettings className="h-6 w-6" />
            <h1 className="font-heading text-2xl font-semibold">Initial Setup</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure the required settings to get started. You can update these later from the
            Settings page.
          </p>
        </div>

        <Form method="post" {...getFormProps(form)} className="flex flex-col gap-5">
          {SETUP_SETTINGS.map((def) => {
            const meta = fields[getFormKey(def.id)];
            return (
              <div key={def.id} className="flex flex-col gap-1.5">
                <label htmlFor={meta.id} className="text-sm font-medium">
                  {def.name}
                </label>
                <p className="text-xs text-muted-foreground">{def.description}</p>
                <SetupControl def={def} meta={meta} rawValue={values[def.id]} />
                {meta.errors && (
                  <p className="text-xs text-destructive">{meta.errors.join(", ")}</p>
                )}
              </div>
            );
          })}

          <Button type="submit" className="mt-2">
            Complete setup
          </Button>
        </Form>
      </div>
    </PageContainer>
  );
}

function SetupControl({
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
        <input
          {...getInputProps(meta, { type: "checkbox" })}
          className="h-4 w-4 rounded border accent-primary"
        />
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
      return (
        <StyledInput
          {...getInputProps(meta, { type: "password" })}
          placeholder={isSet ? "••••••••" : ""}
          autoComplete="new-password"
        />
      );
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
