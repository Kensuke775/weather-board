/**
 * Japan prefecture GeoJSON → japanPrefectures.ts generator
 * Usage: node scripts/generate-prefecture-paths.mjs
 * Source: https://github.com/dataofjapan/land (MIT License)
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(__dirname, '../constants/japanPrefectures.ts');
const GEOJSON_URL = 'https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson';

// --- Ramer-Douglas-Peucker simplification ---
function perpendicularDistance(pt, lineStart, lineEnd) {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const mag = Math.hypot(dx, dy);
  if (mag === 0) return Math.hypot(pt[0] - lineStart[0], pt[1] - lineStart[1]);
  return Math.abs(dy * pt[0] - dx * pt[1] + lineEnd[0] * lineStart[1] - lineEnd[1] * lineStart[0]) / mag;
}

function rdp(points, epsilon) {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let maxIdx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > epsilon) {
    const left = rdp(points.slice(0, maxIdx + 1), epsilon);
    const right = rdp(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0], points[points.length - 1]];
}

// --- Geometry helpers ---
// Coordinate system: SVG x = lon, SVG y = 50 - lat  (y-axis flip)
const toSvgY = (lat) => 50 - lat;

function ringBboxArea(ring) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [lon, lat] of ring) {
    minX = Math.min(minX, lon); maxX = Math.max(maxX, lon);
    minY = Math.min(minY, lat); maxY = Math.max(maxY, lat);
  }
  return (maxX - minX) * (maxY - minY);
}

function largestRing(geometry) {
  let candidates = [];
  if (geometry.type === 'Polygon') {
    candidates = [geometry.coordinates[0]];
  } else if (geometry.type === 'MultiPolygon') {
    candidates = geometry.coordinates.map((poly) => poly[0]);
  }
  candidates.sort((a, b) => ringBboxArea(b) - ringBboxArea(a));
  return candidates[0];
}

function allRings(geometry) {
  if (geometry.type === 'Polygon') return [geometry.coordinates[0]];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.map((poly) => poly[0]);
  return [];
}

function ringToSvgPath(ring) {
  const simplified = rdp(ring, 0.02);
  return simplified
    .map(([lon, lat], i) => `${i === 0 ? 'M' : 'L'} ${lon.toFixed(3)},${toSvgY(lat).toFixed(3)}`)
    .join(' ') + ' Z';
}

function ringCentroid(ring) {
  let sumLon = 0, sumLat = 0;
  for (const [lon, lat] of ring) { sumLon += lon; sumLat += lat; }
  return {
    x: parseFloat((sumLon / ring.length).toFixed(3)),
    y: parseFloat(toSvgY(sumLat / ring.length).toFixed(3)),
  };
}

// Short display label (strip 都道府県 suffix, keep first 2 chars for tiny labels)
function shortName(namJa) {
  return namJa.replace(/[都府県]$/, '').replace(/道$/, '道'); // keep 道 for 北海道
}

// --- Fetch ---
function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// --- Main ---
async function main() {
  console.log('Fetching GeoJSON from dataofjapan/land...');
  const raw = await fetchText(GEOJSON_URL);
  const geojson = JSON.parse(raw);
  console.log(`Loaded ${geojson.features.length} features`);

  const prefectures = geojson.features.map((feature) => {
    const code = Number(feature.properties.id);
    const name = feature.properties.nam_ja;
    const label = shortName(name);
    const geometry = feature.geometry;

    // Largest polygon → main body path
    const mainRing = largestRing(geometry);
    const path = ringToSvgPath(mainRing);
    const centroid = ringCentroid(mainRing);

    // All rings combined for MultiPolygon prefectures (more accurate display)
    const rings = allRings(geometry);
    const fullPath = rings
      .map((ring) => {
        const simplified = rdp(ring, 0.02);
        if (simplified.length < 3) return '';
        return simplified
          .map(([lon, lat], i) => `${i === 0 ? 'M' : 'L'} ${lon.toFixed(3)},${toSvgY(lat).toFixed(3)}`)
          .join(' ') + ' Z';
      })
      .filter(Boolean)
      .join(' ');

    return { code, name, label, path: fullPath || path, centroid };
  });

  prefectures.sort((a, b) => a.code - b.code);

  // Determine viewBox: cover main Japan + Okinawa area
  // lon 122.9 ~ 145.8, lat 24 ~ 45.5 → y = 4.5 ~ 26
  const VIEWBOX = '123 4 24 23';

  const ts = `// 自動生成ファイル — scripts/generate-prefecture-paths.mjs で再生成
// 座標系: SVG x = 経度, SVG y = 50 - 緯度
// データソース: https://github.com/dataofjapan/land (MIT License)

export const JAPAN_VIEWBOX = '${VIEWBOX}';

export type Prefecture = {
  code: number;
  name: string;
  label: string;
  path: string;
  centroid: { x: number; y: number };
};

export const JAPAN_PREFECTURES: Prefecture[] = ${JSON.stringify(prefectures, null, 2)};
`;

  fs.writeFileSync(OUTPUT_PATH, ts, 'utf8');
  const sizeKB = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1);
  console.log(`Generated ${prefectures.length} prefectures → ${OUTPUT_PATH} (${sizeKB} KB)`);
  console.log('Sample:');
  prefectures.slice(0, 3).forEach((p) => {
    console.log(`  code=${p.code} name=${p.name} label=${p.label} centroid=(${p.centroid.x}, ${p.centroid.y})`);
  });
}

main().catch((err) => { console.error(err); process.exit(1); });
