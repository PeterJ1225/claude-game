// 关系系统（SPEC 4.6 owner: relationships）。好感点/心、对话、送礼、生日（SPEC 5.7/附录A）。
import { GameState } from '../save/GameState';
import { EventBus } from '../core/EventBus';
import { getNPC } from '../data/npcs';
import {
  BIRTHDAY_GIFT_MULTIPLIER,
  DAILY_TALK_POINTS,
  GIFTS_PER_WEEK,
  GIFT_POINTS,
  HEART_POINTS,
  MAX_HEARTS,
} from '../config/balance';

type Taste = 'love' | 'like' | 'neutral' | 'dislike' | 'hate';

export class RelationshipSystem {
  private rel(npcId: string) {
    return GameState.data.relationships[npcId];
  }

  heartsOf(npcId: string): number {
    const r = this.rel(npcId);
    return r ? Math.floor(r.points / HEART_POINTS) : 0;
  }

  private add(npcId: string, pts: number): void {
    const r = this.rel(npcId);
    if (!r) return;
    r.points = Math.max(0, Math.min(MAX_HEARTS * HEART_POINTS, r.points + pts));
    EventBus.emit('npc:relationshipChanged', { npcId, hearts: this.heartsOf(npcId) });
  }

  // 每日首次对话加好感
  talk(npcId: string): boolean {
    const r = this.rel(npcId);
    if (!r || r.talkedToday) return false;
    r.talkedToday = true;
    this.add(npcId, DAILY_TALK_POINTS);
    return true;
  }

  tasteOf(npcId: string, itemId: string): Taste {
    const t = getNPC(npcId).giftTastes;
    if (t.love.includes(itemId)) return 'love';
    if (t.like.includes(itemId)) return 'like';
    if (t.dislike.includes(itemId)) return 'dislike';
    if (t.hate.includes(itemId)) return 'hate';
    return 'neutral';
  }

  canGift(npcId: string): boolean {
    const r = this.rel(npcId);
    return !!r && r.giftsThisWeek < GIFTS_PER_WEEK;
  }

  // 送礼：按喜好加减好感；生日 ×倍率。返回喜好等级（失败返回 null）。
  gift(npcId: string, itemId: string): Taste | null {
    const r = this.rel(npcId);
    if (!r || r.giftsThisWeek >= GIFTS_PER_WEEK) return null;
    const taste = this.tasteOf(npcId, itemId);
    let pts = GIFT_POINTS[taste];
    const npc = getNPC(npcId);
    const t = GameState.data.time;
    // 生日只放大正向礼物（避免讨厌之礼变成 ×8 的巨额掉好感）
    if (pts > 0 && t.season === npc.birthday.season && t.day === npc.birthday.day) {
      pts *= BIRTHDAY_GIFT_MULTIPLIER;
    }
    r.giftsThisWeek += 1;
    this.add(npcId, pts);
    return taste;
  }

  markMet(npcId: string): void {
    const r = this.rel(npcId);
    if (r) r.met = true;
  }

  // 过夜结算方法（SPEC 4.5 步 9）
  dailyReset(isNewWeek: boolean): void {
    const rels = GameState.data.relationships;
    for (const k in rels) {
      rels[k].talkedToday = false;
      if (isNewWeek) rels[k].giftsThisWeek = 0;
    }
  }
}
