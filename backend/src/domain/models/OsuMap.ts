export interface OsuMap {
  id: number;
  beatmapSetId: number;
  title: string;
  artist: string;
  difficulty: string;
  starRating: number;
  bpm: number;
  length: number;
  mod?: string;
}

export interface Mappool {
  id: string;
  name: string;
  maps: OsuMap[];
}

export function createOsuMap(params: {
  id: number;
  beatmapSetId?: number;
  title: string;
  artist: string;
  difficulty: string;
  starRating?: number;
  bpm?: number;
  length?: number;
  mod?: string;
}): OsuMap {
  return {
    id: params.id,
    beatmapSetId: params.beatmapSetId ?? 0,
    title: params.title,
    artist: params.artist,
    difficulty: params.difficulty,
    starRating: params.starRating ?? 0,
    bpm: params.bpm ?? 0,
    length: params.length ?? 0,
    mod: params.mod,
  };
}

export function getMapsByMod(mappool: Mappool, mod: string): OsuMap[] {
  return mappool.maps.filter((m) => m.mod === mod);
}
