export interface BasicAuthData {
  email: string;
  password: string;
}

export interface TmSessionResponse {
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

export interface TmAuthToken {
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
