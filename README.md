# CQ Life — 江北北滨路 v0.5

Browser Three.js life slice using the **Worldfolk method** on **Chongqing Jiangbei Beibin** geography (not an Accra skin-swap), with a **UK Life** day loop.

## Locked gameplay

- Spawn: **江北北滨路** ordinary residential compound
- Leave compound → Beibin Rd: **walk / run (Shift) / bike rental / drive**
- Home: eat / sleep / clothes / shower · Store · hunger / energy / hygiene / fun
- **Visible third-person player** in all move modes
- Pedestrians + limited traffic on Beibin (character hard-gate)

## Worldfolk method (Beibin)

Same roles as [Worldfolk](https://github.com/samuelaidoo45/worldfolk) (Apache-2.0) Accra map bundles, applied to Chongqing:

| Worldfolk role | Beibin artifact |
|---|---|
| map manifest | `public/maps/beibin-v1/manifest.json` |
| streets.json | `public/maps/beibin-v1/streets.json` (北滨路 + 支路中文名) |
| places.json | `public/maps/beibin-v1/places.json` |
| road GeoJSON layers | `public/maps/beibin-v1/layers.json` + `public/map/beibin-extract.json` |
| asphalt + pavement strips + markings | `src/game/mapmesh.ts` (class widths, normal offsets) |
| place/street labels | `src/game/worldfolk.ts` 3D sprites |
| minimap radar | canvas `#minimap` (roads / water / places / YOU) |
| OSM attribution | HUD + minimap caption |

3D is layered on real local-meter projection of the 北滨 corridor (+Z south toward 嘉陵江). Overpass refresh: `scripts/fetch-beibin-osm.sh`.

Attribution: © OpenStreetMap contributors (ODbL 1.0). Method inspiration: Worldfolk Apache-2.0.

## Character gate

`CHARACTER_GATE.txt` must be at Pages root. Source: `public/CHARACTER_GATE.txt` → Vite copies to `dist/`.

## Run

```bash
npm i && npm run dev
```

Preview: https://aiantlab.github.io/cq-life/

## Not in scope

Full 主城九区 · cinematic GTA6 · canno3D repos
