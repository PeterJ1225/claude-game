# 素材与版权 (CREDITS)

本项目尚未整合二进制美术/音频素材；当前一切可见/可听内容均由代码在运行时生成，便于在无素材依赖下打通完整玩法闭环。整合真实素材时，请在本文件登记来源 URL 与许可证。

## 美术

- **占位纹理**：由 `src/scenes/PreloadScene.ts` 的 `generatePlaceholderTextures()` 用 Phaser `Graphics` 在运行时生成（草地瓦片、玩家、物品图标、天气粒子等纯色块）。
- **地图**：手写最小 Tiled JSON（`public/assets/tilemaps/*.json`），单瓦片 tileset + 对象层碰撞。
- **待整合**：真实 CC0 像素素材（如 [Kenney](https://kenney.nl)、[OpenGameArt CC0](https://opengameart.org)）打包为 atlas；整合后在此登记每份素材的作者、URL、许可证。

## 音频

- **音效 (SFX)**：由 `src/audio/AudioManager.ts` 用 **Web Audio API** 程序化合成（振荡器短音），覆盖收获、得金、升级、新的一天等事件；无二进制音频文件。
- **音乐 (BGM)**：音量控制已就绪（设置菜单），真实 BGM 音轨待整合 CC0 素材后接入。
- **待整合**：CC0 BGM/SFX（如 OpenGameArt / freesound CC0）；整合后在此登记来源与许可证。

## 字体

- 使用浏览器默认字体经 Phaser 文本渲染；未内嵌字体文件。

## 代码与设计

- 游戏代码、关卡/数值设计、占位资源生成：本仓库。规格见 [`SPEC.md`](../../SPEC.md)。

> 许可证合规：整合任何第三方素材前确认其许可证允许分发；CC-BY 等需署名的素材必须在本文件保留作者与链接。
