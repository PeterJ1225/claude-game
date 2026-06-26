// 默认键位（SPEC 附录 B）。值为 Phaser 键名字符串，预留重绑定与 i18n。
// 这里只存键名（与引擎解耦），由场景映射到 Phaser.Input.Keyboard.Key。

export const CONTROLS = {
  up: ['W', 'UP'],
  down: ['S', 'DOWN'],
  left: ['A', 'LEFT'],
  right: ['D', 'RIGHT'],
  use: ['SPACE'],
  interact: ['E'],
  inventory: ['I', 'TAB'],
  menu: ['ESC'],
  quickSave: ['K'], // M0.5 存档演示键
  quickLoad: ['L'], // M0.5 读档演示键
  // 快捷栏选择（SPEC 附录 B）：1–10 = 数字键 1..0，11–12 = '-' '='，滚动 = 鼠标滚轮。
  // M1 接入快捷栏交互时再注册到键盘，M0 暂不使用。
} as const;

// 供场景一次性注册的所有按键名
export const ALL_KEYS = 'W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E,I,TAB,ESC';
