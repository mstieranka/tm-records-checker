export const WAIT_TIME = 24 * 60 * 60 * 1000;
export const MAX_ERROR_WAIT_TIME = WAIT_TIME;
export const DEFAULT_ERROR_WAIT_TIME = 30 * 1000;

export const fetchJson = async <T>(input: string, init?: RequestInit) => {
  const response = await fetch(input, init);
  if (!response.ok) throw response;
  return (await response.json()) as T;
};

export const sleep = async (timeoutMs: number) => {
  console.log('Waiting for ' + timeoutMs / 60 / 1000 + ' minutes');
  await Bun.sleep(timeoutMs);
};

export const isTimeClose = (expiresAt: number) => {
  return expiresAt - Date.now() < 60 * 1000;
};
