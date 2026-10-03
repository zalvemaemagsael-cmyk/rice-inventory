export function uid(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function fmtDate(d) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

export function fmtNum(n) {
  return Number(n).toLocaleString("en-PH", { maximumFractionDigits: 2 });
}

// Travel fee for a raw palay purchase, scaled for large quantities.
// A single delivery load caps out around 40kg; every full 40kg load costs
// ₱10, and whatever's left over (a partial load) is charged at the same
// tiered rate as a standalone small purchase: 30-39kg -> ₱7, under 30kg
// -> ₱5. So buying, say, 90kg in one entry means 2 full loads (₱20) plus
// a 10kg partial load (₱5) = ₱25 — rather than a flat ₱10 no matter how
// much was bought.
export function travelFeeFor(quantityKg) {
  const kg = Number(quantityKg) || 0;
  if (kg <= 0) return 0;
  const LOAD_CAP_KG = 40;
  const fullLoads = Math.floor(kg / LOAD_CAP_KG);
  const remainder = kg - fullLoads * LOAD_CAP_KG;
  let fee = fullLoads * 10;
  if (remainder > 0) {
    fee += remainder >= 30 ? 7 : 5;
  }
  return fee;
}

// Extracts the kg-per-unit from a rice type's unit label, e.g.
// "sack (25kg)" -> 25, "sack (50kg)" -> 50, "kg" -> 1 (no conversion).
export function kgPerUnit(unitLabel) {
  if (!unitLabel) return 1;
  const match = unitLabel.match(/(\d+(\.\d+)?)\s*kg/i);
  return match ? Number(match[1]) : 1;
}
