import { describe, it, expect } from 'vitest';
import {
  pixelToTile,
  tileToPixel,
  tileCenterPixel,
  tileKey,
  parseTileKey,
  worldToTile,
} from '../src/utils/grid';
import { TILE_SIZE } from '../src/config/constants';

describe('grid', () => {
  it('tileToPixel / pixelToTile（瓦片左上角）', () => {
    expect(tileToPixel(0)).toBe(0);
    expect(tileToPixel(3)).toBe(3 * TILE_SIZE);
    expect(pixelToTile(0)).toBe(0);
    expect(pixelToTile(TILE_SIZE - 1)).toBe(0);
    expect(pixelToTile(TILE_SIZE)).toBe(1);
    expect(pixelToTile(3 * TILE_SIZE + 5)).toBe(3);
  });

  it('tileCenterPixel 在瓦片中心', () => {
    expect(tileCenterPixel(0)).toBe(TILE_SIZE / 2);
    expect(tileCenterPixel(2)).toBe(2 * TILE_SIZE + TILE_SIZE / 2);
  });

  it('tileKey / parseTileKey 往返', () => {
    expect(tileKey(4, 7)).toBe('4,7');
    expect(parseTileKey('4,7')).toEqual({ tx: 4, ty: 7 });
  });

  it('worldToTile', () => {
    expect(worldToTile(TILE_SIZE * 2 + 1, TILE_SIZE * 5 + 15)).toEqual({ tx: 2, ty: 5 });
  });
});
