// 系统装配（SPEC 4.6 ServiceLocator 启动期装配）。在新游戏/读档后、进入玩法场景前调用。
import { ServiceLocator } from '../core/ServiceLocator';
import { SYS } from './keys';
import { TimeSystem } from './TimeSystem';
import { EnergySystem } from './EnergySystem';
import { InventorySystem } from './InventorySystem';
import { FarmSystem } from './FarmSystem';
import { CropSystem } from './CropSystem';
import { SkillSystem } from './SkillSystem';
import { EconomySystem } from './EconomySystem';
import { ToolSystem } from './ToolSystem';
import { RelationshipSystem } from './RelationshipSystem';
import { InteractionSystem } from './InteractionSystem';

let done = false;

export function setupSystems(): void {
  // 系统是无状态单例（状态在 GameState），装配一次即可。
  if (done && ServiceLocator.has(SYS.time)) return;
  ServiceLocator.register(SYS.time, new TimeSystem());
  ServiceLocator.register(SYS.energy, new EnergySystem());
  ServiceLocator.register(SYS.inventory, new InventorySystem());
  ServiceLocator.register(SYS.farm, new FarmSystem());
  ServiceLocator.register(SYS.crop, new CropSystem());
  ServiceLocator.register(SYS.skill, new SkillSystem());
  ServiceLocator.register(SYS.economy, new EconomySystem());
  ServiceLocator.register(SYS.tool, new ToolSystem());
  ServiceLocator.register(SYS.relationship, new RelationshipSystem());
  ServiceLocator.register(SYS.interaction, new InteractionSystem());
  done = true;
}
