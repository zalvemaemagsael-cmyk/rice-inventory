import React, { useState } from "react";
import { Sprout, Plus, Trash2 } from "lucide-react";
import { todayStr, fmtDate, fmtNum } from "../lib/format.js";
import { EmptyState } from "./ui.jsx";

export default function RawPurchases({ data, addRawPurchase, deleteRawPurchase }) {
  const [form, setForm] = useState({
    date: todayStr(),
    source: "",
    quantityKg: "",
    pricePerKg: "",
    notes: "",
  });

  const total = (Number(form.quantityKg) || 0) * (Number(form.pricePerKg) || 0);

  const submit = (e) => {
    e.preventDefault();
    if (!form.quantityKg || !form.pricePerKg || !form.source) return;
    addRawPurchase({
      date: form.date,
      source: form.source,
      quantityKg: Number(form.quantityKg),
      pricePerKg: Number(form.pricePerKg),
      totalCost: total,
      notes: form.notes,
    });
    setForm({ ...form, source: "", quantityKg: "", pricePerKg: "", notes: "" });
  };

  return (
    <div>
      <div className="section-label">Buy unmilled palay locally (by weight)</div>
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
            Total cost
            <input type="text" value={`₱ ${fmtNum(total)}`} disabled />
          </label>
          <label>
            Notes (optional)
            <input type="text" placeholder="e.g. moisture, variety" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
        </div>
        <button type="submit" className="btn-primary"><Plus size={16} /> Record raw purchase</button>
      </form>

      <div className="section-label" style={{ marginTop: 28 }}>Raw purchase log</div>
      {data.rawPurchases.length === 0 ? (
        <EmptyState icon={Sprout} title="No raw purchases yet" body="Unmilled palay bought by weight will appear here." />
      ) : (
        <div className="receipt-list">
          {data.rawPurchases.map((p) => (
            <div className="receipt" key={p.id}>
              <div className="receipt-main">
                <div className="receipt-line1">
                  <strong>{fmtNum(p.quantityKg)} kg unmilled palay</strong>
                  <span className="receipt-date">{fmtDate(p.date)}</span>
                </div>
                <div className="receipt-line2">
                  From {p.source} @ ₱{fmtNum(p.pricePerKg)}/kg
                </div>
                {p.notes && <div className="receipt-notes">{p.notes}</div>}
              </div>
              <div className="receipt-right">
                <div className="receipt-total">₱ {fmtNum(p.totalCost)}</div>
                <button className="icon-btn" onClick={() => deleteRawPurchase(p.id)} title="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
