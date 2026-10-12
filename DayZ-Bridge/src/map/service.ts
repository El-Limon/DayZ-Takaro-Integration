// Answers Takaro's legacy getMapInfo / getMapTile from the mod's world survey. Runs in the
// bridge, so tiles never touch the game thread.

import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../logger.js';
import { encodePng } from './png.js';
import { MAP_BLOCK_SIZE, MAX_ZOOM, TILE_SIZE, prepareSurvey, renderTile, tileInWorld, type PreparedSurvey } from './render.js';
import { parseSurvey } from './survey.js';

export interface MapInfo {
  enabled: boolean;
  mapBlockSize: number;
  maxZoom: number;
  mapSizeX: number;
  mapSizeY: number;
  mapSizeZ: number;
}

export const DISABLED_MAP_INFO: MapInfo = {
  enabled: false,
  mapBlockSize: 0,
  maxZoom: 0,
  mapSizeX: 0,
  mapSizeY: 0,
  mapSizeZ: 0,
};

const RECHECK_MS = 30_000;
const CACHE_TILES = 2000;

export class MapService {
  private prepared: PreparedSurvey | null = null;
  private loadedFile = '';
  private loadedMtime = 0;
  private checkedAt = 0;
  private tiles = new Map<string, string>(); // key -> base64 PNG, insertion order = LRU
  private blank: string | null = null;

  constructor(private dir: string) {}

  /** Newest complete `<world>.survey` in the map directory, reloaded when it changes. */
  current(): PreparedSurvey | null {
    const now = Date.now();
    if (now - this.checkedAt < RECHECK_MS && this.prepared) return this.prepared;
    this.checkedAt = now;
    let best: { file: string; mtime: number } | null = null;
    try {
      for (const name of fs.readdirSync(this.dir)) {
        if (!name.endsWith('.survey')) continue;
        const file = path.join(this.dir, name);
        const mtime = fs.statSync(file).mtimeMs;
        if (!best || mtime > best.mtime) best = { file, mtime };
      }
    } catch {
      return this.prepared;
    }
    if (!best) return this.prepared;
    if (best.file === this.loadedFile && best.mtime === this.loadedMtime) return this.prepared;
    try {
      const started = Date.now();
      const survey = parseSurvey(fs.readFileSync(best.file, 'utf8'));
      this.prepared = prepareSurvey(survey);
      this.loadedFile = best.file;
      this.loadedMtime = best.mtime;
      this.tiles.clear();
      logger.info(
        `Map survey loaded: ${survey.world} ${survey.size} m, ${survey.buildings.length} buildings, ` +
          `${survey.surfaceNames.length} surfaces, ${Date.now() - started} ms (${best.file})`,
      );
    } catch (err) {
      logger.warn(`Map survey ${best.file} not usable: ${(err as Error).message}`);
    }
    return this.prepared;
  }

  mapInfo(): MapInfo {
    const p = this.current();
    if (!p) return DISABLED_MAP_INFO;
    return {
      enabled: true,
      mapBlockSize: MAP_BLOCK_SIZE,
      maxZoom: MAX_ZOOM,
      mapSizeX: p.survey.size,
      // Vertical extent: smaller than the horizontal ones, which tells map viewers DayZ is Y-up.
      mapSizeY: Math.max(100, Math.ceil(p.survey.maxHeight / 100) * 100),
      mapSizeZ: p.survey.size,
    };
  }

  /** Base64 PNG for tile (x, y) at zoom z; a transparent tile outside the world. */
  tile(x: number, y: number, z: number): string {
    const p = this.current();
    if (!p) throw new Error('Map not available yet: the world survey has not finished (console: mapsurvey)');
    if (![x, y, z].every(Number.isInteger) || z < 0 || z > MAX_ZOOM) {
      throw new Error(`Invalid map tile ${z}/${x}/${y} (zoom 0..${MAX_ZOOM})`);
    }
    if (!tileInWorld(p.survey.size, z, x, y)) return this.blankTile();
    const key = `${z}/${x}/${y}`;
    const hit = this.tiles.get(key);
    if (hit) {
      this.tiles.delete(key);
      this.tiles.set(key, hit);
      return hit;
    }
    const png = encodePng(TILE_SIZE, TILE_SIZE, renderTile(p, z, x, y)).toString('base64');
    this.tiles.set(key, png);
    if (this.tiles.size > CACHE_TILES) this.tiles.delete(this.tiles.keys().next().value!);
    return png;
  }

  private blankTile(): string {
    if (!this.blank) this.blank = encodePng(TILE_SIZE, TILE_SIZE, new Uint8Array(TILE_SIZE * TILE_SIZE * 4)).toString('base64');
    return this.blank;
  }
}

/** getMapTile args: Takaro sends {x, y, z} (numbers or numeric strings). */
export function parseTileArgs(args: unknown): { x: number; y: number; z: number } {
  let obj: unknown = args;
  if (typeof args === 'string') obj = args ? JSON.parse(args) : {};
  const o = (obj ?? {}) as Record<string, unknown>;
  const num = (v: unknown): number => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
  return { x: num(o.x), y: num(o.y), z: num(o.z) };
}

export function mapServiceFromEnv(env: NodeJS.ProcessEnv = process.env): MapService | null {
  const dir = env.DAYZ_MAP_DIR || (env.DAYZ_LOG_DIR ? path.join(env.DAYZ_LOG_DIR, 'TakaroIntegration', 'map') : '');
  return dir ? new MapService(dir) : null;
}
