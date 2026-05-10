export interface BasicAuthData {
  username: string;
  password: string;
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
