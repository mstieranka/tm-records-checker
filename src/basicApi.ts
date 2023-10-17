import { decodeJwt } from 'jose';
import { Config } from './config';
import { fetchJson, isTimeClose } from './utils';

export interface BasicAuthData {
  email: string;
  password: string;
}

interface TmSessionResponse {
  platformType: 'uplay';
  ticket: string;
  twoFactorAuthenticationTicket: string;
  profileId: string;
  userId: string;
  nameOnPlatform: string;
  environment: string;
  expiration: string;
  spaceId: string;
  clientIp: string;
  clientIpCountry: string;
  serverTime: string;
  sessionId: string;
  sessionKey: string;
  rememberMeTicket: string;
}

interface TmAuthToken {
  accessToken: string;
  accessTokenExpiry?: number;
  refreshToken: string;
  refreshTokenExpiry?: number;
}

export interface TmLeaderboardItem {
  accountId: string;
  zoneId: string;
  zoneName: string;
  position: number;
  score: number;
}

export interface TmLeaderboardZone {
  zoneId: string;
  zoneName: string;
  top: TmLeaderboardItem[];
}

export interface TmLeaderboard {
  groupUid: string;
  mapUid: string;
  tops: TmLeaderboardZone[];
}

const TM_API_SESSION_URL =
  'https://public-ubiservices.ubi.com/v3/profiles/sessions';
const TM_API_AUTH_URL =
  'https://prod.trackmania.core.nadeo.online/v2/authentication/token/ubiservices';
const TM_API_REFRESH_URL =
  'https://prod.trackmania.core.nadeo.online/v2/authentication/token/refresh';
const getTmApiLeaderboardsUrl = (mapUid: string) =>
  `https://live-services.trackmania.nadeo.live/api/token/leaderboard/group/Personal_Best/map/${mapUid}/top?length=10&onlyWorld=true&offset=0`;

export class BasicApi {
  constructor(config: Config) {
    this.config = config;
  }

  private config: Config;
  private session: TmSessionResponse | undefined;
  private liveAuth: TmAuthToken | undefined;

  private async refreshAuth() {
    if (
      !this.session ||
      isTimeClose(new Date(this.session.expiration).getTime())
    ) {
      this.session = await this.getSession(this.config.tmAuth);
    }
    if (
      !this.liveAuth ||
      !this.liveAuth.refreshTokenExpiry ||
      isTimeClose(this.liveAuth.refreshTokenExpiry)
    ) {
      this.liveAuth = await this.getTmAuthToken('NadeoLiveServices');
    }
    if (
      !this.liveAuth.accessTokenExpiry ||
      isTimeClose(this.liveAuth.accessTokenExpiry)
    ) {
      this.liveAuth = await this.refreshTmAuthToken('NadeoLiveServices');
    }
  }

  private async getSession(authData: BasicAuthData) {
    let session = undefined;
    while (!session) {
      session = await fetchJson<TmSessionResponse>(TM_API_SESSION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.config.userAgent,
          'Ubi-AppId': '86263886-327a-4328-ac69-527f0d20a237',
          Authorization:
            'Basic ' +
            Buffer.from(
              `${authData.email}:${authData.password}`,
              'utf-8'
            ).toString('base64'),
        },
      });
    }
    return session;
  }

  private async getTmAuthToken(
    audience: 'NadeoServices' | 'NadeoLiveServices' | 'NadeoClubServices'
  ) {
    const auth = await fetchJson<TmAuthToken>(TM_API_AUTH_URL, {
      method: 'POST',
      body: JSON.stringify({ audience }),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': this.config.userAgent,
        Authorization: 'ubi_v1 t=' + this.session?.ticket,
      },
    });
    if (!auth) return auth;
    auth.accessTokenExpiry = (decodeJwt(auth.accessToken).exp ?? 0) * 1000;
    auth.refreshTokenExpiry = (decodeJwt(auth.refreshToken).exp ?? 0) * 1000;
    return auth as TmAuthToken;
  }

  private async refreshTmAuthToken(audience: string) {
    console.log(`Refreshing ${audience} token`);
    const authResponse = await fetch(TM_API_REFRESH_URL, {
      method: 'POST',
      body: JSON.stringify({ audience }),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': this.config.userAgent,
        Authorization: 'nadeo_v1 t=' + this.liveAuth?.refreshToken,
      },
    });
    const auth: TmAuthToken = await authResponse.json();
    if (!auth.accessToken) {
      throw new Error('Failed to refresh token');
    }
    auth.accessTokenExpiry = (decodeJwt(auth.accessToken).exp ?? 0) * 1000;
    auth.refreshTokenExpiry = (decodeJwt(auth.refreshToken).exp ?? 0) * 1000;
    console.log(`Refreshed ${audience} token`);
    return auth;
  }

  async getLeaderboard(TrackUID: string) {
    await this.refreshAuth();
    const leaderboard = await fetchJson<TmLeaderboard>(
      getTmApiLeaderboardsUrl(TrackUID),
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.config.userAgent,
          Authorization: 'nadeo_v1 t=' + this.liveAuth?.accessToken,
        },
      }
    );
    return leaderboard;
  }
}
