import type { Row } from "./engine";

// Deterministic PRNG so every run is reproducible.
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const REGIONS = ["West", "Southwest", "Midwest", "Northeast", "Southeast"];
const CHANNELS = ["Online", "Retail", "Wholesale", "Partner"];
const PRODUCTS = ["Sensor Kit", "Gateway", "Analytics Seat", "Support Plan", "Edge Unit"];
const STATUS = ["completed", "completed", "completed", "refunded", "pending"];

function buildOrders(): Row[] {
  const rnd = mulberry32(7);
  const rows: Row[] = [];
  for (let i = 1; i <= 180; i++) {
    const region = REGIONS[Math.floor(rnd() * REGIONS.length)];
    const product = PRODUCTS[Math.floor(rnd() * PRODUCTS.length)];
    const units = 1 + Math.floor(rnd() * 12);
    const unitPrice = [120, 340, 90, 60, 480][PRODUCTS.indexOf(product)];
    const month = 1 + Math.floor(rnd() * 6);
    const day = 1 + Math.floor(rnd() * 27);
    rows.push({
      order_id: 1000 + i,
      date: `2025-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      region,
      channel: CHANNELS[Math.floor(rnd() * CHANNELS.length)],
      product,
      units,
      revenue: Math.round(units * unitPrice * (0.9 + rnd() * 0.25)),
      status: STATUS[Math.floor(rnd() * STATUS.length)],
    });
  }
  return rows;
}

function buildRegionTargets(): Row[] {
  const managers = ["A. Okafor", "L. Tanaka", "R. Mehta", "C. Nguyen", "S. Alvarez"];
  const targets = [220000, 160000, 140000, 180000, 150000];
  return REGIONS.map((region, i) => ({
    region,
    manager: managers[i],
    quarterly_target: targets[i],
  }));
}

export const SAMPLE_DATA: Record<string, Row[]> = {
  orders: buildOrders(),
  region_targets: buildRegionTargets(),
};

export const DATASET_META: Record<string, { label: string; columns: string[]; rows: number }> = {
  orders: {
    label: "orders",
    columns: ["order_id", "date", "region", "channel", "product", "units", "revenue", "status"],
    rows: SAMPLE_DATA.orders.length,
  },
  region_targets: {
    label: "region_targets",
    columns: ["region", "manager", "quarterly_target"],
    rows: SAMPLE_DATA.region_targets.length,
  },
};
