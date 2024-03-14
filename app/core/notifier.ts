import { formatTime } from '~/utils';
import { UpdatedRecords } from './tasks.server';
import { getConfig } from './config.server';

export interface NotificationsConfig {
  ntfy:
    | {
        baseUrl: string;
        topic: string;
        lengthLimit?: number;
      }
    | undefined;
  emptyCountBeforeNotify: number;
}

let emptyCount = 0;

export async function sendRecordsNotification(
  updatedRecords: UpdatedRecords,
  config: NotificationsConfig
) {
  if (!config.ntfy || !config.ntfy.baseUrl || !config.ntfy.topic) {
    console.info('Missing or invalid ntfy config, skipping notification');
    return;
  }

  console.log('Updated records:', updatedRecords);
  const data = createNotificationData(updatedRecords, config);
  if (!data) {
    return;
  }
  const { title, tags } = data;
  let { message } = data;

  console.info('Sending notification:\n', message);
  if (config.ntfy.lengthLimit && message.length > config.ntfy.lengthLimit) {
    console.warn(
      `Notification message too long (${message.length} > ${config.ntfy.lengthLimit}), truncating`
    );
    message = message.slice(0, config.ntfy.lengthLimit - 3) + '...';
  }

  const response = await fetch(config.ntfy.baseUrl, {
    method: 'POST',
    body: JSON.stringify({
      topic: config.ntfy.topic,
      title,
      message,
      tags,
      actions: [
        {
          action: 'view',
          label: 'Open website',
          url: getConfig().baseUrl,
        },
      ],
    }),
  });
  if (!response.ok) {
    console.error('Failed to send notification', response);
    return;
  }

  console.log('Notification sent', await response.json());
}

function createNotificationData(
  recordUpdates: UpdatedRecords,
  config: NotificationsConfig
) {
  if (Object.keys(recordUpdates).length === 0) {
    emptyCount++;
    if (emptyCount < config.emptyCountBeforeNotify) {
      console.log('Skipping notification, empty count:', emptyCount);
      return;
    }
    emptyCount = 0;
    return {
      title: 'No new records',
      message: 'Task completed successfully, but no new records were found',
      tags: ['black_small_square'],
    };
  }

  return {
    title: 'New records',
    message: Object.entries(recordUpdates)
      .map(([mapName, updates]) => {
        return (
          `=> ${mapName}\n` +
          updates
            .map(
              (update) =>
                `${update.position}. ${update.playerName} - ${formatTime(
                  update.timeMs
                )}`
            )
            .join('\n')
        );
      })
      .join('\n\n'),
    tags: ['page_facing_up'],
  };
}
