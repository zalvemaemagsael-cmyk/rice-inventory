import React, { useState } from "react";
import { Sprout, Plus, Trash2, Pencil, X, Printer } from "lucide-react";
import { todayStr, fmtDate, fmtNum, travelFeeBreakdown, splitIntoSacks, sackTotal, sackSummary } from "../lib/format.js";
import { EmptyState, KpiCard } from "./ui.jsx";
import PrinterBar from "./PrinterBar.jsx";
import { buildRawPurchaseReceipt } from "../lib/receipt.js";
import { printReceipt } from "../lib/printer.js";

const RAW_STOCK_TARGET_KG = 6000;

export default function RawPurchases({ data, rawStockKg, rawPurchaseCostTotal, totalRawSpendAllTime, addRawPurchase, updateRawPurchase, deleteRawPurchase, showToast }) {
  const blankForm = {
    date: todayStr(),
    source: "",
    quantityKg: "",
    pricePerKg: "",
    sackMode: "size", // "size" = enter kg per sack, "count" = enter number of sacks
    sackSizeKg: "",
    sackCount: "",
    notes: "",
  };
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);

  const quantityKg = Number(form.quantityKg) || 0;

  // Weight of one sack. Either typed in directly ("kg per sack" mode), or
  // worked out from the number of sacks ("number of sacks" mode, which
  // assumes the sacks weigh the same).
  const sackCountInput = Math.max(0, Math.floor(Number(form.sackCount) || 0));
  const sackSizeKg =
    form.sackMode === "count"
      ? sackCountInput > 0 && quantityKg > 0
        ? Math.round((quantityKg / sackCountInput) * 10000) / 10000
        : 0
      : Number(form.sackSizeKg) || 0;

  // How the purchase splits into sacks, and the travel fee charged per
  // sack (see format.js for the tiers). Falls back to 60kg loads when no
  // sack information has been entered.
  const sackGroups = splitIntoSacks(quantityKg, sackSizeKg);
  const feeInfo = quantityKg > 0 ? travelFeeBreakdown(quantityKg, sackSizeKg) : { fee: 0, parts: null };
  const travelFee = feeInfo.fee;
  const goodsCost = quantityKg * (Number(form.pricePerKg) || 0);
  const total = goodsCost + travelFee;

  // A saved sack size with more than 2 decimals (e.g. 33.3333) can only have
  // come from "number of sacks" mode, so reopen it that way.
  const restoreSackFields = (p) => {
    const size = Number(p.sackSizeKg) || 0;
    if (!(size > 0)) return { sackMode: "size", sackSizeKg: "", sackCount: "" };
    const messy = Math.abs(size * 100 - Math.round(size * 100)) > 1e-6;
    if (messy) {
      return { sackMode: "count", sackSizeKg: "", sackCount: String(Math.round(Number(p.quantityKg) / size)) };
    }
    return { sackMode: "size", sackSizeKg: String(size), sackCount: "" };
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setForm({
      date: p.date,
      source: p.source,
      quantityKg: String(p.quantityKg),
      pricePerKg: String(p.pricePerKg),
      ...restoreSackFields(p),
      notes: p.notes || "",
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setForm(blankForm);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.quantityKg || !form.pricePerKg || !form.source) return;
    const payload = {
      date: form.date,
      source: form.source,
      quantityKg,
      pricePerKg: Number(form.pricePerKg),
      sackSizeKg, // weight of one sack (worked out as total ÷ sacks in "number of sacks" mode)
      travelFee,
      totalCost: total,
      notes: form.notes,
    };
    if (editingId) {
      updateRawPurchase(editingId, payload);
      setEditingId(null);
    } else {
      addRawPurchase(payload);
    }
    setForm(blankForm);
  };

  const printPurchase = async (p) => {
    const lines = buildRawPurchaseReceipt({ purchase: p, formattedDate: fmtDate(p.date) });
    try {
      await printReceipt(lines);
    } catch (e) {
      showToast(`Couldn't print: ${e.message || e}. Check the printer is on and in range.`);
    }
  };

  return (
    <div>
      <KpiCard
        label="Palay / unmilled rice"
        sublabel="Current unmilled stock"
        value={rawStockKg}
        unit="kg"
        target={RAW_STOCK_TARGET_KG}
        footer={`₱ ${fmtNum(rawPurchaseCostTotal)} tied up in stock on hand`}
      />
      <PrinterBar showToast={showToast} />
      <div className="section-label">{editingId ? "Edit raw purchase" : "Buy unmilled palay locally (by weight)"}</div>
      <div className="hint-line">Weights vary by delivery - enter each one as it's bought, then mill it in the Milling tab.</div>
      <form className="form-card" onSubmit={submit}>
        <div className="form-row">
          <label>
            Date
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </label>
          <label>
            Bought from
            <input type="text" placeholder="e.g. farmer name or barangay" value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })} required />
          </label>
          <label>
            Weight (kg)
            <input type="number" min="0" step="0.1" placeholder="0" value={form.quantityKg}
              onChange={(e) => setForm({ ...form, quantityKg: e.target.value })} required />
          </label>
        </div>
        <div className="form-row">
          <label>
            Price per kg (₱)
            <input type="number" min="0" step="0.01" placeholder="0.00" value={form.pricePerKg}
              onChange={(e) => setForm({ ...form, pricePerKg: e.target.value })} required />
          </label>
          <label>
            Sacks — enter by
            <select value={form.sackMode} onChange={(e) => setForm({ ...form, sackMode: e.target.value })}>
              <option value="size">Kg per sack</option>
              <option value="count">Number of sacks</option>
            </select>
          </label>
          {form.sackMode === "size" ? (
            <label>
              Kg per sack (optional)
              <input type="number" min="0" step="0.1" placeholder="e.g. 50" value={form.sackSizeKg}
                onChange={(e) => setForm({ ...form, sackSizeKg: e.target.value })} />
            </label>
          ) : (
            <label>
              Number of sacks (optional)
              <input type="number" min="1" step="1" placeholder="e.g. 3" value={form.sackCount}
                onChange={(e) => setForm({ ...form, sackCount: e.target.value })} />
            </label>
          )}
        </div>
        <div className="form-row">
          {form.sackMode === "size" ? (
            <label>
              Sacks bought
              <input type="text" value={sackGroups ? fmtNum(sackTotal(sackGroups)) : "—"} disabled />
            </label>
          ) : (
            <label>
              Kg per sack
              <input type="text" value={sackSizeKg > 0 ? fmtNum(sackSizeKg) : "—"} disabled />
            </label>
          )}
          <label>
            Travel fee (auto)
            <input type="text" value={`₱ ${fmtNum(travelFee)}`} disabled />
          </label>
          <label>
            Total cost
            <input type="text" value={`₱ ${fmtNum(total)}`} disabled />
          </label>
        </div>
        <div className="form-row">
          <label className="full">
            Notes (optional)
            <input type="text" placeholder="e.g. moisture, variety" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
        </div>
        {feeInfo.parts && (
          <div className="hint-line" style={{ color: "var(--ink)" }}>
            {sackSummary(quantityKg, sackSizeKg)}. Travel fee:{" "}
            {feeInfo.parts.map((p) => `${p.count} × ₱${p.feeEach}`).join(" + ")} = ₱{fmtNum(travelFee)}.
          </div>
        )}
        {!feeInfo.parts && quantityKg > 0 && (
          <div className="hint-line">
            No sack details entered, so the travel fee is based on 60kg loads. Enter the kg per sack or the number
            of sacks to charge it per sack instead.
          </div>
        )}
        <div className="hint-line">
          Travel fee is charged per sack by that sack's weight: ₱10 for 40-60kg, ₱7 for 35-39.5kg, ₱5 for
          20-34.5kg, and ₱0 under 20kg. If the total doesn't divide evenly by the kg per sack, the leftover
          counts as one smaller sack.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" className="btn-primary">
            {editingId ? <Pencil size={16} /> : <Plus size={16} />} {editingId ? "Update purchase" : "Record raw purchase"}
          </button>
          {editingId && (
            <button type="button" className="icon-btn" onClick={cancelEdit} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <X size={15} /> Cancel
            </button>
          )}
        </div>
      </form>

      <div className="section-label" style={{ marginTop: 28, display: "flex", justifyContent: "space-between" }}>
        <span>Raw purchase log</span>
        <span className="muted">Cost of stock on hand: ₱ {fmtNum(rawPurchaseCostTotal)}</span>
      </div>
      <div className="hint-line" style={{ marginTop: -8 }}>
        This drops toward ₱0 as stock gets milled — once it's converted, that cost counts toward
        production instead (see the Reports tab), rather than staying counted as unspent raw stock.
        Lifetime total spent on palay, for reference only: <strong>₱ {fmtNum(totalRawSpendAllTime)}</strong>.
      </div>
      {data.rawPurchases.length === 0 ? (
        <EmptyState icon={Sprout} title="No raw purchases yet" body="Unmilled palay bought by weight will appear here." />
      ) : (
        <div className="receipt-list">
          {data.rawPurchases.map((p) => {
            const sacksText = sackSummary(p.quantityKg, p.sackSizeKg);
            return (
              <div className="receipt" key={p.id}>
                <div className="receipt-main">
                  <div className="receipt-line1">
                    <strong>{fmtNum(p.quantityKg)} kg unmilled palay</strong>
                    <span className="receipt-date">{fmtDate(p.date)}</span>
                  </div>
                  <div className="receipt-line2">
                    From {p.source} @ ₱{fmtNum(p.pricePerKg)}/kg
                    {sacksText ? ` — ${sacksText}` : ""}
                    {p.travelFee ? ` — travel fee ₱${fmtNum(p.travelFee)}` : ""}
                  </div>
                  {p.notes && <div className="receipt-notes">{p.notes}</div>}
                </div>
                <div className="receipt-right">
                  <div className="receipt-total">₱ {fmtNum(p.totalCost)}</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="icon-btn" onClick={() => printPurchase(p)} title="Print receipt">
                      <Printer size={15} />
                    </button>
                    <button className="icon-btn" onClick={() => startEdit(p)} title="Edit">
                      <Pencil size={15} />
                    </button>
                    <button className="icon-btn" onClick={() => deleteRawPurchase(p.id)} title="Delete">
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
