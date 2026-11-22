# CQ Life — 重庆南岸生活切片 v0.1

浏览器端 Three.js 开放世界生活原型。切片 1：南岸风格普通住宅小区 + 门岗外便利店。

**可玩循环：** 走路 / 开车进出小区 → 回家吃饭、睡觉、换衣 → 便利店购物 → 日夜与饥饿/精力。

## 本地运行

```bash
npm install
npm run dev
```

打开终端提示的本地地址（默认 `http://localhost:5173`）。桌面 Chrome / Edge。

```bash
npm run build
npm run preview
```

## 操作

| 键 | 作用 |
|---|---|
| WASD / 方向键 | 移动（开车为油门/转向） |
| Shift | 跑步 |
| 鼠标 | 环视（点击画面锁定） |
| E | 互动（进门/吃饭/睡觉/购物） |
| F | 上车 / 下车 |
| Esc | 释放鼠标 |

## 技术

- Vite + TypeScript + Three.js
- `@dimforge/rapier3d-compat`（物理世界已初始化；角色/车本切片用轻量 AABB 碰撞保证可玩帧率）
- 程序化 Canvas 纹理（柏油湿路、砖、抹灰、草地等），无第三方模型包

## 资源与许可

| 内容 | 许可 |
|---|---|
| 本仓库代码与程序化几何/纹理 | MIT |
| Noto Sans SC（Google Fonts） | OFL |
| 玩法循环参考 [uk-life](https://github.com/Oreva-Dev9112/uk-life) | MIT（仅参考，未复制其资源） |
| 街道密度参考 [slop-newyork](https://github.com/mrdoob/slop-newyork) | MIT（仅参考） |

**禁止使用** [Abby263/ai-agent-city-game](https://github.com/Abby263/ai-agent-city-game)（PolyForm 非商用）。本项目未使用该仓库任何资源。

后续若引入 Poly Haven 等贴图，须在本 README 与 `ATTRIBUTIONS.md` 注明 CC0/CC-BY。

## 切片范围

**已实现（v0.1）**

- 住宅楼外壳、院落绿化、门岗、内部道路
- 可进入的便利店与玩家公寓（吃饭 / 睡觉 / 换衣）
- 步行与驾车进出小区
- 日夜循环、湿路、路灯、便利店橱窗发光
- 饥饿、精力、现金；可在浏览器内完成一天循环

**延后**

- 南滨路夜景、江岸大桥、龙门浩老街（切片 2–4）
- 智能 NPC / LLM 对话
- 联机、枪战警察、全楼可进、手机端优化

## 后续架构（短）

1. **切片 2** 南滨路滨江商业带：分块加载（chunk streaming）+ 夜景点光预算  
2. **切片 3** 江岸 + 东水门式大桥：车辆路径与对岸天际线 LOD  
3. **切片 4** 龙门浩老街 + 学校：更密的窄街碰撞与室内模板  
4. **NPC** 行为树 / 日程表，对话后接可选 LLM，不全城实时推理  

独立仓库，不写入 canno3D / OutFitrev。
