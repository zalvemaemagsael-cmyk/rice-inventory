import React, { useState } from "react";
import { Cog, Plus, Trash2 } from "lucide-react";
import { todayStr, fmtDate, fmtNum } from "../lib/format.js";
import { EmptyState } from "./ui.jsx";

export default function Milling({ data, rawStockKg, addMilling, deleteMilling, riceTypeName }) {
  const [form, setForm] = useState({
    date: todayStr(),
    riceTypeId: data.riceTypes[0]?.id || "",
    rawQuantityKg: "",
    outputQuantity: "",
    notes: "",
  });
  const disabled = data.riceTypes.length === 0;

  const submit = (e) => {
    e.preventDefault();
    if (!form.riceTypeId || !form.rawQuantityKg || !form.outputQuantity) return;
    addMilling({
      date: form.date,
      riceTypeId: form.riceTypeId,
      rawQuantityKg: Number(form.rawQuantityKg),
      outputQuantity: Number(form.outputQuantity),
      notes: form.notes,
    });
    setForm({ ...form, rawQuantityKg: "", outputQuantity: "", notes: "" });
  };

  return (
    <div>
      <div className="section-label">Mill unmilled palay into finished stock</div>
      <div className="raw-card" style={{ marginBottom: 14 }}>
        <div>
          <div className="stock-name">Available to mill</div>
          <div className="stock-grade">Current unmilled stock</div>
        </div>
        <div className="stock-qty">{fmtNum(rawStockKg)} <span className="stock-unit">kg</span></div>
      </div>
      {disabled ? (
        <EmptyState icon={Cog} title="Add a rice type first" body="Milling needs a finished rice type to produce." />
      ) : (
        <form className="form-card" onSubmit={submit}>
          <div className="form-row">
            <label>
              Date
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </label>
            <label>
              Output rice type
              <select value={form.riceTypeId} onChange={(e) => setForm({ ...form, riceTypeId: e.target.value })}>
                {data.riceTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>{rt.name} · {rt.grade} ({rt.unit})</option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              Raw palay used (kg)
              <input type="number" min="0" step="0.1" placeholder="0" value={form.rawQuantityKg}
                onChange={(e) => setForm({ ...form, rawQuantityKg: e.target.value })} required />
            </label>
            <label>
              Output produced
              <input type="number" min="0" step="0.01" placeholder="0" value={form.outputQuantity}
                onChange={(e) => setForm({ ...form, outputQuantity: e.target.value })} required />
            </label>
            <label>
              Notes (optional)
              <input type="text" placeholder="e.g. milling yield, miller name" value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
          </div>
          <button type="submit" className="btn-primary"><Plus size={16} /> Record milling</button>
        </form>
      )}

      <div className="section-label" style={{ marginTop: 28 }}>Milling log</div>
      {data.millings.length === 0 ? (
        <EmptyState icon={Cog} title="No milling runs yet" body="Each run converts raw weight into finished stock." />
      ) : (
        <div className="receipt-list">
          {data.millings.map((m) => (
            <div className="receipt" key={m.id}>
              <div className="receipt-main">
                <div className="receipt-line1">
                  <strong>{riceTypeName(m.riceTypeId)}</strong>
                  <span className="receipt-date">{fmtDate(m.date)}</span>
                </div>
                <div className="receipt-line2">
                  {fmtNum(m.rawQuantityKg)} kg raw → {fmtNum(m.outputQuantity)} finished
                </div>
                {m.notes && <div className="receipt-notes">{m.notes}</div>}
              </div>
              <div className="receipt-right">
                <button className="icon-btn" onClick={() => deleteMilling(m.id)} title="Delete">
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
