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

// Travel fee for a raw palay purchase, based on how much weight is
// delivered. One delivery load is up to 60kg, priced by weight:
//   40kg or more (up to 60kg) -> PHP 10
//   35kg to 39.5kg            -> PHP 7
//   20kg to 34.5kg            -> PHP 5
//   under 20kg                -> PHP 0
// Each tier starts at its lower number, so in-between weights (e.g. 39.7kg)
// fall into the tier below them.
//
// For larger purchases, every full 60kg counts as one load at PHP 10, and
// whatever is left over is priced by the same tiers above. Example: 130kg
// = 2 full loads (PHP 20) + a 10kg leftover (PHP 0) = PHP 20.
export const TRAVEL_LOAD_CAP_KG = 60;

function feeForSingleLoad(kg) {
  if (kg >= 40) return 10;
  if (kg >= 35) return 7;
  if (kg >= 20) return 5;
  return 0;
}

export function travelFeeFor(quantityKg) {
  // Round to avoid floating-point noise right at a tier boundary.
  const kg = Math.round((Number(quantityKg) || 0) * 100) / 100;
  if (kg <= 0) return 0;
  const fullLoads = Math.floor(kg / TRAVEL_LOAD_CAP_KG);
  const remainder = Math.round((kg - fullLoads * TRAVEL_LOAD_CAP_KG) * 100) / 100;
  return fullLoads * 10 + feeForSingleLoad(remainder);
}

// Extracts the kg-per-unit from a rice type's unit label, e.g.
// "sack (25kg)" -> 25, "sack (50kg)" -> 50, "kg" -> 1 (no conversion).
export function kgPerUnit(unitLabel) {
  if (!unitLabel) return 1;
  const match = unitLabel.match(/(\d+(\.\d+)?)\s*kg/i);
  return match ? Number(match[1]) : 1;
}
