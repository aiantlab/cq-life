#!/usr/bin/env bash
# Refresh Beibin OSM raw dump when Overpass is reachable, then re-run convert.
set -euo pipefail
OUT="$(dirname "$0")/../public/map/beibin-raw.json"
QUERY='[out:json][timeout:55];(way["highway"~"primary|secondary|tertiary|residential"](29.556,106.530,29.572,106.570);way["building"](29.558,106.535,29.570,106.562);way["waterway"="river"](29.552,106.525,29.575,106.575););out body geom;'
for url in https://overpass-api.de/api/interpreter https://overpass.kumi.systems/api/interpreter; do
  echo "Trying $url"
  if curl -sS --max-time 90 -X POST "$url" --data-binary "$QUERY" -o "$OUT"; then
    python3 -c "import json; d=json.load(open('$OUT')); assert len(d.get('elements',[]))>10"
    echo "OK -> $OUT"
    exit 0
  fi
done
echo "Overpass unreachable; keeping pinned extract."
exit 1
