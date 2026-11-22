# CQ Life — 江北北滨路 v0.3

浏览器端 Three.js 生活原型。

**开局：** 重庆市**江北区北滨路**沿线普通住宅小区。玩家住在本小区；出门即北滨路滨江干道（湿路、夜灯、嘉陵江倒影）。

**不是开局：** 渝中双钢路 / 钢院、东水门大桥、南滨路。后两者仍保留为**可选过江目的地**。

## 可玩循环

走路 / **跑步（Shift）** / **租共享单车骑北滨路** / 开车 → 回家吃饭、睡觉、换衣 → 便利店购物 → 日夜与饥饿/精力。

### 租车

1. 出小区门岗向南到北滨路江畔步道绿色租车站  
2. 按 **E** 租车 ¥5，自动进入骑行  
3. **WASD** 骑行；**F** 临时下车（车仍租用中，再按 F 继续骑）  
4. 回租车站按 **E** 还车  

## 本地运行

```bash
npm install
npm run dev
```

## 预览

- https://aiantlab.github.io/cq-life/
- https://github.com/aiantlab/cq-life

## 技术

- Vite + TypeScript + Three.js  
- AABB + 桥面高度场；江面 Reflector（远距关闭）  
- 程序化材质 MIT；无第三方城市资源包  

## 手感调参

见 `systems.ts`：`SEC_PER_GAME_HOUR=7`，饥饿/精力每秒消耗；相机 damp；碰撞 substeps。

## 后续（未做）

解放碑 / 洪崖洞等地标与主城九区 — 等 Boss。
