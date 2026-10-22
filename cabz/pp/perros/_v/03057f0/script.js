import * as maplibregl from "https://unpkg.com/maplibre-gl@6.8.0/dist/maplibre-gl.mjs";

// The other libraries are loaded by classic <script> tags in index.html.
// Capture them explicitly from window so this ES module does not rely on
// implicit global-name lookup.
const Papa = window.Papa;
const turf = window.turf;
const RBushCtor = window.RBush || window.rbush;

if (!Papa) throw new Error("Papa Parse failed to load.");
if (!turf) throw new Error("Turf failed to load.");
if (!RBushCtor) throw new Error("RBush failed to load.");

const DATASETS = {
  rafi: "./data/rafi_pos.csv",
  noar: "./data/noar_pos.csv",
};

const FILES = {
  vegetation: "./data/vegetation_large.geojson",
  roads: "./data/roads.geojson",
  rivers: "./data/rios.geojson",
};

const MAP_IDS = {
  srcVeg: "src_veg",
  lyrVegFill: "lyr_veg_fill",
  lyrVegLine: "lyr_veg_line",
  srcRoads: "src_roads",
  lyrRoads: "lyr_roads",
  srcRivers: "src_rivers",
  lyrRivers: "lyr_rivers",
  srcPointsVisible: "src_points_visible",
  srcTrackVisible: "src_track_visible",
  lyrPoints: "lyr_points",
  lyrTrack: "lyr_track",
};

const DOG_TRACE_COLORS = {
  rafi: "#A56A2E",
  noar: "#3F3126",
};

const VEGETATION_CLASS_ORDER = [
  "forest",
  "woodland",
  "bushland",
  "grassland",
  "bare soil",
  "inland water",
  "swamp",
  "urban area",
];

const VEGETATION_CLASS_COLORS = {
  woodland: "#1b9e77",
  grassland: "#e6ab02",
  bushland: "#fb9a99",
  "bare soil": "#a6761d",
  "inland water": "#1f78b4",
  forest: "#66a61e",
  swamp: "#7570b3",
  "cultivated land": "#666666",
  "urban area": "#666666",
};

const PALETTE = [
  "#1b9e77",
  "#d95f02",
  "#7570b3",
  "#e7298a",
  "#66a61e",
  "#e6ab02",
  "#a6761d",
  "#666666",
  "#1f78b4",
  "#33a02c",
  "#fb9a99",
  "#cab2d6",
  "#b2df8a",
  "#fdbf6f",
  "#6a3d9a",
];

const CANDIDATE_CLASS_FIELDS = [
  "landcover",
  "landcover_type",
  "land_cover",
  "lc_type",
  "veg_type",
  "vegetation",
  "vegetation_type",
  "habitat",
  "habitat_type",
  "class",
  "class_name",
  "type",
  "category",
  "name",
];

const PLAY_STEP_MS = 110;

const OVERLAY = {
  bgImage: "./assets/background.png",
  dogs: {
    rafi: "./assets/rafi.webp",
    noar: "./assets/noar.webp",
  },
  tiles: {
    grass: "./assets/tiles/grass.svg",
    forest: "./assets/tiles/forest.svg",
    scrub: "./assets/tiles/scrub.svg",
    dry: "./assets/tiles/dry.svg",
  },
  tileScale: 0.35,
  vegetationOffsetY: 80,
  tileFilter: "saturate(0.9) brightness(0.96) hue-rotate(-4deg)",
  speedPxPerSec: 80,
  backgroundSpeedPxPerSec: 22,
  dogBottomPx: 20,
};

const state = {
  currentDatasetKey: "rafi",
  rowsAll: [],
  pointsAll: null,
  timeField: null,
  lonField: null,
  latField: null,
  orderField: null,
  cumDistKm: [],
  totalDistKm: 0,
  vegGeo: null,
  vegClassField: null,
  vegIndex: null,
  vegClassCache: new Map(),
  wheelTarget: 0,
  wheelAnimating: false,
  isPlaying: false,
  playbackLastMs: performance.now(),
  playbackAccMs: 0,
  layersVisible: {
    vegetation: true,
    roads: true,
    rivers: true,
  },
  overlayDogAssets: {
    rafi: null,
    noar: null,
  },
};

const dom = {
  csvTitle: document.getElementById("csvTitle"),
  csvTable: document.getElementById("csvTable"),
  leftBody: document.getElementById("leftBody"),
  vslider: document.getElementById("vslider"),
  vegMeta: document.getElementById("vegMeta"),
  vegLegend: document.getElementById("vegLegend"),
  idxEl: document.getElementById("idx"),
  totalEl: document.getElementById("total"),
  timeEl: document.getElementById("time"),
  lonlatEl: document.getElementById("lonlat"),
  vegClassEl: document.getElementById("vegClass"),
  distNowEl: document.getElementById("distNow"),
  distTotalEl: document.getElementById("distTotal"),
  playBtn: document.getElementById("playBtn"),
  playLabel: document.getElementById("playLabel"),
  overlayBgVideo: document.getElementById("overlayBgVideo"),
  overlayDog: document.getElementById("overlayDog"),
  overlayVegCanvas: document.getElementById("overlayVegCanvas"),
  overlayHabitatLabel: document.getElementById("overlayHabitatLabel"),
  toggleVegetation: document.getElementById("toggleVegetation"),
  toggleRoads: document.getElementById("toggleRoads"),
  toggleRivers: document.getElementById("toggleRivers"),
  datasetSwitch: document.getElementById("datasetSwitch"),
  datasetRafiLabel: document.getElementById("datasetRafiLabel"),
  datasetNoarLabel: document.getElementById("datasetNoarLabel"),
};

function ensureLeftHeaderDates() {
  let el = document.getElementById("csvDates");
  if (!el) {
    const info = dom.csvTitle.parentElement;
    el = document.createElement("div");
    el.id = "csvDates";
    el.className = "header-dates";
    info.appendChild(el);
  }
  return el;
}

function findColumnInsensitive(fields, candidates) {
  const lower = fields.map((f) => String(f).toLowerCase());
  for (const c of candidates) {
    const idx = lower.indexOf(c);
    if (idx !== -1) return fields[idx];
  }
  return null;
}

function detectOrderField(rows) {
  const fields = rows?.[0] ? Object.keys(rows[0]) : [];
  if (!fields.length) return null;

  const firstField = fields[0];
  const sample = rows.slice(0, Math.min(10, rows.length));
  const numericEnough = sample.every((r) => {
    const v = r[firstField];
    return (
      v !== null &&
      v !== undefined &&
      String(v).trim() !== "" &&
      Number.isFinite(Number(v))
    );
  });

  if (numericEnough) return firstField;

  return findColumnInsensitive(fields, [
    "id",
    "index",
    "order",
    "seq",
    "sequence",
    "unnamed: 0",
  ]);
}

async function loadText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return await res.text();
}

async function loadJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return await res.json();
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function detectLonLatFields(rows) {
  const fields = rows?.[0] ? Object.keys(rows[0]) : [];
  const lon = findColumnInsensitive(fields, [
    "lon",
    "long",
    "longitude",
    "x",
    "lng",
    "easting",
  ]);
  const lat = findColumnInsensitive(fields, [
    "lat",
    "latitude",
    "y",
    "northing",
  ]);
  return { lon, lat, fields };
}

function detectTimeField(rows) {
  const fields = rows?.[0] ? Object.keys(rows[0]) : [];
  return findColumnInsensitive(fields, [
    "timestamp",
    "time",
    "datetime",
    "date_time",
    "date",
    "dt",
    "fix_time",
    "gps_time",
  ]);
}

function parseDateFlexible(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  let m = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  );
  if (m) {
    let [, d, mo, y, h = "0", mi = "0", s = "0"] = m;
    let year = Number(y);
    if (year < 100) year += 2000;
    const ts = new Date(
      year,
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s),
    ).getTime();
    return Number.isNaN(ts) ? null : ts;
  }

  m = raw.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  );
  if (m) {
    const [, y, mo, d, h = "0", mi = "0", s = "0"] = m;
    const ts = new Date(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s),
    ).getTime();
    return Number.isNaN(ts) ? null : ts;
  }

  return null;
}

function rowsToPoints(rows, lonKey, latKey) {
  const features = [];
  for (const r of rows) {
    const lon = Number(r[lonKey]);
    const lat = Number(r[latKey]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: { ...r },
    });
  }
  return { type: "FeatureCollection", features };
}

function sortPointsByOrderOrTime(fc, orderKey, timeKey) {
  const enriched = fc.features.map((feature, originalIndex) => {
    const orderRaw = orderKey ? feature.properties?.[orderKey] : null;
    const orderNum = Number(orderRaw);
    const parsedTs = timeKey
      ? parseDateFlexible(feature.properties?.[timeKey])
      : null;

    return {
      feature,
      originalIndex,
      orderNum: Number.isFinite(orderNum) ? orderNum : null,
      parsedTs,
    };
  });

  if (orderKey && enriched.every((x) => x.orderNum !== null)) {
    enriched.sort((a, b) => {
      if (a.orderNum !== b.orderNum) return a.orderNum - b.orderNum;
      return a.originalIndex - b.originalIndex;
    });
    return {
      type: "FeatureCollection",
      features: enriched.map((x) => x.feature),
    };
  }

  if (timeKey) {
    enriched.sort((a, b) => {
      const aValid = a.parsedTs !== null;
      const bValid = b.parsedTs !== null;
      if (aValid && bValid) {
        if (a.parsedTs !== b.parsedTs) return a.parsedTs - b.parsedTs;
        return a.originalIndex - b.originalIndex;
      }
      if (aValid && !bValid) return -1;
      if (!aValid && bValid) return 1;
      return a.originalIndex - b.originalIndex;
    });
    return {
      type: "FeatureCollection",
      features: enriched.map((x) => x.feature),
    };
  }

  return fc;
}

function precomputeDistances(pointsAll) {
  if (!pointsAll || pointsAll.features.length === 0) {
    return { cumDistKm: [], totalDistKm: 0 };
  }

  const cumDistKm = new Array(pointsAll.features.length).fill(0);
  let sum = 0;

  for (let i = 1; i < pointsAll.features.length; i++) {
    const a = pointsAll.features[i - 1].geometry.coordinates;
    const b = pointsAll.features[i].geometry.coordinates;
    const d = turf.distance(turf.point(a), turf.point(b), {
      units: "kilometers",
    });
    if (Number.isFinite(d)) sum += d;
    cumDistKm[i] = sum;
  }

  return { cumDistKm, totalDistKm: sum };
}

function buildVisiblePoints(fcAll, idxInclusive) {
  const n = Math.max(0, Math.min(fcAll.features.length, idxInclusive + 1));
  return {
    type: "FeatureCollection",
    features: fcAll.features.slice(0, n),
  };
}

// GeoJSON LineString requires at least two positions. Returning an empty
// FeatureCollection for the first point prevents MapLibre validation errors.
function buildVisibleTrack(fcVisible) {
  const coords = fcVisible.features.map((f) => f.geometry.coordinates);
  if (coords.length < 2) {
    return { type: "FeatureCollection", features: [] };
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "LineString", coordinates: coords },
        properties: { n_points: coords.length },
      },
    ],
  };
}

function computeBoundsPoints(fc) {
  const bounds = new maplibregl.LngLatBounds();
  let hasAny = false;
  for (const f of fc.features) {
    const c = f.geometry?.coordinates;
    if (!c) continue;
    bounds.extend(c);
    hasAny = true;
  }
  return hasAny ? bounds : null;
}

function detectClassField(geojson) {
  const f = geojson?.features?.find((x) => x && x.properties);
  const keys = f ? Object.keys(f.properties) : [];
  const lower = keys.map((k) => k.toLowerCase());

  for (const wanted of CANDIDATE_CLASS_FIELDS) {
    const idx = lower.indexOf(wanted.toLowerCase());
    if (idx !== -1) return keys[idx];
  }

  for (const k of keys) {
    const v = f.properties[k];
    if (typeof v === "string" && v.trim().length > 0) return k;
  }

  return null;
}

function distinctValues(geojson, field, limit = 1000) {
  const set = new Set();
  for (const f of geojson.features) {
    const v = f?.properties?.[field];
    if (v !== null && v !== undefined && String(v).trim() !== "") {
      set.add(String(v));
    }
    if (set.size >= limit) break;
  }
  return Array.from(set);
}

function normalizeVegetationKey(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function canonicalizeVegetationClass(value) {
  const key = normalizeVegetationKey(value);
  if (!key) return null;

  if (
    key === "forest" ||
    key.includes("closed forest") ||
    key.includes("evergreen forest") ||
    key.includes("deciduous forest")
  ) return "forest";

  if (
    key === "woodland" ||
    key.includes("woodland") ||
    key.includes("open woodland")
  ) return "woodland";

  if (
    key === "bushland" ||
    key.includes("bushland") ||
    key.includes("shrubland") ||
    key.includes("scrubland")
  ) return "bushland";

  if (
    key === "grassland" ||
    key.includes("grassland") ||
    key.includes("grass")
  ) return "grassland";

  if (
    key === "bare soil" ||
    key.includes("bare soil") ||
    key.includes("bare ground") ||
    key.includes("soil") ||
    key.includes("sand") ||
    key.includes("rock")
  ) return "bare soil";

  if (
    key === "inland water" ||
    key.includes("inland water") ||
    key === "water" ||
    key.includes("river") ||
    key.includes("lake")
  ) return "inland water";

  if (key === "swamp" || key.includes("swamp") || key.includes("wetland")) {
    return "swamp";
  }

  if (
    key === "urban area" ||
    key.includes("urban area") ||
    key.includes("urban") ||
    key.includes("built up") ||
    key.includes("built-up") ||
    key.includes("settlement") ||
    key.includes("developed") ||
    key === "cultivated land" ||
    key.includes("cultivated land") ||
    key.includes("cultivation") ||
    key.includes("cropland") ||
    key.includes("agriculture") ||
    key.includes("farmland") ||
    key.includes("fields")
  ) return "urban area";

  return key;
}

function getVegetationColor(value, fallbackIndex = 0) {
  const canonical = canonicalizeVegetationClass(value);
  if (
    canonical &&
    Object.prototype.hasOwnProperty.call(VEGETATION_CLASS_COLORS, canonical)
  ) {
    return VEGETATION_CLASS_COLORS[canonical];
  }
  return PALETTE[fallbackIndex % PALETTE.length];
}

function sortCanonicalVegetationValues(values) {
  return values.slice().sort((a, b) => {
    const ia = VEGETATION_CLASS_ORDER.indexOf(a);
    const ib = VEGETATION_CLASS_ORDER.indexOf(b);
    const aa = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
    const bb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
    if (aa !== bb) return aa - bb;
    return a.localeCompare(b);
  });
}

function getCanonicalVegetationValues(rawValues) {
  const seen = new Set();
  rawValues.forEach((value) => {
    const canonical = canonicalizeVegetationClass(value);
    if (canonical) seen.add(canonical);
  });
  return sortCanonicalVegetationValues(Array.from(seen));
}

function buildMatchExpression(field, rawValues) {
  const expr = ["match", ["downcase", ["to-string", ["get", field]]]];
  rawValues.forEach((v, i) => {
    expr.push(String(v).trim().toLowerCase());
    expr.push(getVegetationColor(v, i));
  });
  expr.push("rgba(0,0,0,0)");
  return expr;
}

function renderVegetationLegend(targetEl, vegGeo, field, canonicalValues) {
  targetEl.innerHTML = "";

  const title = document.createElement("div");
  title.className = "legend-title";
  title.textContent = "Legend";
  targetEl.appendChild(title);

  if (!vegGeo) {
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = "Vegetation not available.";
    targetEl.appendChild(meta);
    return;
  }

  if (!field) {
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = "No class field detected.";
    targetEl.appendChild(meta);
    return;
  }

  canonicalValues.forEach((v, i) => {
    const item = document.createElement("div");
    item.className = "legend-item";

    const sw = document.createElement("div");
    sw.className = "swatch";
    sw.style.background = getVegetationColor(v, i);

    const label = document.createElement("div");
    label.textContent = v;

    item.appendChild(sw);
    item.appendChild(label);
    targetEl.appendChild(item);
  });
}

function buildVegetationIndexSafe(veg) {
  const idx = new RBushCtor();
  const items = [];
  let skipped = 0;

  for (let i = 0; i < veg.features.length; i++) {
    const feat = veg.features[i];
    if (!feat) {
      skipped++;
      continue;
    }

    try {
      const bb = turf.bbox(feat);
      if (!bb || bb.length !== 4) {
        skipped++;
        continue;
      }
      if (![bb[0], bb[1], bb[2], bb[3]].every(Number.isFinite)) {
        skipped++;
        continue;
      }

      items.push({
        minX: bb[0],
        minY: bb[1],
        maxX: bb[2],
        maxY: bb[3],
        featureIndex: i,
      });
    } catch {
      skipped++;
    }
  }

  idx.load(items);
  return { index: idx, stats: { loaded: items.length, skipped } };
}

function getVegetationClassForPointIdx(pointIdx) {
  if (!(state.vegGeo && state.vegClassField && state.pointsAll)) return "–";
  if (!Number.isFinite(pointIdx)) return "–";
  if (state.vegClassCache.has(pointIdx)) {
    return state.vegClassCache.get(pointIdx);
  }

  try {
    const f = state.pointsAll.features[pointIdx];
    if (!f) return "–";

    const [lon, lat] = f.geometry.coordinates;
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return "–";

    const pt = turf.point([lon, lat]);

    if (state.vegIndex) {
      const candidates = state.vegIndex.search({
        minX: lon,
        minY: lat,
        maxX: lon,
        maxY: lat,
      });

      if (candidates?.length) {
        for (const item of candidates) {
          const poly = state.vegGeo.features[item.featureIndex];
          if (!poly) continue;

          let inside = false;
          try {
            inside = turf.booleanPointInPolygon(pt, poly);
          } catch {
            continue;
          }

          if (inside) {
            const clsRaw = poly.properties?.[state.vegClassField];
            const cls =
              clsRaw === null ||
              clsRaw === undefined ||
              String(clsRaw).trim() === ""
                ? "Match (no class)"
                : canonicalizeVegetationClass(String(clsRaw));

            state.vegClassCache.set(pointIdx, cls);
            return cls;
          }
        }
      }
    }

    // Fallback scan in case a polygon was skipped by the spatial index.
    for (const poly of state.vegGeo.features) {
      if (!poly) continue;

      let inside = false;
      try {
        inside = turf.booleanPointInPolygon(pt, poly);
      } catch {
        continue;
      }

      if (inside) {
        const clsRaw = poly.properties?.[state.vegClassField];
        const cls =
          clsRaw === null ||
          clsRaw === undefined ||
          String(clsRaw).trim() === ""
            ? "Match (no class)"
            : canonicalizeVegetationClass(String(clsRaw));

        state.vegClassCache.set(pointIdx, cls);
        return cls;
      }
    }

    state.vegClassCache.set(pointIdx, "No match");
    return "No match";
  } catch (e) {
    console.warn("getVegetationClassForPointIdx failed:", e);
    state.vegClassCache.set(pointIdx, "–");
    return "–";
  }
}

function createMap() {
  const createdMap = new maplibregl.Map({
    container: "map",
    style: {
      version: 8,
      sources: {
        satellite: {
          type: "raster",
          tiles: [
            "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution: "Imagery © Esri and contributors",
        },
      },
      layers: [{ id: "satellite", type: "raster", source: "satellite" }],
    },
    center: [32, -7],
    zoom: 6,
  });

  createdMap.addControl(
    new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }),
    "bottom-right",
  );

  return createdMap;
}

function ensureGpsLayers(map) {
  if (!map.getSource(MAP_IDS.srcPointsVisible)) {
    map.addSource(MAP_IDS.srcPointsVisible, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }

  if (!map.getSource(MAP_IDS.srcTrackVisible)) {
    map.addSource(MAP_IDS.srcTrackVisible, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }

  if (!map.getLayer(MAP_IDS.lyrTrack)) {
    map.addLayer({
      id: MAP_IDS.lyrTrack,
      type: "line",
      source: MAP_IDS.srcTrackVisible,
      paint: {
        "line-color": DOG_TRACE_COLORS.rafi,
        "line-width": 2.2,
        "line-opacity": 1,
      },
    });
  }

  if (!map.getLayer(MAP_IDS.lyrPoints)) {
    map.addLayer({
      id: MAP_IDS.lyrPoints,
      type: "circle",
      source: MAP_IDS.srcPointsVisible,
      paint: {
        "circle-radius": 3.1,
        "circle-color": DOG_TRACE_COLORS.rafi,
        "circle-opacity": 1,
        "circle-stroke-color": "#000",
        "circle-stroke-width": 0.7,
      },
    });
  }
}

function applyDogTraceColor() {
  const color =
    DOG_TRACE_COLORS[state.currentDatasetKey] || DOG_TRACE_COLORS.rafi;

  if (map.getLayer(MAP_IDS.lyrTrack)) {
    map.setPaintProperty(MAP_IDS.lyrTrack, "line-color", color);
  }

  if (map.getLayer(MAP_IDS.lyrPoints)) {
    map.setPaintProperty(MAP_IDS.lyrPoints, "circle-color", color);
  }
}

function updateGpsLayers(map, visiblePoints, visibleTrack) {
  const pointsSource = map.getSource(MAP_IDS.srcPointsVisible);
  const trackSource = map.getSource(MAP_IDS.srcTrackVisible);
  if (pointsSource) pointsSource.setData(visiblePoints);
  if (trackSource) trackSource.setData(visibleTrack);
}

function enforceLayerOrder(map) {
  if (map.getLayer(MAP_IDS.lyrRivers)) map.moveLayer(MAP_IDS.lyrRivers);
  if (map.getLayer(MAP_IDS.lyrRoads)) map.moveLayer(MAP_IDS.lyrRoads);
  if (map.getLayer(MAP_IDS.lyrTrack)) map.moveLayer(MAP_IDS.lyrTrack);
  if (map.getLayer(MAP_IDS.lyrPoints)) map.moveLayer(MAP_IDS.lyrPoints);
}

function buildTable(rows, onRowClick) {
  dom.csvTable.innerHTML = "";
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const thead = document.createElement("thead");
  const trh = document.createElement("tr");

  headers.forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    trh.appendChild(th);
  });
  thead.appendChild(trh);

  const tbody = document.createElement("tbody");
  rows.forEach((r, i) => {
    const tr = document.createElement("tr");
    tr.dataset.idx = String(i);

    headers.forEach((h) => {
      const td = document.createElement("td");
      const v = r[h];
      td.textContent = v === null || v === undefined ? "" : String(v);
      tr.appendChild(td);
    });

    tr.addEventListener("click", () => onRowClick(i));
    tbody.appendChild(tr);
  });

  dom.csvTable.appendChild(thead);
  dom.csvTable.appendChild(tbody);
}

function setActiveRow(idx) {
  const tr = dom.csvTable.querySelector(`tbody tr[data-idx="${idx}"]`);
  if (!tr) return;

  dom.csvTable
    .querySelectorAll("tbody tr.active")
    .forEach((x) => x.classList.remove("active"));
  tr.classList.add("active");
  tr.scrollIntoView({ block: "nearest" });
}

function formatEventDate(value) {
  if (!value) return "–";
  const ts = parseDateFlexible(value);
  if (ts === null) return String(value);

  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

function updateLeftHeaderDates() {
  const el = ensureLeftHeaderDates();

  if (!state.rowsAll.length || !state.timeField) {
    el.textContent = `${state.rowsAll.length} points`;
    return;
  }

  const first = state.rowsAll[0]?.[state.timeField];
  const last = state.rowsAll[state.rowsAll.length - 1]?.[state.timeField];
  el.textContent = `${formatEventDate(first)} → ${formatEventDate(last)} (${state.rowsAll.length} points)`;
}

async function loadImageElement(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function captureStillFrameFromAnimatedImage(url) {
  try {
    const img = await loadImageElement(url);
    if (!img) return null;

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);

    return canvas.toDataURL("image/png");
  } catch (e) {
    console.warn("captureStillFrameFromAnimatedImage failed:", e);
    return null;
  }
}

async function preloadOverlayDogs() {
  const keys = Object.keys(OVERLAY.dogs);

  await Promise.all(
    keys.map(async (key) => {
      const animated = OVERLAY.dogs[key];
      const still = await captureStillFrameFromAnimatedImage(animated);
      state.overlayDogAssets[key] = {
        animated,
        still: still || animated,
      };
    }),
  );
}

function resolveOverlayDogSrc(src, datasetKey, animated) {
  if (!src) return src;
  if (String(src).startsWith("data:")) return src;

  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}dog=${encodeURIComponent(datasetKey)}&mode=${animated ? "animated" : "still"}`;
}

function setOverlayDogImage(datasetKey, animated = false) {
  if (!dom.overlayDog) return;

  const asset = state.overlayDogAssets[datasetKey] || {
    animated: OVERLAY.dogs[datasetKey] || OVERLAY.dogs.rafi,
    still: OVERLAY.dogs[datasetKey] || OVERLAY.dogs.rafi,
  };

  const rawSrc = animated ? asset.animated : asset.still;
  const nextSrc = resolveOverlayDogSrc(rawSrc, datasetKey, animated);

  dom.overlayDog.alt = `${datasetKey} wild dog`;
  dom.overlayDog.style.bottom = `${OVERLAY.dogBottomPx}px`;

  if (dom.overlayDog.dataset.currentSrc === nextSrc) return;
  dom.overlayDog.dataset.currentSrc = nextSrc;
  dom.overlayDog.removeAttribute("src");

  requestAnimationFrame(() => {
    dom.overlayDog.src = nextSrc;
  });
}

class OverlayPlayer {
  constructor({ bgVideoEl, vegCanvasEl, labelEl }) {
    this.bgVideoEl = bgVideoEl;
    this.vegCanvasEl = vegCanvasEl;
    this.labelEl = labelEl;
    this.ctx = this.vegCanvasEl.getContext("2d", {
      alpha: true,
      desynchronized: true,
    });
    if (!this.ctx) throw new Error("Could not create vegetation canvas context.");

    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.images = new Map();
    this.segments = [];
    this.currentTileKey = "grass";
    this.running = false;
    this.lastMs = performance.now();
    this.bgScrollPx = 0;
    this.width = 1;
    this.height = 1;
  }

  async init() {
    await this.preloadTiles();
    await preloadOverlayDogs();
    this.setupScrollingBackground();
    this.resize();
    this.resetSegments();
    window.addEventListener("resize", () => this.resize());
  }

  async preloadTiles() {
    const entries = Object.entries(OVERLAY.tiles);
    await Promise.all(
      entries.map(async ([key, url]) => {
        const img = await this.loadImage(url);
        this.images.set(key, img);
      }),
    );
  }

  loadImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  setupScrollingBackground() {
    if (!this.bgVideoEl) return;
    this.bgVideoEl.style.backgroundImage = `url("${OVERLAY.bgImage}")`;
    this.bgVideoEl.style.backgroundRepeat = "repeat-x";
    this.bgVideoEl.style.backgroundPosition = "0px center";
    this.bgVideoEl.style.backgroundSize = "auto 100%";
    this.bgVideoEl.style.objectFit = "cover";
  }

  updateScrollingBackground() {
    if (!this.bgVideoEl) return;
    this.bgVideoEl.style.backgroundPosition = `${-this.bgScrollPx}px center`;
  }

  resize() {
    const rect = this.vegCanvasEl.getBoundingClientRect();
    this.width = Math.max(1, Math.floor(rect.width));
    this.height = Math.max(1, Math.floor(rect.height));

    this.vegCanvasEl.width = Math.floor(this.width * this.dpr);
    this.vegCanvasEl.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.resetSegments();
  }

  getTileDrawSize(tileKey) {
    const img = this.images.get(tileKey);
    if (!img) return { width: 240, height: 120 };

    const naturalW = img.naturalWidth || img.width || 240;
    const naturalH = img.naturalHeight || img.height || 120;
    return {
      width: naturalW * OVERLAY.tileScale,
      height: naturalH * OVERLAY.tileScale,
    };
  }

  createSegment(x, tileKey) {
    const size = this.getTileDrawSize(tileKey);
    return {
      x,
      tileKey,
      width: size.width,
      height: size.height,
    };
  }

  resetSegments() {
    const fillKey = this.currentTileKey || "grass";
    const firstSize = this.getTileDrawSize(fillKey);
    const tileWidth = Math.max(1, firstSize.width);
    const needed = Math.ceil(this.width / tileWidth) + 3;
    this.segments = [];

    let x = -tileWidth;
    for (let i = 0; i < needed; i++) {
      this.segments.push(this.createSegment(x, fillKey));
      x += tileWidth;
    }
  }

  setVegetationClass(rawClass) {
    const nextTileKey = this.mapVegetationClassToTile(rawClass);
    this.currentTileKey = nextTileKey;
    if (this.labelEl) this.labelEl.textContent = rawClass || "–";
  }

  mapVegetationClassToTile(rawClass) {
    if (!rawClass) return "grass";
    const v = String(rawClass).toLowerCase();

    if (v.includes("forest") || v.includes("wood") || v.includes("tree")) {
      return "forest";
    }
    if (v.includes("scrub") || v.includes("shrub") || v.includes("bush")) {
      return "scrub";
    }
    if (
      v.includes("dry") ||
      v.includes("bare") ||
      v.includes("sand") ||
      v.includes("rock")
    ) {
      return "dry";
    }
    return "grass";
  }

  setRunning(next) {
    this.running = !!next;
  }

  tick(nowMs) {
    const dtMs = clamp(nowMs - this.lastMs, 0, 60);
    this.lastMs = nowMs;
    const dt = dtMs / 1000;

    if (this.running) {
      this.bgScrollPx += OVERLAY.backgroundSpeedPxPerSec * dt;
      this.updateScrollingBackground();
      this.advance(dt);
    }

    this.render();
  }

  advance(dt) {
    let rightMost = -Infinity;
    for (const s of this.segments) {
      rightMost = Math.max(rightMost, s.x + s.width);
    }

    for (const s of this.segments) {
      s.x -= OVERLAY.speedPxPerSec * dt;

      if (s.x + s.width <= -2) {
        const nextSeg = this.createSegment(rightMost, this.currentTileKey);
        s.x = nextSeg.x;
        s.tileKey = nextSeg.tileKey;
        s.width = nextSeg.width;
        s.height = nextSeg.height;
        rightMost = s.x + s.width;
      }
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.save();
    this.ctx.filter = OVERLAY.tileFilter || "none";

    for (const s of this.segments) {
      const img = this.images.get(s.tileKey) ?? null;

      if (img) {
        const y = this.height - s.height + OVERLAY.vegetationOffsetY;
        this.ctx.drawImage(img, s.x, y, s.width, s.height);
      } else {
        const fallbackH = 120 * OVERLAY.tileScale;
        const y = this.height - fallbackH + OVERLAY.vegetationOffsetY;
        this.ctx.save();
        this.ctx.fillStyle = "rgba(255,255,255,0.12)";
        this.ctx.fillRect(s.x, y, 240 * OVERLAY.tileScale, fallbackH);
        this.ctx.restore();
      }
    }

    this.ctx.restore();
  }
}

const map = createMap();
const overlay = new OverlayPlayer({
  bgVideoEl: dom.overlayBgVideo,
  vegCanvasEl: dom.overlayVegCanvas,
  labelEl: dom.overlayHabitatLabel,
});

function setToggleState(button, isOn) {
  button.classList.toggle("is-on", isOn);
  button.setAttribute("aria-pressed", String(isOn));

  const row = button.closest(".toggle-row");
  if (row) row.classList.toggle("is-off", !isOn);
}

function applyLayerVisibility() {
  if (map.getLayer(MAP_IDS.lyrVegFill)) {
    map.setLayoutProperty(
      MAP_IDS.lyrVegFill,
      "visibility",
      state.layersVisible.vegetation ? "visible" : "none",
    );
  }
  if (map.getLayer(MAP_IDS.lyrVegLine)) {
    map.setLayoutProperty(
      MAP_IDS.lyrVegLine,
      "visibility",
      state.layersVisible.vegetation ? "visible" : "none",
    );
  }
  if (map.getLayer(MAP_IDS.lyrRoads)) {
    map.setLayoutProperty(
      MAP_IDS.lyrRoads,
      "visibility",
      state.layersVisible.roads ? "visible" : "none",
    );
  }
  if (map.getLayer(MAP_IDS.lyrRivers)) {
    map.setLayoutProperty(
      MAP_IDS.lyrRivers,
      "visibility",
      state.layersVisible.rivers ? "visible" : "none",
    );
  }
}

function setDatasetUi() {
  const isRafi = state.currentDatasetKey === "rafi";
  dom.datasetSwitch.classList.toggle("is-on", isRafi);
  dom.datasetSwitch.setAttribute("aria-pressed", String(isRafi));
  dom.datasetRafiLabel.classList.toggle("is-active", isRafi);
  dom.datasetNoarLabel.classList.toggle("is-active", !isRafi);
  dom.csvTitle.textContent = isRafi ? "rafi_pos.csv" : "noar_pos.csv";

  setOverlayDogImage(state.currentDatasetKey, state.isPlaying);
  applyDogTraceColor();
}

function setInspector(idx) {
  if (!state.pointsAll || state.pointsAll.features.length === 0) return;

  const clamped = Math.max(
    0,
    Math.min(state.pointsAll.features.length - 1, idx),
  );
  const f = state.pointsAll.features[clamped];

  dom.idxEl.textContent = String(clamped + 1);
  dom.totalEl.textContent = String(state.pointsAll.features.length);

  const t = state.timeField ? (f.properties?.[state.timeField] ?? "–") : "–";
  dom.timeEl.textContent = String(t);

  const [lon, lat] = f.geometry.coordinates;
  dom.lonlatEl.innerHTML = `lat ${lat.toFixed(5)}<br>lon ${lon.toFixed(5)}`;

  const nowKm = state.cumDistKm[clamped] ?? 0;
  dom.distNowEl.textContent = `${nowKm.toFixed(2)} km`;
  dom.distTotalEl.textContent = `${state.totalDistKm.toFixed(2)} km`;
}

function updateVegetationClass(pointIdx) {
  const vegClass = getVegetationClassForPointIdx(pointIdx);
  dom.vegClassEl.textContent = vegClass;
  overlay.setVegetationClass(vegClass);
}

function updateVisible(idx) {
  if (!state.pointsAll || !state.pointsAll.features.length) return;

  const visible = buildVisiblePoints(state.pointsAll, idx);
  const track = buildVisibleTrack(visible);

  updateGpsLayers(map, visible, track);
  setInspector(idx);
  setActiveRow(idx);
  updateVegetationClass(idx);
  enforceLayerOrder(map);
}

function setIndex(nextIdx) {
  if (!state.pointsAll || !state.pointsAll.features.length) return;

  const idx = Math.max(
    0,
    Math.min(state.pointsAll.features.length - 1, Number(nextIdx) || 0),
  );

  dom.vslider.value = String(idx);
  updateVisible(idx);
}

function animateWheelScrub() {
  const current = Number(dom.vslider.value || 0);
  if (current === state.wheelTarget) {
    state.wheelAnimating = false;
    return;
  }

  const diff = state.wheelTarget - current;
  const step = Math.sign(diff) * Math.max(1, Math.round(Math.abs(diff) * 0.22));
  setIndex(current + step);
  requestAnimationFrame(animateWheelScrub);
}

function bindWheelScrub() {
  dom.leftBody.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      if (!state.pointsAll || !state.pointsAll.features.length) return;

      const direction = e.deltaY > 0 ? 1 : -1;
      const magnitude = Math.max(1, Math.round(Math.abs(e.deltaY) / 55));
      const multiplier = e.shiftKey ? 4 : 1;

      state.wheelTarget = Math.max(
        0,
        Math.min(
          state.pointsAll.features.length - 1,
          state.wheelTarget + direction * magnitude * multiplier,
        ),
      );

      if (!state.wheelAnimating) {
        state.wheelAnimating = true;
        requestAnimationFrame(animateWheelScrub);
      }
    },
    { passive: false },
  );
}

function clearGpsDisplay() {
  state.pointsAll = null;
  state.rowsAll = [];
  state.cumDistKm = [];
  state.totalDistKm = 0;
  state.wheelTarget = 0;
  state.wheelAnimating = false;

  const empty = { type: "FeatureCollection", features: [] };
  const pointsSource = map.getSource(MAP_IDS.srcPointsVisible);
  const trackSource = map.getSource(MAP_IDS.srcTrackVisible);
  if (pointsSource) pointsSource.setData(empty);
  if (trackSource) trackSource.setData(empty);

  dom.csvTable.innerHTML = "";
  dom.vslider.min = "0";
  dom.vslider.max = "0";
  dom.vslider.value = "0";
  dom.idxEl.textContent = "–";
  dom.totalEl.textContent = "–";
  dom.timeEl.textContent = "–";
  dom.lonlatEl.textContent = "–";
  dom.vegClassEl.textContent = "–";
  dom.distNowEl.textContent = "–";
  dom.distTotalEl.textContent = "–";
}

async function loadDataset(datasetKey) {
  const file = DATASETS[datasetKey];
  if (!file) throw new Error(`Unknown dataset: ${datasetKey}`);

  // Stop playback while swapping datasets so old indices cannot race the load.
  setPlaying(false);
  state.currentDatasetKey = datasetKey;
  setDatasetUi();
  state.vegClassCache.clear();

  const text = await loadText(file);
  const parsed = await new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (r) => resolve(r.data),
      error: (err) => reject(err),
    });
  });

  state.rowsAll = parsed;

  if (!state.rowsAll.length) {
    clearGpsDisplay();
    updateLeftHeaderDates();
    return;
  }

  const ll = detectLonLatFields(state.rowsAll);
  state.lonField = ll.lon;
  state.latField = ll.lat;
  state.timeField = detectTimeField(state.rowsAll);
  state.orderField = detectOrderField(state.rowsAll);

  if (!state.lonField || !state.latField) {
    state.pointsAll = null;
    buildTable(state.rowsAll, () => {});
    updateLeftHeaderDates();
    console.warn("No longitude/latitude columns detected in", file);
    return;
  }

  const fc = rowsToPoints(state.rowsAll, state.lonField, state.latField);
  state.pointsAll = sortPointsByOrderOrTime(
    fc,
    state.orderField,
    state.timeField,
  );

  if (!state.pointsAll.features.length) {
    buildTable(state.rowsAll, () => {});
    updateLeftHeaderDates();
    console.warn("No valid coordinate rows found in", file);
    return;
  }

  // Keep table order synchronized with the sorted point collection.
  state.rowsAll = state.pointsAll.features.map((f) => f.properties);

  buildTable(state.rowsAll, (i) => {
    state.wheelTarget = i;
    setIndex(i);
  });

  dom.vslider.min = "0";
  dom.vslider.max = String(Math.max(0, state.pointsAll.features.length - 1));
  dom.vslider.step = "1";
  dom.vslider.value = "0";

  updateLeftHeaderDates();

  const dist = precomputeDistances(state.pointsAll);
  state.cumDistKm = dist.cumDistKm;
  state.totalDistKm = dist.totalDistKm;

  const b = computeBoundsPoints(state.pointsAll);
  if (b) map.fitBounds(b, { padding: 60, duration: 700 });

  state.wheelTarget = 0;
  updateVisible(0);
}

function setPlaying(next) {
  state.isPlaying = !!next;
  dom.playBtn.classList.toggle("is-playing", state.isPlaying);
  dom.playLabel.textContent = state.isPlaying ? "❚❚" : "▶";
  state.playbackLastMs = performance.now();
  state.playbackAccMs = 0;

  overlay.setRunning(state.isPlaying);
  setOverlayDogImage(state.currentDatasetKey, state.isPlaying);
}

function tickPlayback(nowMs) {
  if (!state.isPlaying || !state.pointsAll || !state.pointsAll.features.length) {
    state.playbackLastMs = nowMs;
    return;
  }

  const dt = Math.min(80, Math.max(0, nowMs - state.playbackLastMs));
  state.playbackLastMs = nowMs;
  state.playbackAccMs += dt;

  while (state.playbackAccMs >= PLAY_STEP_MS) {
    state.playbackAccMs -= PLAY_STEP_MS;

    const current = Number(dom.vslider.value || 0);
    const next = current + 1;

    if (next > state.pointsAll.features.length - 1) {
      setPlaying(false);
      break;
    }

    state.wheelTarget = next;
    setIndex(next);
  }
}

function raf(nowMs) {
  tickPlayback(nowMs);
  overlay.tick(nowMs);
  requestAnimationFrame(raf);
}

function bindUi() {
  const leftHeaderMeta = document.querySelector(
    ".pane-left .pane-header > .meta",
  );
  if (leftHeaderMeta) leftHeaderMeta.textContent = "";

  dom.playBtn.addEventListener("click", () => {
    if (!state.pointsAll || !state.pointsAll.features.length) return;
    setPlaying(!state.isPlaying);
  });

  dom.vslider.addEventListener("input", (e) => {
    state.wheelTarget = Number(e.target.value);
    setIndex(state.wheelTarget);
  });

  dom.toggleVegetation.addEventListener("click", () => {
    state.layersVisible.vegetation = !state.layersVisible.vegetation;
    setToggleState(dom.toggleVegetation, state.layersVisible.vegetation);
    applyLayerVisibility();
  });

  dom.toggleRoads.addEventListener("click", () => {
    state.layersVisible.roads = !state.layersVisible.roads;
    setToggleState(dom.toggleRoads, state.layersVisible.roads);
    applyLayerVisibility();
  });

  dom.toggleRivers.addEventListener("click", () => {
    state.layersVisible.rivers = !state.layersVisible.rivers;
    setToggleState(dom.toggleRivers, state.layersVisible.rivers);
    applyLayerVisibility();
  });

  dom.datasetSwitch.addEventListener("click", async () => {
    const nextKey = state.currentDatasetKey === "rafi" ? "noar" : "rafi";
    try {
      await loadDataset(nextKey);
    } catch (e) {
      console.error("Dataset switch failed:", e);
    }
  });

  dom.datasetRafiLabel.addEventListener("click", async () => {
    if (state.currentDatasetKey === "rafi") return;
    try {
      await loadDataset("rafi");
    } catch (e) {
      console.error("Rafi dataset failed:", e);
    }
  });

  dom.datasetNoarLabel.addEventListener("click", async () => {
    if (state.currentDatasetKey === "noar") return;
    try {
      await loadDataset("noar");
    } catch (e) {
      console.error("Noar dataset failed:", e);
    }
  });

  bindWheelScrub();

  setToggleState(dom.toggleVegetation, state.layersVisible.vegetation);
  setToggleState(dom.toggleRoads, state.layersVisible.roads);
  setToggleState(dom.toggleRivers, state.layersVisible.rivers);
  setPlaying(false);
  setOverlayDogImage(state.currentDatasetKey, false);
}

async function initVegetationAndContext() {
  try {
    state.vegGeo = await loadJSON(FILES.vegetation);
    state.vegClassField = detectClassField(state.vegGeo);

    const rawValues = state.vegClassField
      ? distinctValues(state.vegGeo, state.vegClassField, 1000)
      : [];

    const canonicalValues = getCanonicalVegetationValues(rawValues);

    renderVegetationLegend(
      dom.vegLegend,
      state.vegGeo,
      state.vegClassField,
      canonicalValues,
    );

    if (!map.getSource(MAP_IDS.srcVeg)) {
      map.addSource(MAP_IDS.srcVeg, { type: "geojson", data: state.vegGeo });
    }

    if (!map.getLayer(MAP_IDS.lyrVegFill)) {
      map.addLayer({
        id: MAP_IDS.lyrVegFill,
        type: "fill",
        source: MAP_IDS.srcVeg,
        paint: state.vegClassField
          ? {
              "fill-color": buildMatchExpression(
                state.vegClassField,
                rawValues,
              ),
              "fill-opacity": 0.45,
            }
          : { "fill-color": "#2e7d32", "fill-opacity": 0.35 },
      });
    }

    if (!map.getLayer(MAP_IDS.lyrVegLine)) {
      map.addLayer({
        id: MAP_IDS.lyrVegLine,
        type: "line",
        source: MAP_IDS.srcVeg,
        paint: { "line-color": "rgba(0,0,0,0.18)", "line-width": 0.3 },
      });
    }

    const built = buildVegetationIndexSafe(state.vegGeo);
    state.vegIndex = built.index;

    dom.vegMeta.textContent = state.vegClassField
      ? ""
      : "Loaded vegetation — no class field detected";
  } catch (e) {
    console.warn("Vegetation failed to initialize:", e);
    dom.vegMeta.textContent = "Vegetation not loaded";
  }

  try {
    const rios = await loadJSON(FILES.rivers);
    if (!map.getSource(MAP_IDS.srcRivers)) {
      map.addSource(MAP_IDS.srcRivers, { type: "geojson", data: rios });
    }
    if (!map.getLayer(MAP_IDS.lyrRivers)) {
      map.addLayer({
        id: MAP_IDS.lyrRivers,
        type: "line",
        source: MAP_IDS.srcRivers,
        paint: {
          "line-color": "#1976d2",
          "line-width": 1.2,
          "line-opacity": 0.9,
        },
      });
    }
  } catch (e) {
    console.warn("Rivers failed to load:", e);
  }

  try {
    const roads = await loadJSON(FILES.roads);
    if (!map.getSource(MAP_IDS.srcRoads)) {
      map.addSource(MAP_IDS.srcRoads, { type: "geojson", data: roads });
    }
    if (!map.getLayer(MAP_IDS.lyrRoads)) {
      map.addLayer({
        id: MAP_IDS.lyrRoads,
        type: "line",
        source: MAP_IDS.srcRoads,
        paint: {
          "line-color": "#111111",
          "line-width": 1.0,
          "line-opacity": 0.85,
        },
      });
    }
  } catch (e) {
    console.warn("Roads failed to load:", e);
  }

  applyLayerVisibility();
}

function exportFirst100PointsSVG() {
  if (!state.pointsAll || !state.pointsAll.features.length) {
    console.warn("No points available to export.");
    return;
  }

  const features = state.pointsAll.features.slice(0, 100);
  const coords = features
    .map((f) => f?.geometry?.coordinates)
    .filter(
      (c) =>
        Array.isArray(c) &&
        c.length >= 2 &&
        Number.isFinite(c[0]) &&
        Number.isFinite(c[1]),
    );

  if (!coords.length) {
    console.warn("No valid coordinates found for export.");
    return;
  }

  const lons = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const width = 1600;
  const height = 1000;
  const pad = 80;
  const spanLon = Math.max(maxLon - minLon, 1e-9);
  const spanLat = Math.max(maxLat - minLat, 1e-9);
  const scaleX = (width - pad * 2) / spanLon;
  const scaleY = (height - pad * 2) / spanLat;
  const scale = Math.min(scaleX, scaleY);
  const drawW = spanLon * scale;
  const drawH = spanLat * scale;
  const offsetX = (width - drawW) / 2;
  const offsetY = (height - drawH) / 2;

  function project(coord) {
    const [lon, lat] = coord;
    const x = offsetX + (lon - minLon) * scale;
    const y = height - (offsetY + (lat - minLat) * scale);
    return [x, y];
  }

  const projected = coords.map(project);
  const traceColor = DOG_TRACE_COLORS[state.currentDatasetKey] || "#000000";
  const polylinePoints = projected
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

  const circles = projected
    .map(
      ([x, y], i) => `
    <circle
      cx="${x.toFixed(2)}"
      cy="${y.toFixed(2)}"
      r="4.2"
      fill="${traceColor}"
      fill-opacity="1"
    />
    <title>${state.currentDatasetKey} point ${i + 1}</title>`,
    )
    .join("\n");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}"
>
  <g>
    <polyline
      points="${polylinePoints}"
      fill="none"
      stroke="${traceColor}"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-opacity="1"
    />
    ${circles}
  </g>
</svg>`;

  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${state.currentDatasetKey}-first-100-points.svg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Keep your export helper available from DevTools even though this file is ESM.
window.exportFirst100PointsSVG = exportFirst100PointsSVG;

bindUi();

map.on("error", (event) => {
  console.error("MapLibre error:", event?.error || event);
});

map.on("load", async () => {
  try {
    ensureGpsLayers(map);
    applyDogTraceColor();
    await initVegetationAndContext();
    await overlay.init();
    await loadDataset("rafi");
    enforceLayerOrder(map);
    setPlaying(true);
    requestAnimationFrame(raf);
  } catch (e) {
    console.error("Application initialization failed:", e);
    setPlaying(false);
  }
});
