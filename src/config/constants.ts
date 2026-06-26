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
