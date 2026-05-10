import { fetchJson } from "~/utils";
import { BasicAuthData, TmAuthToken, TmLeaderboard, TmLeaderboardItem } from "./basicApi.types";
import { decodeJwt } from "jose";
import { isTimeClose } from "~/utils";

const TM_API_AUTH_URL = "https://prod.trackmania.core.nadeo.online/v2/authentication/token/basic";
const TM_API_REFRESH_URL =
  "https://prod.trackmania.core.nadeo.online/v2/authentication/token/refresh";
const getTmApiLeaderboardsUrl = (mapUid: string) =>
  `https://live-services.trackmania.nadeo.live/api/token/leaderboard/group/Personal_Best/map/${mapUid}/top?length=10&onlyWorld=true&offset=0`;

let currentAuthToken: TmAuthToken | undefined;

async function getTmAuthToken(
  audience: "NadeoServices" | "NadeoLiveServices" | "NadeoClubServices",
  userAgent: string,
  authData: BasicAuthData,
) {
  console.log(`Getting ${audience} token`);
  const auth = await fetchJson<TmAuthToken>(TM_API_AUTH_URL, {
    method: "POST",
    body: JSON.stringify({ audience }),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": userAgent,
      Authorization:
        "Basic " +
        Buffer.from(`${authData.username}:${authData.password}`, "utf-8").toString("base64"),
    },
  });
  if (!auth) return auth;
  auth.accessTokenExpiry = (decodeJwt(auth.accessToken).exp ?? 0) * 1000;
  auth.refreshTokenExpiry = (decodeJwt(auth.refreshToken).exp ?? 0) * 1000;
  return auth as TmAuthToken;
}

async function refreshTmAuthToken(audience: string, userAgent: string, liveAuth: TmAuthToken) {
  console.log(`Refreshing ${audience} token`);
  const authResponse = await fetch(TM_API_REFRESH_URL, {
    method: "POST",
    body: JSON.stringify({ audience }),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": userAgent,
      Authorization: "nadeo_v1 t=" + liveAuth?.refreshToken,
    },
  });
  if (!authResponse.ok) {
    throw new Error(`Failed to refresh TM basic auth token: ${authResponse.statusText}`);
  }
  const auth = (await authResponse.json()) as TmAuthToken;
  if (!auth.accessToken) {
    throw new Error("Failed to refresh token");
  }
  auth.accessTokenExpiry = (decodeJwt(auth.accessToken).exp ?? 0) * 1000;
  auth.refreshTokenExpiry = (decodeJwt(auth.refreshToken).exp ?? 0) * 1000;
  console.log(`Refreshed ${audience} token`);
  return auth;
}

export async function getRecords(
  ingameId: string,
  config: BasicAuthData,
  userAgent: string,
): Promise<TmLeaderboardItem[]> {
  if (
    !currentAuthToken ||
    !currentAuthToken.refreshTokenExpiry ||
    isTimeClose(currentAuthToken.refreshTokenExpiry)
  ) {
    currentAuthToken = await getTmAuthToken("NadeoLiveServices", userAgent, config);
  } else if (
    !currentAuthToken.accessTokenExpiry ||
    isTimeClose(currentAuthToken.accessTokenExpiry)
  ) {
    currentAuthToken = await refreshTmAuthToken("NadeoLiveServices", userAgent, currentAuthToken);
  }

  return fetchJson<TmLeaderboard>(getTmApiLeaderboardsUrl(ingameId), {
    headers: {
      "User-Agent": userAgent,
      Authorization: `nadeo_v1 t=${currentAuthToken?.accessToken}`,
    },
  }).then((res) => res.tops.flatMap((zone) => zone.top));
}
