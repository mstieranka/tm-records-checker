export const WAIT_TIME = 24 * 60 * 60 * 1000;
export const MAX_ERROR_WAIT_TIME = WAIT_TIME;
export const DEFAULT_ERROR_WAIT_TIME = 30 * 1000;

export const fetchJson = async <T>(input: string, init?: RequestInit) => {
  const response = await fetch(input, init);
  if (!response.ok) throw response;
  return (await response.json()) as T;
};

export function formatTime(ms: number) {
  // format as mm:ss.SSS or hh:mm:ss.SSS
  const date = new Date(ms);
  const hours = Math.floor(ms / 3600000);
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();
  const milliseconds = date.getUTCMilliseconds();
  return `${hours ? hours + ':' : ''}${minutes
    .toString()
    .padStart(1, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds
    .toString()
    .padStart(3, '0')}`;
}

export function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
    hour12: false,
  });
}

export const isTimeClose = (expiresAt: number) => {
  return expiresAt - Date.now() < 60 * 1000;
};

export const sleep = async (timeoutMs: number) => {
  console.log('Waiting for ' + timeoutMs / 60 / 1000 + ' minutes');
  await Bun.sleep(timeoutMs);
};
