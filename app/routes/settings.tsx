import { Form, useLoaderData, useNavigation } from "react-router";
import { useState } from "react";
import {
  IconDeviceFloppy,
  IconEye,
  IconEyeOff,
  IconLoader2,
  IconReload,
} from "@tabler/icons-react";
import type { Route } from "./+types/settings";
import { getConfig, reloadConfig, saveConfig } from "~/core/config.server";
import { requireUser } from "~/auth/session.server";
import { PageContainer } from "~/components/PageContainer";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "sonner";

export const meta: Route.MetaFunction = () => {
  return [{ title: "Settings | TM Records Checker" }];
};

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return getConfig();
}

enum ActionType {
  Reload = "reload",
  Save = "save",
}

export async function action({ request }: Route.ActionArgs) {
  await requireUser(request);

  const formData = await request.formData();
  const action = formData.get("action")?.toString() as ActionType | null;

  switch (action) {
    case ActionType.Reload: {
      await reloadConfig();
      return { action, success: true };
    }
    case ActionType.Save: {
      const config = JSON.parse(formData.get("config") as string);
      await saveConfig(config);
      return { action, success: true };
    }
    default:
      return { action, success: false };
  }
}

export async function clientAction({ serverAction }: Route.ClientActionArgs) {
  const result = await serverAction();

  if (result.action === ActionType.Reload) {
    if (result.success) {
      toast.success("Config reloaded successfully.");
    } else {
      toast.error("Failed to reload config.");
    }
  } else if (result.action === ActionType.Save) {
    if (result.success) {
      toast.success("Config saved and reloaded successfully.");
    } else {
      toast.error("Failed to save and reload config.");
    }
  }

  return result;
}

export default function Settings() {
  const config = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [showConfig, setShowConfig] = useState(false);
  const isPending = navigation.state === "submitting";
  const activeAction = isPending ? navigation.formData?.get("action")?.toString() : null;

  return (
    <PageContainer>
      <Form method="post" className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <h1 className="font-heading text-2xl font-semibold flex-1">Settings</h1>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setShowConfig(!showConfig)}>
              {showConfig ? <IconEyeOff /> : <IconEye />}
              {showConfig ? "Hide config" : "Show config"}
            </Button>
            <Button
              type="submit"
              variant="outline"
              name="action"
              value={ActionType.Reload}
              disabled={isPending}
            >
              {activeAction === ActionType.Reload ? (
                <IconLoader2 className="animate-spin" />
              ) : (
                <IconReload />
              )}
              Reload config
            </Button>
            <Button type="submit" name="action" value={ActionType.Save} disabled={isPending}>
              {activeAction === ActionType.Save ? (
                <IconLoader2 className="animate-spin" />
              ) : (
                <IconDeviceFloppy />
              )}
              Save and reload
            </Button>
          </div>
        </div>

        <Textarea
          key={JSON.stringify(config)}
          id="config"
          name="config"
          defaultValue={JSON.stringify(config, null, 2)}
          className="font-mono h-[70vh]"
          style={showConfig ? undefined : { filter: "blur(0.5rem)" }}
        />
      </Form>
    </PageContainer>
  );
}
