import { formatTime } from "~/utils";
import { getSetting } from "~/settings/server";
import type { UpdatedRecords } from "./tasks.server";

let emptyCount = 0;

export async function sendRecordsNotification(updatedRecords: UpdatedRecords) {
  const [ntfyBaseUrl, ntfyTopic, ntfyLengthLimit, emptyCountBeforeNotify, baseUrl] =
    await Promise.all([
      getSetting("notifications.ntfy.baseUrl"),
      getSetting("notifications.ntfy.topic"),
      getSetting("notifications.ntfy.lengthLimit"),
      getSetting("notifications.emptyCountBeforeNotify"),
      getSetting("base.url"),
    ]);

  if (!ntfyBaseUrl || !ntfyTopic) {
    console.info("Missing or invalid ntfy config, skipping notification");
    return;
  }

  console.log("Updated records:", updatedRecords);
  const data = createNotificationData(updatedRecords, emptyCountBeforeNotify ?? 5);
  if (!data) {
    return;
  }
  const { title, tags } = data;
  let { message } = data;

  console.info("Sending notification:\n", message);
  if (ntfyLengthLimit && message.length > ntfyLengthLimit) {
    console.warn(
      `Notification message too long (${message.length} > ${ntfyLengthLimit}), truncating`,
    );
    message = message.slice(0, ntfyLengthLimit - 3) + "...";
  }

  const response = await fetch(ntfyBaseUrl, {
    method: "POST",
    body: JSON.stringify({
      topic: ntfyTopic,
      title,
      message,
      tags,
      actions: [
        {
          action: "view",
          label: "Open website",
          url: baseUrl,
        },
      ],
    }),
  });
  if (!response.ok) {
    console.error("Failed to send notification", response);
    return;
  }

  console.log("Notification sent", await response.json());
}

function createNotificationData(recordUpdates: UpdatedRecords, emptyCountBeforeNotify: number) {
  if (Object.keys(recordUpdates).length === 0) {
    emptyCount++;
    if (emptyCount < emptyCountBeforeNotify) {
      console.log("Skipping notification, empty count:", emptyCount);
      return;
    }
    emptyCount = 0;
    return {
      title: "No new records",
      message: "Task completed successfully, but no new records were found",
      tags: ["black_small_square"],
    };
  }

  return {
    title: "New records",
    message: Object.entries(recordUpdates)
      .map(([mapName, updates]) => {
        return (
          `=> ${mapName}\n` +
          updates
            .sort((a, b) => a.position - b.position)
            .map(
              (update) =>
                `${update.position}. ${update.playerName} - ${formatTime(update.timeMs)}`,
            )
            .join("\n")
        );
      })
      .join("\n\n"),
    tags: ["page_facing_up"],
  };
}
