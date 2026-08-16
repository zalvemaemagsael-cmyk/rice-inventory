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

// Travel fee tiers for a raw palay purchase, based on total weight bought:
//   >= 40 kg  -> ₱10
//   30-39 kg  -> ₱7
//   < 30 kg   -> ₱5
export function travelFeeFor(quantityKg) {
  const kg = Number(quantityKg) || 0;
  if (kg >= 40) return 10;
  if (kg >= 30) return 7;
  return 5;
}

// Extracts the kg-per-unit from a rice type's unit label, e.g.
// "sack (25kg)" -> 25, "sack (50kg)" -> 50, "kg" -> 1 (no conversion).
export function kgPerUnit(unitLabel) {
  if (!unitLabel) return 1;
  const match = unitLabel.match(/(\d+(\.\d+)?)\s*kg/i);
  return match ? Number(match[1]) : 1;
}
