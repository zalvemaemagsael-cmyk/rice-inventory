import React, { useState } from "react";
import { Package, Plus, Trash2, Pencil, X, Printer } from "lucide-react";
import { todayStr, fmtDate, fmtNum, kgPerUnit } from "../lib/format.js";
import { EmptyState } from "./ui.jsx";
import PrinterBar from "./PrinterBar.jsx";
import { buildSaleReceipt } from "../lib/receipt.js";
import { printReceipt } from "../lib/printer.js";

export default function StockOuts({ data, stockByType, addStockOut, updateStockOut, deleteStockOut, riceTypeName, buyerName, buyerBalances, showToast }) {
  const blankForm = {
    date: todayStr(),
    riceTypeId: data.riceTypes[0]?.id || "",
    quantity: "",
    quantityUnit: "native", // "native" = the rice type's own unit (e.g. sack), "kg" = kilograms
    reason: "Sale",
    pricePerUnit: "",
    buyerId: "",
    notes: "",
  };
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const disabled = data.riceTypes.length === 0;
  const isSale = form.reason === "Sale";

  const selectedType = data.riceTypes.find((rt) => rt.id === form.riceTypeId);
  const factor = selectedType ? kgPerUnit(selectedType.unit) : 1;
  // Whether this rice type's own unit is already kg — if so there's
  // nothing to toggle, the quantity typed in is already the native unit.
  const canToggleUnit = factor > 1;

  const enteredQty = Number(form.quantity) || 0;
  // Quantity converted into the rice type's native unit (sacks, etc.) —
  // this is what actually gets stored/subtracted from stock, so every
  // other part of the app keeps working in the unit it already expects.
  const nativeQuantity = canToggleUnit && form.quantityUnit === "kg" ? enteredQty / factor : enteredQty;

  const total = nativeQuantity * (Number(form.pricePerUnit) || 0);

  const startEdit = (s) => {
    setEditingId(s.id);
    setForm({
      date: s.date,
      riceTypeId: s.riceTypeId,
      quantity: String(s.quantity),
      quantityUnit: "native",
      reason: s.reason,
      pricePerUnit: s.pricePerUnit ? String(s.pricePerUnit) : "",
      buyerId: s.buyerId || "",
      notes: s.notes || "",
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setForm(blankForm);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.quantity || !form.riceTypeId) return;
    if (isSale && !form.pricePerUnit) return;
    const payload = {
      date: form.date,
      riceTypeId: form.riceTypeId,
      quantity: nativeQuantity,
      reason: form.reason,
      pricePerUnit: isSale ? Number(form.pricePerUnit) : 0,
      totalAmount: isSale ? total : 0,
      buyerId: isSale && form.buyerId ? form.buyerId : null,
      notes: form.notes,
    };
    if (editingId) {
      updateStockOut(editingId, payload);
      setEditingId(null);
    } else {
      addStockOut(payload);
    }
    setForm(blankForm);
  };

  const printSale = async (s) => {
    const riceType = data.riceTypes.find((rt) => rt.id === s.riceTypeId);
    const buyer = s.buyerId ? buyerName(s.buyerId) : null;
    const lines = buildSaleReceipt({
      sale: s,
      riceType,
      buyerName: buyer,
      balance: s.buyerId ? buyerBalances[s.buyerId] || 0 : null,
      formattedDate: fmtDate(s.date),
    });
    try {
      await printReceipt(lines);
    } catch (e) {
      showToast(`Couldn't print: ${e.message || e}. Check the printer is on and in range.`);
    }
  };

  return (
    <div>
      <PrinterBar showToast={showToast} />
      <div className="section-label">{editingId ? "Edit stock-out" : "Record finished stock leaving the warehouse"}</div>
      {disabled ? (
        <EmptyState icon={Package} title="Add a rice type first" body="Stock-outs need a rice type to record against." />
      ) : (
        <form className="form-card" onSubmit={submit}>
          <div className="form-row">
            <label>
              Date
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </label>
            <label>
              Rice type
              <select value={form.riceTypeId} onChange={(e) => setForm({ ...form, riceTypeId: e.target.value, quantityUnit: "native" })}>
                {data.riceTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} · {rt.grade} (on hand: {fmtNum(stockByType[rt.id] || 0)})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Reason
              <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                <option>Sale</option>
                <option>Damaged / spoiled</option>
                <option>Adjustment</option>
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              Quantity {canToggleUnit ? `(${form.quantityUnit === "kg" ? "kg" : selectedType.unit})` : ""}
              <input type="number" min="0" step="0.01" placeholder="0" value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
            </label>
            {canToggleUnit && (
              <label>
                Quantity unit
                <select value={form.quantityUnit} onChange={(e) => setForm({ ...form, quantityUnit: e.target.value })}>
                  <option value="native">{selectedType.unit}</option>
                  <option value="kg">Kilograms</option>
                </select>
              </label>
            )}
            {canToggleUnit && form.quantityUnit === "kg" && enteredQty > 0 && (
              <label>
                = {selectedType.unit}
                <input type="text" value={fmtNum(nativeQuantity)} disabled />
              </label>
            )}
            {isSale && (
              <>
                <label>
                  Price per {canToggleUnit ? selectedType.unit : "unit"} (₱)
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={form.pricePerUnit}
                    onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })} required />
                </label>
                <label>
                  Total amount
                  <input type="text" value={`₱ ${fmtNum(total)}`} disabled />
                </label>
              </>
            )}
          </div>
          {isSale && (
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
                <input type="text" placeholder="e.g. additional details" value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </label>
            </div>
          )}
          {!isSale && (
            <label className="full">
              Notes (optional)
              <input type="text" placeholder="e.g. reason for adjustment" value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
          )}
          {isSale && data.buyers.length === 0 && (
            <div className="hint-line">No buyers added yet — add one in the Buyers tab if this sale is on credit.</div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" className="btn-primary">
              {editingId ? <Pencil size={16} /> : <Plus size={16} />} {editingId ? "Update stock-out" : "Record stock-out"}
            </button>
            {editingId && (
              <button type="button" className="icon-btn" onClick={cancelEdit} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <X size={15} /> Cancel
              </button>
            )}
          </div>
        </form>
      )}

      <div className="section-label" style={{ marginTop: 28 }}>Stock-out log</div>
      {data.stockOuts.length === 0 ? (
        <EmptyState icon={Package} title="No stock-outs yet" body="Sales, damage, or adjustments will appear here." />
      ) : (
        <div className="receipt-list">
          {data.stockOuts.map((s) => {
            const buyer = s.buyerId ? buyerName(s.buyerId) : null;
            return (
              <div className="receipt" key={s.id}>
                <div className="receipt-main">
                  <div className="receipt-line1">
                    <strong>{riceTypeName(s.riceTypeId)}</strong>
                    <span className="receipt-date">{fmtDate(s.date)}</span>
                  </div>
                  <div className="receipt-line2">
                    {fmtNum(s.quantity)} — {s.reason}
                    {s.reason === "Sale" && s.pricePerUnit ? ` @ ₱${fmtNum(s.pricePerUnit)}` : ""}
                    {buyer ? ` — ${buyer} (credit)` : ""}
                  </div>
                  {s.notes && <div className="receipt-notes">{s.notes}</div>}
                </div>
                <div className="receipt-right">
                  {s.reason === "Sale" && <div className="receipt-total">₱ {fmtNum(s.totalAmount)}</div>}
                  <div style={{ display: "flex", gap: 4 }}>
                    {s.reason === "Sale" && (
                      <button className="icon-btn" onClick={() => printSale(s)} title="Print receipt">
                        <Printer size={15} />
                      </button>
                    )}
                    <button className="icon-btn" onClick={() => startEdit(s)} title="Edit">
                      <Pencil size={15} />
                    </button>
                    <button className="icon-btn" onClick={() => deleteStockOut(s.id)} title="Delete">
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
