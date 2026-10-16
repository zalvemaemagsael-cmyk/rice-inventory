import { splitIntoSacks, sackTotal } from "./format.js";

// Builds 58mm thermal-printer receipts. A 58mm printer like the PT-210
// prints 32 characters per line, so everything here is laid out as plain
// text lines no wider than that. The same lines are used both for direct
// printing (converted to ESC/POS bytes) and for the browser print dialog.

// Change these to match how the business should appear on receipts.
export const RECEIPT_BUSINESS_NAME = "MJRN Rice Trading";
export const RECEIPT_EXTRA_LINES = []; // e.g. ["Brgy. Example, Iloilo", "0912 345 6789"]

const WIDTH = 32;

// Thermal printers only reliably handle plain ASCII, so peso signs,
// dashes, accents, etc. are swapped for safe equivalents.
export function toAscii(s) {
  return String(s ?? "")
    .replace(/₱/g, "PHP ")
    .replace(/[·•]/g, "-")
    .replace(/[—–]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "?");
}

export function money(n) {
  return Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function qty(n) {
  return Number(n || 0).toLocaleString("en-PH", { maximumFractionDigits: 2 });
}

function wrap(text, width = WIDTH) {
  const words = toAscii(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    if (w.length > width) {
      if (line) lines.push(line);
      for (let i = 0; i < w.length; i += width) lines.push(w.slice(i, i + width));
      line = "";
    } else if ((line + " " + w).trim().length > width) {
      lines.push(line);
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

const center = (text) => wrap(text).map((l) => " ".repeat(Math.floor((WIDTH - l.length) / 2)) + l);
const rule = () => "-".repeat(WIDTH);

// Left text with a right-aligned value on the same line when it fits;
// otherwise the left text wraps and the value sits right-aligned below.
function row(left, right) {
  const l = toAscii(left);
  const r = toAscii(right);
  if (l.length + r.length + 1 <= WIDTH) {
    return [l + " ".repeat(WIDTH - l.length - r.length) + r];
  }
  return [...wrap(l), " ".repeat(Math.max(0, WIDTH - r.length)) + r];
}

// A simple one-item receipt used for both rice sales and husk/bran sales.
//   item: { name, qtyText, unitPrice, amount }
//   balance: buyer's running utang balance, or null for cash sales
// Returns an array of { text, bold } lines.
export function buildReceipt({ title, ref, date, buyer, item, total, balance, notes }) {
  const L = [];
  const add = (lines, bold = false) => lines.forEach((text) => L.push({ text, bold }));

  add(center(RECEIPT_BUSINESS_NAME), true);
  for (const extra of RECEIPT_EXTRA_LINES) add(center(extra));
  add(center(title));
  add([rule()]);
  add(row("Date:", date));
  if (ref) add(row("Ref:", ref));
  if (buyer) add(row("Buyer:", buyer));
  add([rule()]);
  add(wrap(item.name));
  add(row(`${item.qtyText} @ ${money(item.unitPrice)}`, money(item.amount)));
  if (notes) add(wrap(`Note: ${notes}`));
  add([rule()]);
  add(row("TOTAL", `PHP ${money(total)}`), true);
  if (balance != null) {
    add(row("Balance owed:", `PHP ${money(balance)}`));
  }
  add([rule()]);
  add(center("Thank you!"));
  return L;
}

export function buildSaleReceipt({ sale, riceType, buyerName, balance, formattedDate }) {
  const unit = riceType?.unit || "unit";
  return buildReceipt({
    title: "SALES RECEIPT",
    ref: String(sale.id).slice(-6).toUpperCase(),
    date: formattedDate,
    buyer: buyerName,
    item: {
      name: riceType ? `${riceType.name} (${riceType.grade})` : "Rice",
      qtyText: `${qty(sale.quantity)} ${unit}`,
      unitPrice: sale.pricePerUnit,
      amount: sale.totalAmount,
    },
    total: sale.totalAmount,
    balance: buyerName ? balance : null,
    notes: sale.notes,
  });
}

export function buildHuskReceipt({ sale, buyerName, balance, formattedDate }) {
  return buildReceipt({
    title: "SALES RECEIPT",
    ref: String(sale.id).slice(-6).toUpperCase(),
    date: formattedDate,
    buyer: buyerName,
    item: {
      name: "Rice husk / bran",
      qtyText: `${qty(sale.quantityKg)} kg`,
      unitPrice: sale.pricePerKg,
      amount: sale.totalAmount,
    },
    total: sale.totalAmount,
    balance: buyerName ? balance : null,
    notes: sale.notes,
  });
}

// Receipt for buying unmilled palay from a farmer/seller. Unlike a sales
// receipt, this is money going out, so it shows the seller, the weight and
// price, the sack count (when a sack size was entered), the travel fee, and
// the total paid, plus a signature line for the seller's paper record.
export function buildRawPurchaseReceipt({ purchase, formattedDate }) {
  const L = [];
  const add = (lines, bold = false) => lines.forEach((text) => L.push({ text, bold }));

  const travelFee = Number(purchase.travelFee) || 0;
  const total = Number(purchase.totalCost) || 0;
  // Goods cost is derived from the stored total so the lines always add up
  // to exactly what was recorded as paid.
  const goodsCost = total - travelFee;
  const sackGroups = splitIntoSacks(purchase.quantityKg, purchase.sackSizeKg);

  add(center(RECEIPT_BUSINESS_NAME), true);
  for (const extra of RECEIPT_EXTRA_LINES) add(center(extra));
  add(center("PALAY PURCHASE RECEIPT"));
  add([rule()]);
  add(row("Date:", formattedDate));
  add(row("Ref:", String(purchase.id).slice(-6).toUpperCase()));
  add(row("Bought from:", purchase.source));
  add([rule()]);
  add(["Unmilled palay"]);
  add(row(`${qty(purchase.quantityKg)} kg @ ${money(purchase.pricePerKg)}`, money(goodsCost)));
  if (sackGroups) {
    // One line when the sacks are equal; one line per group otherwise
    // (e.g. "3 @ 40 kg" and "1 @ 30 kg"). Counts only — the travel fee
    // below is the amount that was actually recorded.
    if (sackGroups.length === 1) {
      add(row("Sacks:", `${sackGroups[0].count} @ ${qty(sackGroups[0].kg)} kg`));
    } else {
      add(row("Sacks:", String(sackTotal(sackGroups))));
      for (const g of sackGroups) add([`  ${g.count} @ ${qty(g.kg)} kg`]);
    }
  }
  if (travelFee > 0) add(row("Travel fee", money(travelFee)));
  if (purchase.notes) add(wrap(`Note: ${purchase.notes}`));
  add([rule()]);
  add(row("TOTAL PAID", `PHP ${money(total)}`), true);
  add([rule()]);
  add(["", "Seller signature:", "", "________________________________"]);
  add(center("Thank you!"));
  return L;
}

export function linesToText(lines) {
  return lines.map((l) => l.text).join("\n");
}

// Converts receipt lines into raw ESC/POS bytes (the command language
// virtually all 58mm thermal printers understand).
export function encodeEscPos(lines) {
  const bytes = [0x1b, 0x40]; // ESC @  — reset printer
  for (const l of lines) {
    bytes.push(0x1b, 0x45, l.bold ? 1 : 0); // ESC E n — bold on/off
    for (const ch of toAscii(l.text)) bytes.push(ch.charCodeAt(0));
    bytes.push(0x0a); // line feed
  }
  bytes.push(0x1b, 0x45, 0x00); // bold off
  bytes.push(0x1b, 0x64, 4); // ESC d 4 — feed 4 lines so the tear-off clears the print head
  return new Uint8Array(bytes);
}
