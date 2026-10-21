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

// ---- Sacks for raw palay purchases ----
//
// (The travel fee is entered by hand on the Raw Rice form — nothing here
// calculates it.)

const round2 = (n) => Math.round(n * 100) / 100;

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


// Extracts the kg-per-unit from a rice type's unit label, e.g.
// "sack (25kg)" -> 25, "sack (50kg)" -> 50, "kg" -> 1 (no conversion).
export function kgPerUnit(unitLabel) {
  if (!unitLabel) return 1;
  const match = unitLabel.match(/(\d+(\.\d+)?)\s*kg/i);
  return match ? Number(match[1]) : 1;
}
