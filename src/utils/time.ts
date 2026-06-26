// 时间格式化与星期换算（纯函数，可单测）。SPEC 4.5。

export function formatTime(minute: number): string {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const WEEKDAY_NAMES = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

// 季内第 day 天（1..28）对应的星期索引（0=monday）
export function weekdayOf(day: number): number {
  return (day - 1) % 7;
}

export function weekdayName(day: number): string {
  return WEEKDAY_NAMES[weekdayOf(day)];
}

// 是否新一周起点（day ∈ {1,8,15,22}）
export function isNewWeek(day: number): boolean {
  return (day - 1) % 7 === 0;
}
