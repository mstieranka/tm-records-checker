import { Config } from './config';

export interface TmxSearchOptions {
  tmxUsername: string;
}

export interface TmxMap extends Object {
  GbxMapName: string;
  Name: string;
  TrackUID: string;
}

const TMX_BASE_URL = 'https://trackmania.exchange';
const TMX_SEARCH_LIMIT = 100;
const getTmxSearchUrl = (author: string) =>
  `${TMX_BASE_URL}/mapsearch2/search?api=on&limit=${TMX_SEARCH_LIMIT}&author=${author}`;

export class TmxApi {
  constructor(config: Config) {
    this.config = config;
  }

  private config: Config;

  async getTmxMaps() {
    console.log('Retrieving map list');
    const mapListResponse = await fetch(
      getTmxSearchUrl(this.config.tmxSearchOptions.tmxUsername),
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.config.userAgent,
        },
      }
    );
    if (!mapListResponse.ok) {
      throw new Error(
        `Failed to retrieve map list: ${mapListResponse.statusText}`
      );
    }
    const mapList: { results: TmxMap[]; totalItemCount: number } =
      await mapListResponse.json();
    if (mapList.results.length < mapList.totalItemCount) {
      console.error(
        `Expected ${mapList.totalItemCount} maps, got ${mapList.results.length}`
      );
    } else {
      console.log(`Received map list with ${mapList.results.length} items`);
    }

    return mapList.results;
  }
}
