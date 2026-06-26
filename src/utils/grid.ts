// 像素 <-> 瓦片坐标转换（纯函数，可单测）。
import { TILE_SIZE } from '../config/constants';

export function tileToPixel(tile: number): number {
  return tile * TILE_SIZE;
}

export function pixelToTile(px: number): number {
  return Math.floor(px / TILE_SIZE);
}

export function tileCenterPixel(tile: number): number {
  return tile * TILE_SIZE + TILE_SIZE / 2;
}

export function tileKey(tx: number, ty: number): string {
  return `${tx},${ty}`;
}

export function parseTileKey(key: string): { tx: number; ty: number } {
  const [tx, ty] = key.split(',').map(Number);
  return { tx, ty };
}

export function worldToTile(x: number, y: number): { tx: number; ty: number } {
  return { tx: pixelToTile(x), ty: pixelToTile(y) };
}
