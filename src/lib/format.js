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

// ---- Travel fee for raw palay purchases ----
//
// The fee depends on the weight of what is carried at one time:
//   40kg or more (up to 60kg) -> PHP 10
//   35kg to 39.5kg            -> PHP 7
//   20kg to 34.5kg            -> PHP 5
//   under 20kg                -> PHP 0
// Each tier starts at its lower number, so in-between weights (e.g. 39.7kg)
// fall into the tier below them.
//
// When the purchase is split into sacks, the fee is charged PER SACK using
// that sack's weight. Example: 150kg as 3 sacks of 50kg = 3 x PHP 10 = PHP 30.
// If no sack information is given, it falls back to 60kg loads: every full
// 60kg counts as one load (PHP 10) and the leftover is priced by the tiers.
export const TRAVEL_LOAD_CAP_KG = 60;

const round2 = (n) => Math.round(n * 100) / 100;

function feeForSingleLoad(kg) {
  if (kg >= 40) return 10;
  if (kg >= 35) return 7;
  if (kg >= 20) return 5;
  return 0;
}

// Splits a purchase into sacks, returning groups like
//   [{ count: 3, kg: 50 }]                      3 equal sacks of 50kg
//   [{ count: 3, kg: 40 }, { count: 1, kg: 30 }] 3 full sacks + a smaller one
// `sackSizeKg` is the weight of one sack. If the total divides into whole
// sacks (even when the size is something like 33.333 from 100kg / 3 sacks),
// the sacks are treated as equal. Returns null when there's no sack info.
export function splitIntoSacks(totalKg, sackSizeKg) {
  const total = round2(Number(totalKg) || 0);
  const size = Number(sackSizeKg) || 0;
  if (!(total > 0) || !(size > 0)) return null;
  const ratio = total / size;
  const nearest = Math.round(ratio);
  if (nearest >= 1 && Math.abs(ratio - nearest) < 0.001) {
    return [{ count: nearest, kg: total / nearest }];
  }
  const full = Math.floor(ratio);
  const leftover = round2(total - full * size);
  const groups = [];
  if (full > 0) groups.push({ count: full, kg: size });
  if (leftover > 0) groups.push({ count: 1, kg: leftover });
  return groups;
}

export function sackTotal(groups) {
  return groups ? groups.reduce((sum, g) => sum + g.count, 0) : 0;
}

// Short human-readable summary, e.g. "3 sacks @ 50kg" or
// "4 sacks (3 @ 40kg + 1 @ 30kg)". Empty string when there's no sack info.
export function sackSummary(totalKg, sackSizeKg) {
  const groups = splitIntoSacks(totalKg, sackSizeKg);
  if (!groups) return "";
  const n = sackTotal(groups);
  const word = n === 1 ? "sack" : "sacks";
  const kg = (g) => `${Number(round2(g.kg))}kg`;
  if (groups.length === 1) return `${n} ${word} @ ${kg(groups[0])}`;
  return `${n} ${word} (${groups.map((g) => `${g.count} @ ${kg(g)}`).join(" + ")})`;
}

// The fee, plus how it was made up (for showing the working to the user).
// `parts` is null when no sack information was given.
export function travelFeeBreakdown(totalKg, sackSizeKg) {
  const groups = splitIntoSacks(totalKg, sackSizeKg);
  if (groups) {
    const parts = groups.map((g) => ({ count: g.count, kg: round2(g.kg), feeEach: feeForSingleLoad(round2(g.kg)) }));
    return { fee: parts.reduce((sum, p) => sum + p.count * p.feeEach, 0), parts };
  }
  // No sack info: price by 60kg loads.
  const kg = round2(Number(totalKg) || 0);
  if (kg <= 0) return { fee: 0, parts: null };
  const fullLoads = Math.floor(kg / TRAVEL_LOAD_CAP_KG);
  const remainder = round2(kg - fullLoads * TRAVEL_LOAD_CAP_KG);
  return { fee: fullLoads * 10 + feeForSingleLoad(remainder), parts: null };
}

export function travelFeeFor(quantityKg, sackSizeKg = 0) {
  return travelFeeBreakdown(quantityKg, sackSizeKg).fee;
}

// Extracts the kg-per-unit from a rice type's unit label, e.g.
// "sack (25kg)" -> 25, "sack (50kg)" -> 50, "kg" -> 1 (no conversion).
export function kgPerUnit(unitLabel) {
  if (!unitLabel) return 1;
  const match = unitLabel.match(/(\d+(\.\d+)?)\s*kg/i);
  return match ? Number(match[1]) : 1;
}
