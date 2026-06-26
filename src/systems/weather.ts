// 天气挑选纯函数（SPEC 4.5 步4 / 附录A）：给定季节与 [0,1) 随机值，按概率挑天气。
import { WEATHER_PROBABILITY } from '../config/balance';
import type { Season, Weather } from '../types';

const ORDER: Weather[] = ['sunny', 'rain', 'storm', 'snow'];

export function pickWeather(season: Season, r01: number): Weather {
  const probs = WEATHER_PROBABILITY[season];
  let acc = 0;
  for (const w of ORDER) {
    acc += probs[w];
    if (r01 < acc) return w;
  }
  return 'sunny';
}
