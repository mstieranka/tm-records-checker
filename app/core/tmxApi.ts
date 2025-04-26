export interface TmxSearchParams {
  userId: number;
}

export interface TmxApiConfig {
  searchParams: TmxSearchParams;
}

export interface TmxMap extends Object {
  /** TMX map ID */
  MapId: number;

  /** Map name on TMX */
  Name: string;

  /** Nadeo map ID */
  MapUid: string;

  /** Map name in game */
  GbxMapName: string;

  /** Medals in ms */
  Medals: {
    Author: number;
    // Gold: number;
    // Silver: number;
    // Bronze: number;
  };

  UploadedAt: string;
  UpdatedAt: string;
}

const TMX_BASE_URL = 'https://trackmania.exchange/api';
function getTmxSearchUrl(authorId: number) {
  return `${TMX_BASE_URL}/maps?fields=${encodeURIComponent(
    [
      'MapId',
      'Name',
      'MapUid',
      'GbxMapName',
      'Medals.Author',
      'UploadedAt',
      'UpdatedAt',
    ].join(',')
  )}&authoruserid=${authorId}`;
}

export async function getTmxMaps(
  searchParams: TmxSearchParams,
  userAgent: string
) {
  const url = getTmxSearchUrl(searchParams.userId);
  console.log('Retrieving map list', url);
  const mapListResponse = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': userAgent,
    },
  });
  if (!mapListResponse.ok) {
    throw new Error(
      `Failed to retrieve map list: ${mapListResponse.statusText}`
    );
  }
  let pageData = (await mapListResponse.json()) as {
    Results: TmxMap[];
    More: boolean;
  };
  const results: TmxMap[] = pageData.Results;
  console.log(`Found ${results.length} maps`);
  while (pageData.More) {
    const lastMapId = pageData.Results[pageData.Results.length - 1].MapId;
    const nextPageResponse = await fetch(`${url}&after=${lastMapId}`, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
      },
    });
    if (!nextPageResponse.ok) {
      throw new Error(
        `Failed to retrieve map list: ${nextPageResponse.statusText}`
      );
    }
    pageData = (await nextPageResponse.json()) as {
      Results: TmxMap[];
      More: boolean;
    };
    results.push(...pageData.Results);
    console.log(`Found ${results.length} maps`);
  }

  return results;
}
