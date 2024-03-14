export interface TmxSearchParams {
  userId: number;
}

export interface TmxApiConfig {
  searchParams: TmxSearchParams;
}

export interface TmxMap extends Object {
  /** TMX map ID */
  TrackID: number;

  /** Map name on TMX */
  Name: string;

  /** Nadeo map ID */
  TrackUID: string;

  /** Map name in game */
  GbxMapName: string;

  /** Author time in ms */
  AuthorTime: number;

  UploadedAt: string;
  UpdatedAt: string;
}

const TMX_BASE_URL = 'https://trackmania.exchange';
const TMX_SEARCH_LIMIT = 100;
const getTmxSearchUrl = (authorId: number) =>
  `${TMX_BASE_URL}/mapsearch2/search?api=on&limit=${TMX_SEARCH_LIMIT}&authorId=${authorId}`;

export async function getTmxMaps(
  searchParams: TmxSearchParams,
  userAgent: string
) {
  console.log('Retrieving map list');
  const mapListResponse = await fetch(getTmxSearchUrl(searchParams.userId), {
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
  const mapList = (await mapListResponse.json()) as {
    results: TmxMap[];
    totalItemCount: number;
  };
  if (mapList.results.length < mapList.totalItemCount) {
    console.error(
      `Expected ${mapList.totalItemCount} maps, got ${mapList.results.length}`
    );
  } else {
    console.log(`Received map list with ${mapList.results.length} items`);
  }

  return mapList.results;
}
