// Tracks the cost of raw palay as it moves from "purchased" to "milled",
// using a moving (perpetual) weighted-average cost method — the same
// idea real inventory accounting uses. This replaces a simpler
// "global average cost" calculation, which had a subtle problem: because
// it divides *all-time* spend by *all-time* kg bought, adding a new
// purchase today would silently change the recognized cost of a milling
// run from last month. That makes "history" meaningless, since past
// numbers would keep shifting.
//
// Here, every purchase and milling is processed in the order it actually
// happened. Each purchase adds to a running pool of (kg, value). Each
// milling draws out of that pool at whatever the average cost-per-kg was
// at that exact moment, then permanently records that amount — it never
// changes again, no matter what gets added later.
//
// Returns:
//   remainingKg, remainingValue — what's left in the pool (unmilled stock
//     and its cost, i.e. what shows as "cost of stock on hand")
//   millingCostRecords — one entry per milling run, with exactly how much
//     cost was subtracted for that run (for the Reports history table)
//   palaySaleCostRecords — the same, for each sale of raw palay: palay that
//     is sold unmilled leaves the pool at the average cost at that moment,
//     so the cost of the palay sold is known for each sale
export function computeMillingCostLedger(rawPurchases, millings, palaySales = []) {
  // All arrays are stored newest-first; reverse to process oldest-first.
  const purchasesAsc = [...rawPurchases].reverse();
  const millingsAsc = [...millings].reverse();
  const salesAsc = [...palaySales].reverse();

  const events = [
    ...purchasesAsc.map((p, i) => ({ kind: "purchase", date: p.date, seq: i, data: p })),
    ...millingsAsc.map((m, i) => ({ kind: "milling", date: m.date, seq: i, data: m })),
    ...salesAsc.map((x, i) => ({ kind: "sale", date: x.date, seq: i, data: x })),
  ];

  // Chronological by date; on the same day, purchases come first (you
  // can't mill or sell palay you haven't bought yet), then millings, then
  // palay sales, with original recorded order as the final tiebreaker.
  const rank = { purchase: 0, milling: 1, sale: 2 };
  events.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.kind !== b.kind) return rank[a.kind] - rank[b.kind];
    return a.seq - b.seq;
  });

  let remainingKg = 0;
  let remainingValue = 0;
  const millingCostRecords = [];
  const palaySaleCostRecords = [];

  for (const ev of events) {
    if (ev.kind === "purchase") {
      // Number(...) guards against this ever being a string (e.g. a raw,
      // unconverted value from an API that serializes numeric columns as
      // text) — without it, `+=` silently concatenates instead of adding.
      remainingKg += Number(ev.data.quantityKg) || 0;
      remainingValue += Number(ev.data.totalCost) || 0;
    } else if (ev.kind === "sale") {
      const costPerKgAtTime = remainingKg > 0 ? remainingValue / remainingKg : 0;
      const kgSold = Number(ev.data.quantityKg) || 0;
      const costSubtracted = Math.min(remainingValue, costPerKgAtTime * kgSold);
      remainingKg = Math.max(0, remainingKg - kgSold);
      remainingValue = Math.max(0, remainingValue - costSubtracted);
      palaySaleCostRecords.push({
        id: ev.data.id,
        date: ev.data.date,
        quantityKg: kgSold,
        costPerKgAtTime,
        costSubtracted,
      });
    } else {
      const costPerKgAtTime = remainingKg > 0 ? remainingValue / remainingKg : 0;
      const rawUsed = Number(ev.data.rawQuantityKg) || 0;
      // Never subtract more value than is actually left in the pool —
      // guards against rounding drift or a milling entry that (through a
      // data error) claims more raw kg than was ever actually bought.
      const costSubtracted = Math.min(remainingValue, costPerKgAtTime * rawUsed);
      remainingKg = Math.max(0, remainingKg - rawUsed);
      remainingValue = Math.max(0, remainingValue - costSubtracted);
      millingCostRecords.push({
        id: ev.data.id,
        date: ev.data.date,
        riceTypeId: ev.data.riceTypeId,
        rawQuantityKg: rawUsed,
        outputQuantity: ev.data.outputQuantity,
        huskQuantityKg: ev.data.huskQuantityKg || 0,
        costPerKgAtTime,
        costSubtracted,
      });
    }
  }

  return { remainingKg, remainingValue, millingCostRecords, palaySaleCostRecords };
}
