import { fmtNum } from "./format.js";

// Stable category keys used for filtering (separate from the human-readable
// "type" label shown in the table, since e.g. all Stock Out rows share one
// category regardless of their reason).
export const TXN_CATEGORIES = [
  { key: "supplierPurchase", label: "Supplier Purchases" },
  { key: "rawPurchase", label: "Raw Rice Purchases" },
  { key: "milling", label: "Milling" },
  { key: "huskSale", label: "Husk/Bran Sold" },
  { key: "stockOut", label: "Stock Out" },
  { key: "expense", label: "Expenses" },
];

// Normalizes every transaction-bearing table into one flat list of rows
// shaped { id, date, category, type, description, amount, direction },
// sorted most-recent first. `amount` is null for entries with no direct
// cash value (e.g. a milling conversion or a non-sale stock-out).
export function buildTransactionRows(data, riceTypeName, supplierName, buyerName) {
  const rows = [];

  for (const p of data.supplierPurchases) {
    rows.push({
      id: p.id,
      date: p.date,
      category: "supplierPurchase",
      type: "Supplier Purchase",
      description: `${fmtNum(p.quantity)} ${riceTypeName(p.riceTypeId)} from ${supplierName(p.supplierId)}`,
      amount: p.totalCost || 0,
      direction: "out",
    });
  }

  for (const p of data.rawPurchases) {
    rows.push({
      id: p.id,
      date: p.date,
      category: "rawPurchase",
      type: "Raw Rice Purchase",
      description: `${fmtNum(p.quantityKg)} kg palay from ${p.source}`,
      amount: p.totalCost || 0,
      direction: "out",
    });
  }

  for (const m of data.millings) {
    rows.push({
      id: m.id,
      date: m.date,
      category: "milling",
      type: "Milling",
      description: `${fmtNum(m.rawQuantityKg)} kg raw → ${fmtNum(m.outputQuantity)} ${riceTypeName(m.riceTypeId)}` +
        (m.huskQuantityKg ? ` + ${fmtNum(m.huskQuantityKg)} kg husk` : ""),
      amount: null,
      direction: "—",
    });
  }

  for (const h of data.huskSales) {
    const buyer = h.buyerId ? buyerName(h.buyerId) : null;
    rows.push({
      id: h.id,
      date: h.date,
      category: "huskSale",
      type: "Husk/Bran Sold",
      description: `${fmtNum(h.quantityKg)} kg${buyer ? ` to ${buyer}` : ""}`,
      amount: h.totalAmount || 0,
      direction: "in",
    });
  }

  for (const s of data.stockOuts) {
    const buyer = s.buyerId ? buyerName(s.buyerId) : null;
    rows.push({
      id: s.id,
      date: s.date,
      category: "stockOut",
      type: `Stock Out (${s.reason})`,
      description: `${fmtNum(s.quantity)} ${riceTypeName(s.riceTypeId)}${buyer ? ` to ${buyer}` : ""}`,
      amount: s.reason === "Sale" ? s.totalAmount || 0 : null,
      direction: s.reason === "Sale" ? "in" : "—",
    });
  }

  for (const e of data.expenses) {
    rows.push({
      id: e.id,
      date: e.date,
      category: "expense",
      type: "Expense",
      description: e.category + (e.notes ? ` — ${e.notes}` : ""),
      amount: e.amount || 0,
      direction: "out",
    });
  }

  return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function csvEscape(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Triggers a browser download of the given rows as a CSV file.
export function downloadTransactionsCSV(rows, filename) {
  const header = ["Date", "Type", "Description", "Amount (PHP)", "Direction"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.date,
        r.type,
        r.description,
        r.amount != null ? r.amount : "",
        r.direction === "in" ? "In" : r.direction === "out" ? "Out" : "",
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
