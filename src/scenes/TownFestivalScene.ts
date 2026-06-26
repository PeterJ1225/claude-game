import Phaser from 'phaser';
import { WorldScene } from './WorldScene';
import { EventBus } from '../core/EventBus';
import { ServiceLocator } from '../core/ServiceLocator';
import { SYS } from '../systems/keys';
import { FESTIVAL_ATTEND_REWARD } from '../config/balance';
import type { FestivalSystem } from '../systems/FestivalSystem';
import type { EconomySystem } from '../systems/EconomySystem';

const FORTUNES = [
  '签文：今日宜耕种，万物生长顺遂。',
  '签文：贵人在侧，与人为善有回报。',
  '签文：财源将至，出货箱莫要空着。',
  '签文：水边有惊喜，记得带上钓竿。',
  '签文：深处藏宝，矿洞之行或有所得。',
];

// 节日场景（SPEC 5.11）：小镇广场的节日变体。首次参加发奖励，居民聚此可对话（触发心事件），
// 祈福摊按 E 求签，西侧缺口离场回镇。NPC 聚集由 NPCSystem 在节日当天接管。
export class TownFestivalScene extends WorldScene {
  protected readonly mapKey = 'town_festival';
  protected canFarm = false;
  protected showWeather = false;
  // useDayNight 用基类默认 true：户外白天节日，活动时段(9–14点)自然全亮。
  private fortuneZone!: Phaser.Geom.Rectangle;

  constructor() {
    super('TownFestival');
  }

  protected onSetup(): void {
    this.cameras.main.setBackgroundColor('#4a8a4a');
    const festSys = ServiceLocator.get<FestivalSystem>(SYS.festival);
    const fest = festSys.festivalToday();

    // 顶部横幅
    const title = fest ? `${fest.name}` : '节日';
    this.add
      .text(320, 6, `🎪 ${title}`, { fontSize: '11px', color: '#ffe9a8' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(70);
    if (fest) {
      this.add
        .text(320, 22, fest.description, { fontSize: '7px', color: '#fff4d6' })
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(70);
    }

    // 摊位 + 灯笼装饰
    this.decorStall(200, 112, '美食摊', 0xc0612a);
    this.decorStall(392, 112, '游戏摊', 0x4a6ec0);
    for (let i = 0; i < 12; i++) {
      this.add.circle(40 + i * 50, 40, 4, i % 2 ? 0xff6b6b : 0xffd451).setDepth(2);
    }

    // 祈福摊（可交互）
    this.fortuneZone = new Phaser.Geom.Rectangle(300, 240, 56, 32);
    this.add.rectangle(300, 240, 56, 32, 0x8a5fb0, 0.85).setOrigin(0).setDepth(2);
    this.add.text(328, 232, '祈福摊 (E)', { fontSize: '8px', color: '#ffe9a8' }).setOrigin(0.5).setDepth(2);

    // 离场提示
    this.add.text(48, 176, '← 离开', { fontSize: '8px', color: '#ffffff' }).setOrigin(0.5).setDepth(2);

    // 首次参加当年此节日 → 发奖励
    if (fest && !festSys.hasAttended(fest)) {
      ServiceLocator.get<EconomySystem>(SYS.economy).addGold(FESTIVAL_ATTEND_REWARD);
      festSys.markAttended(fest);
      EventBus.emit('debug:toast', { text: `参加了${fest.name}，获得 ${FESTIVAL_ATTEND_REWARD} 金奖励！` });
    }
  }

  private decorStall(cx: number, cy: number, label: string, color: number): void {
    this.add.rectangle(cx, cy, 48, 32, color).setStrokeStyle(1, 0x222222).setDepth(2);
    this.add.text(cx, cy - 22, label, { fontSize: '7px', color: '#ffffff' }).setOrigin(0.5).setDepth(2);
  }

  protected onInteract(): boolean {
    if (Phaser.Geom.Rectangle.Contains(this.fortuneZone, this.player.x, this.player.y)) {
      // 纯表现：求签只弹签文、不入档、无玩法后果，故用 Math.random 不消耗序列 rng.state
      // （与 M6 钓鱼鱼标抖动同口径，避免可反复点击的 UI 扰动天气/掉落序列）。
      const line = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
      EventBus.emit('debug:toast', { text: line });
      return true;
    }
    return false;
  }
}
