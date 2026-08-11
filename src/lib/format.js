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
