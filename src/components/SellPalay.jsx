import React, { useState } from "react";
import { Scale, Plus, Trash2, Pencil, X, Printer } from "lucide-react";
import { todayStr, fmtDate, fmtNum } from "../lib/format.js";
import { EmptyState } from "./ui.jsx";
import PrinterBar from "./PrinterBar.jsx";
import { buildPalaySaleReceipt } from "../lib/receipt.js";
import { printReceipt } from "../lib/printer.js";

// Selling unmilled palay as-is (instead of milling it). The kilograms leave
// the raw palay stock, and their cost leaves the palay cost pool at the
// average cost at that time, so profit on each sale can be seen here and
// flows into the Reports tab.
export default function SellPalay({
  data,
  rawStockKg,
  rawPurchaseCostTotal,
  palaySaleCostById,
  buyerName,
  buyerBalances,
  addPalaySale,
  updatePalaySale,
  deletePalaySale,
  showToast,
}) {
  const blankForm = { date: todayStr(), quantityKg: "", pricePerKg: "", buyerId: "", notes: "" };
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);

  const quantityKg = Number(form.quantityKg) || 0;
  const total = quantityKg * (Number(form.pricePerKg) || 0);

  // When editing, the sale being edited is already counted as gone from
  // stock, so its own weight is available again for this edit.
  const editingSale = editingId ? data.palaySales.find((x) => x.id === editingId) : null;
  const available = rawStockKg + (editingSale ? Number(editingSale.quantityKg) || 0 : 0);
  const overStock = quantityKg > available + 1e-9;

  // Rough preview only: uses today's average cost per kg on hand. The
  // saved figure in the log is exact for the date of the sale.
  const avgCostPerKg = rawStockKg > 0 ? rawPurchaseCostTotal / rawStockKg : 0;
  const estCost = avgCostPerKg * quantityKg;
  const estProfit = total - estCost;

  const startEdit = (x) => {
    setEditingId(x.id);
    setForm({
      date: x.date,
      quantityKg: String(x.quantityKg),
      pricePerKg: String(x.pricePerKg),
      buyerId: x.buyerId || "",
      notes: x.notes || "",
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setForm(blankForm);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.quantityKg || !form.pricePerKg) return;
    if (overStock) {
      showToast(`Only ${fmtNum(available)} kg of palay is available to sell.`);
      return;
    }
    const payload = {
      date: form.date,
      quantityKg,
      pricePerKg: Number(form.pricePerKg),
      totalAmount: total,
      buyerId: form.buyerId || null,
      notes: form.notes,
    };
    if (editingId) {
      updatePalaySale(editingId, payload);
      setEditingId(null);
    } else {
      addPalaySale(payload);
    }
    setForm(blankForm);
  };

  const printSale = async (x) => {
    const buyer = x.buyerId ? buyerName(x.buyerId) : null;
    const lines = buildPalaySaleReceipt({
      sale: x,
      buyerName: buyer,
      balance: x.buyerId ? buyerBalances[x.buyerId] || 0 : null,
      formattedDate: fmtDate(x.date),
    });
    try {
      await printReceipt(lines);
    } catch (err) {
      showToast(`Couldn't print: ${err.message || err}. Check the printer is on and in range.`);
    }
  };

  const totalSales = data.palaySales.reduce((sum, x) => sum + (Number(x.totalAmount) || 0), 0);

  return (
    <div>
      <div className="section-label">{editingId ? "Edit palay sale" : "Sell unmilled palay"}</div>
      <div className="hint-line">
        For palay you sell as-is instead of milling it. The kilograms come out of your unmilled stock, and
        their cost comes out of the palay cost, so profit on each sale is tracked.
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
        <div className="raw-card" style={{ flex: 1, minWidth: 220 }}>
          <div>
            <div className="stock-name">Palay available to sell</div>
            <div className="stock-grade">Current unmilled stock</div>
          </div>
          <div className="stock-qty">{fmtNum(rawStockKg)} <span className="stock-unit">kg</span></div>
        </div>
        <div className="raw-card" style={{ flex: 1, minWidth: 220 }}>
          <div>
            <div className="stock-name">Average cost on hand</div>
            <div className="stock-grade">Per kg, to help set your price</div>
          </div>
          <div className="stock-qty">₱ {fmtNum(avgCostPerKg)} <span className="stock-unit">/ kg</span></div>
        </div>
      </div>

      <PrinterBar showToast={showToast} />

      <form className="form-card" onSubmit={submit}>
        <div className="form-row">
          <label>
            Date
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </label>
          <label>
            Quantity (kg)
            <input type="number" min="0" step="0.1" placeholder="0" value={form.quantityKg}
              onChange={(e) => setForm({ ...form, quantityKg: e.target.value })} required />
          </label>
          <label>
            Price per kg (₱)
            <input type="number" min="0" step="0.01" placeholder="0.00" value={form.pricePerKg}
              onChange={(e) => setForm({ ...form, pricePerKg: e.target.value })} required />
          </label>
          <label>
            Total amount
            <input type="text" value={`₱ ${fmtNum(total)}`} disabled />
          </label>
        </div>
        <div className="form-row">
          <label>
            Buyer (optional — for credit/utang tracking)
            <select value={form.buyerId} onChange={(e) => setForm({ ...form, buyerId: e.target.value })}>
              <option value="">— walk-in / cash sale —</option>
              {data.buyers.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <label className="full">
            Notes (optional)
            <input type="text" placeholder="e.g. variety, moisture, pickup details" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
        </div>
        {overStock && (
          <div className="hint-line" style={{ color: "var(--alert)" }}>
            That's more than the {fmtNum(available)} kg of palay available to sell.
          </div>
        )}
        {quantityKg > 0 && !overStock && form.pricePerKg && (
          <div className="hint-line">
            Estimate at today's average cost: cost ₱{fmtNum(estCost)}, profit{" "}
            <strong style={{ color: estProfit >= 0 ? "var(--paddy)" : "var(--alert)" }}>₱{fmtNum(estProfit)}</strong>.
            The exact figure is saved with the sale.
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" className="btn-primary" disabled={overStock}>
            {editingId ? <Pencil size={16} /> : <Plus size={16} />} {editingId ? "Update sale" : "Record palay sale"}
          </button>
          {editingId && (
            <button type="button" className="icon-btn" onClick={cancelEdit} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <X size={15} /> Cancel
            </button>
          )}
        </div>
      </form>

      <div className="section-label" style={{ marginTop: 28, display: "flex", justifyContent: "space-between" }}>
        <span>Palay sales log</span>
        <span className="muted">Total sold: ₱ {fmtNum(totalSales)}</span>
      </div>
      {data.palaySales.length === 0 ? (
        <EmptyState icon={Scale} title="No palay sales yet" body="Palay you sell without milling will appear here." />
      ) : (
        <div className="receipt-list">
          {data.palaySales.map((x) => {
            const buyer = x.buyerId ? buyerName(x.buyerId) : null;
            const cost = palaySaleCostById[x.id];
            const profit = cost ? (Number(x.totalAmount) || 0) - cost.costSubtracted : null;
            return (
              <div className="receipt" key={x.id}>
                <div className="receipt-main">
                  <div className="receipt-line1">
                    <strong>{fmtNum(x.quantityKg)} kg palay</strong>
                    <span className="receipt-date">{fmtDate(x.date)}</span>
                  </div>
                  <div className="receipt-line2">
                    @ ₱{fmtNum(x.pricePerKg)}/kg{buyer ? ` — ${buyer} (credit)` : ""}
                  </div>
                  {cost && (
                    <div className="receipt-line2">
                      Cost ₱{fmtNum(cost.costSubtracted)} (₱{fmtNum(cost.costPerKgAtTime)}/kg) · Profit{" "}
                      <strong style={{ color: profit >= 0 ? "var(--paddy)" : "var(--alert)" }}>₱{fmtNum(profit)}</strong>
                    </div>
                  )}
                  {x.notes && <div className="receipt-notes">{x.notes}</div>}
                </div>
                <div className="receipt-right">
                  <div className="receipt-total">₱ {fmtNum(x.totalAmount)}</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="icon-btn" onClick={() => printSale(x)} title="Print receipt">
                      <Printer size={15} />
                    </button>
                    <button className="icon-btn" onClick={() => startEdit(x)} title="Edit">
                      <Pencil size={15} />
                    </button>
                    <button className="icon-btn" onClick={() => deletePalaySale(x.id)} title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
