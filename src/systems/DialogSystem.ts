// 对话系统（SPEC 5.7/6.11）：按条件选节点、消费 once、写 flags、标记相遇。
import { GameState } from '../save/GameState';
import { ServiceLocator } from '../core/ServiceLocator';
import { getDialogue } from '../data/dialogues';
import { SYS } from './keys';
import type { DialogueCondition, DialogueNode } from '../types';
import type { RelationshipSystem } from './RelationshipSystem';

export class DialogSystem {
  // 选当前可用对话节点：首个 conditions 全满足且未被 once 消费的节点，否则兜底。
  pickNode(npcId: string): DialogueNode {
    const script = getDialogue(npcId);
    const consumed = GameState.data.consumedDialogueNodes;
    for (const node of script.nodes) {
      if (node.once && consumed.includes(`${npcId}:${node.id}`)) continue;
      if (this.matches(npcId, node.conditions)) return node;
    }
    return script.nodes.find((n) => n.id === script.fallbackNodeId) ?? script.nodes[script.nodes.length - 1];
  }

  // 节点展示后调用：消费 once、写 setFlags、标记已相遇。
  consume(npcId: string, node: DialogueNode): void {
    if (node.once) {
      const key = `${npcId}:${node.id}`;
      if (!GameState.data.consumedDialogueNodes.includes(key)) {
        GameState.data.consumedDialogueNodes.push(key);
      }
    }
    if (node.setFlags) {
      for (const k in node.setFlags) GameState.data.flags[k] = node.setFlags[k];
    }
    ServiceLocator.get<RelationshipSystem>(SYS.relationship).markMet(npcId);
  }

  private matches(npcId: string, conds?: DialogueCondition[]): boolean {
    if (!conds) return true;
    const rel = ServiceLocator.get<RelationshipSystem>(SYS.relationship);
    for (const c of conds) {
      switch (c.type) {
        case 'firstMeet':
          if (GameState.data.relationships[npcId]?.met) return false;
          break;
        case 'minHearts':
          if (rel.heartsOf(npcId) < c.hearts) return false;
          break;
        case 'flag': {
          const v = GameState.data.flags[c.flag];
          if (c.equals !== undefined ? v !== c.equals : !v) return false;
          break;
        }
        case 'season':
          if (GameState.data.time.season !== c.season) return false;
          break;
        case 'weather':
          if (GameState.data.time.weather !== c.weather) return false;
          break;
      }
    }
    return true;
  }
}
