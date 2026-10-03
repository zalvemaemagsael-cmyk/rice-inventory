import React, { useState } from "react";
import { Sprout, Plus, Trash2, Pencil, X } from "lucide-react";
import { todayStr, fmtDate, fmtNum, travelFeeFor } from "../lib/format.js";
import { EmptyState, KpiCard } from "./ui.jsx";

const RAW_STOCK_TARGET_KG = 6000;

export default function RawPurchases({ data, rawStockKg, rawPurchaseCostTotal, totalRawSpendAllTime, addRawPurchase, updateRawPurchase, deleteRawPurchase }) {
  const blankForm = {
    date: todayStr(),
    source: "",
    quantityKg: "",
    pricePerKg: "",
    sackSizeKg: "",
    notes: "",
  };
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);

  const quantityKg = Number(form.quantityKg) || 0;
  const sackSizeKg = Number(form.sackSizeKg) || 0;
  const sacksBought = sackSizeKg > 0 ? quantityKg / sackSizeKg : null;
  // Travel fee is automatic, based on total weight bought (see format.js
  // for the tiers). Only shown/applied once a weight has been entered.
  const travelFee = quantityKg > 0 ? travelFeeFor(quantityKg) : 0;
  const goodsCost = quantityKg * (Number(form.pricePerKg) || 0);
  const total = goodsCost + travelFee;

  const startEdit = (p) => {
    setEditingId(p.id);
    setForm({
      date: p.date,
      source: p.source,
      quantityKg: String(p.quantityKg),
      pricePerKg: String(p.pricePerKg),
      sackSizeKg: p.sackSizeKg ? String(p.sackSizeKg) : "",
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
      sackSizeKg,
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
            Sack size (kg, optional)
            <input type="number" min="0" step="0.1" placeholder="e.g. 50" value={form.sackSizeKg}
              onChange={(e) => setForm({ ...form, sackSizeKg: e.target.value })} />
          </label>
          <label>
            Sacks bought
            <input type="text" value={sacksBought !== null ? fmtNum(sacksBought) : "—"} disabled />
          </label>
        </div>
        <div className="form-row">
          <label>
            Travel fee (auto)
            <input type="text" value={`₱ ${fmtNum(travelFee)}`} disabled />
          </label>
          <label>
            Total cost
            <input type="text" value={`₱ ${fmtNum(total)}`} disabled />
          </label>
          <label className="full">
            Notes (optional)
            <input type="text" placeholder="e.g. moisture, variety" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
        </div>
        <div className="hint-line">
          Travel fee is automatic and scales with weight: every full 40kg costs ₱10, and any
          leftover amount is ₱7 (30-39kg) or ₱5 (under 30kg) — so larger purchases correctly add up
          to more than one load's worth of travel fee.
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
            const sacks = p.sackSizeKg > 0 ? p.quantityKg / p.sackSizeKg : null;
            return (
              <div className="receipt" key={p.id}>
                <div className="receipt-main">
                  <div className="receipt-line1">
                    <strong>{fmtNum(p.quantityKg)} kg unmilled palay</strong>
                    <span className="receipt-date">{fmtDate(p.date)}</span>
                  </div>
                  <div className="receipt-line2">
                    From {p.source} @ ₱{fmtNum(p.pricePerKg)}/kg
                    {sacks !== null ? ` — ${fmtNum(sacks)} sack(s) @ ${fmtNum(p.sackSizeKg)}kg` : ""}
                    {p.travelFee ? ` — travel fee ₱${fmtNum(p.travelFee)}` : ""}
                  </div>
                  {p.notes && <div className="receipt-notes">{p.notes}</div>}
                </div>
                <div className="receipt-right">
                  <div className="receipt-total">₱ {fmtNum(p.totalCost)}</div>
                  <div style={{ display: "flex", gap: 4 }}>
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
