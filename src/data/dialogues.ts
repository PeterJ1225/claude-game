// 对话脚本（SPEC 6.11）。心事件 = once + minHearts/flag 的节点。
import type { DialogueScript } from '../types';

const mira: DialogueScript = {
  npcId: 'mira',
  nodes: [
    {
      id: 'first',
      conditions: [{ type: 'firstMeet' }],
      lines: [{ text: '哦，你就是新来的农夫吧？我是米拉，平时在镇上画画。欢迎你！' }],
    },
    {
      id: 'heart2',
      conditions: [{ type: 'minHearts', hearts: 2 }],
      once: true,
      lines: [
        { text: '米拉：和你聊天总是很开心。' },
        { text: '米拉：这幅小画送给你，挂在农舍里吧。' },
      ],
      setFlags: { 'event:mira:1': true },
    },
    {
      id: 'heart4',
      conditions: [{ type: 'minHearts', hearts: 4 }],
      once: true,
      lines: [
        { text: '米拉：我把农场画进了新的一幅画里——那是镇上最有生气的角落。' },
        { text: '米拉：谢谢你，让这里重新热闹起来。' },
      ],
      setFlags: { 'event:mira:2': true },
    },
    { id: 'rain', conditions: [{ type: 'weather', weather: 'rain' }], lines: [{ text: '米拉：下雨天的光线最适合画画了。' }] },
    { id: 'spring', conditions: [{ type: 'season', season: 'spring' }], lines: [{ text: '米拉：春天的颜色真好看，我得多调几管绿色。' }] },
    { id: 'day', lines: [{ text: '米拉：今天也要加油哦，农夫。' }] },
  ],
  fallbackNodeId: 'day',
};

const sam: DialogueScript = {
  npcId: 'sam',
  nodes: [
    {
      id: 'first',
      conditions: [{ type: 'firstMeet' }],
      lines: [{ text: '嘿，新来的！我是山姆。这镇子不大，但人都挺好。' }],
    },
    {
      id: 'heart2',
      conditions: [{ type: 'minHearts', hearts: 2 }],
      once: true,
      lines: [{ text: '山姆：哥们儿，有空一起去河边玩呗？' }],
      setFlags: { 'event:sam:1': true },
    },
    {
      id: 'heart4',
      conditions: [{ type: 'minHearts', hearts: 4 }],
      once: true,
      lines: [{ text: '山姆：下次节日一起去广场吧，我请你吃烤玉米！' }],
      setFlags: { 'event:sam:2': true },
    },
    { id: 'day', lines: [{ text: '山姆：庄稼长得咋样了？' }] },
  ],
  fallbackNodeId: 'day',
};

const MAP = new Map<string, DialogueScript>([
  ['mira', mira],
  ['sam', sam],
]);

export function getDialogue(npcId: string): DialogueScript {
  const d = MAP.get(npcId);
  if (!d) throw new Error(`未知对话: ${npcId}`);
  return d;
}
