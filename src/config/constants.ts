// 全局结构常量（瓦片尺寸、容量、时段、渲染）。可调数值在 balance.ts，键位在 controls.ts。

export const TILE_SIZE = 16;

export const INVENTORY_SIZE = 36;
export const HOTBAR_SIZE = 12; // 快捷栏 = inventory 前 12 格视图（见 SPEC 5.4）

// 时间（游戏分钟）
export const DAY_START_MINUTE = 6 * 60; // 360 → 06:00 起床
export const DAY_END_MINUTE = 26 * 60; // 1560 → 次日 02:00 强制睡
export const MINUTES_PER_TICK = 10;
export const MS_PER_TICK = 700; // 700ms = 10 游戏分钟

// 渲染（设计分辨率 480×270，整数倍缩放）
export const DESIGN_WIDTH = 480;
export const DESIGN_HEIGHT = 270;
export const ZOOM = 3;

// 农场出生点（createNewGame 初始位置与 FarmScene spawn 兜底共用，避免两处硬编码失配）
export const FARM_SPAWN = { x: 320, y: 184 };

// 农场床（睡觉点矩形）与出货箱（投放点矩形），世界像素坐标
export const FARM_BED = { x: 336, y: 160, w: 32, h: 16 };
export const FARM_SHIPPING_BIN = { x: 272, y: 200, w: 24, h: 16 };

// 地图瓦片尺寸（farm/town 均 40×23），用于耕作边界校验
export const MAP_TILES_W = 40;
export const MAP_TILES_H = 23;
