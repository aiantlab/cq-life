# CQ Life — 江北北滨路 v0.4

Browser Three.js life slice grounded in **real-map geography** (Worldfolk-style OSM layers) with a **UK Life** day loop.

## Locked gameplay

- Spawn: **江北北滨路** ordinary residential compound (not 渝中双钢路)
- Leave compound → Beibin Rd: **walk / run (Shift) / bike rental / drive**
- Home: eat / sleep / clothes / shower · Store · hunger / energy / hygiene / fun
- **Visible third-person player character** (not freecam)
- Pedestrians + limited traffic on Beibin for inhabited streets

## Map approach (Worldfolk-inspired)

- Pinned extract `public/map/beibin-extract.json`: road polylines, building footprints+levels, water ring, POIs
- Runtime: ribbons for roads, extruded footprints for buildings (same schema pattern as Worldfolk OSM consumers)
- Lon samples from real 北滨路 corridor → local meters; Overpass refresh script when network allows
- Attribution: © OpenStreetMap contributors (ODbL)

## Visual / atmosphere

- Wet arterial, street lamps, neon ground floors, river Reflector
- Ambient pedestrians on sidewalks/crossings + limited cars on Beibin
- Procedural humanoids (original, commercial-OK) with walk/run limb cycles

## Run

```bash
npm i && npm run dev
```

Preview: https://aiantlab.github.io/cq-life/

## Not in scope

Full 主城九区 landmarks · cinematic GTA6 fidelity · canno3D repos
