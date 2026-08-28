import React, { useState } from "react";
import { Cog, Plus, Trash2, Pencil, X, Wind } from "lucide-react";
import { todayStr, fmtDate, fmtNum } from "../lib/format.js";
import { EmptyState } from "./ui.jsx";

export default function Milling({
  data,
  rawStockKg,
  huskStockKg,
  addMilling,
  updateMilling,
  deleteMilling,
  addHuskSale,
  updateHuskSale,
  deleteHuskSale,
  riceTypeName,
  buyerName,
}) {
  const blankForm = {
    date: todayStr(),
    riceTypeId: data.riceTypes[0]?.id || "",
    rawQuantityKg: "",
    outputQuantity: "",
    huskQuantityKg: "",
    notes: "",
  };
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const disabled = data.riceTypes.length === 0;

  const blankHuskForm = { date: todayStr(), quantityKg: "", pricePerKg: "", buyerId: "", notes: "" };
  const [huskForm, setHuskForm] = useState(blankHuskForm);
  const [editingHuskId, setEditingHuskId] = useState(null);
  const huskTotal = (Number(huskForm.quantityKg) || 0) * (Number(huskForm.pricePerKg) || 0);

  const startEdit = (m) => {
    setEditingId(m.id);
    setForm({
      date: m.date,
      riceTypeId: m.riceTypeId,
      rawQuantityKg: String(m.rawQuantityKg),
      outputQuantity: String(m.outputQuantity),
      huskQuantityKg: m.huskQuantityKg ? String(m.huskQuantityKg) : "",
      notes: m.notes || "",
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setForm(blankForm);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.riceTypeId || !form.rawQuantityKg || !form.outputQuantity) return;
    const payload = {
      date: form.date,
      riceTypeId: form.riceTypeId,
      rawQuantityKg: Number(form.rawQuantityKg),
      outputQuantity: Number(form.outputQuantity),
      huskQuantityKg: Number(form.huskQuantityKg) || 0,
      notes: form.notes,
    };
    if (editingId) {
      updateMilling(editingId, payload);
      setEditingId(null);
    } else {
      addMilling(payload);
    }
    setForm(blankForm);
  };

  const startEditHusk = (h) => {
    setEditingHuskId(h.id);
    setHuskForm({
      date: h.date,
      quantityKg: String(h.quantityKg),
      pricePerKg: String(h.pricePerKg),
      buyerId: h.buyerId || "",
      notes: h.notes || "",
    });
  };
  const cancelEditHusk = () => {
    setEditingHuskId(null);
    setHuskForm(blankHuskForm);
  };

  const submitHusk = (e) => {
    e.preventDefault();
    if (!huskForm.quantityKg || !huskForm.pricePerKg) return;
    const payload = {
      date: huskForm.date,
      quantityKg: Number(huskForm.quantityKg),
      pricePerKg: Number(huskForm.pricePerKg),
      totalAmount: huskTotal,
      buyerId: huskForm.buyerId || null,
      notes: huskForm.notes,
    };
    if (editingHuskId) {
      updateHuskSale(editingHuskId, payload);
      setEditingHuskId(null);
    } else {
      addHuskSale(payload);
    }
    setHuskForm(blankHuskForm);
  };

  return (
    <div>
      <div className="section-label">{editingId ? "Edit milling entry" : "Mill unmilled palay into finished stock"}</div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
        <div className="raw-card" style={{ flex: 1, minWidth: 220 }}>
          <div>
            <div className="stock-name">Available to mill</div>
            <div className="stock-grade">Current unmilled stock</div>
          </div>
          <div className="stock-qty">{fmtNum(rawStockKg)} <span className="stock-unit">kg</span></div>
        </div>
        <div className="raw-card" style={{ flex: 1, minWidth: 220 }}>
          <div>
            <div className="stock-name">Rice husk / bran on hand</div>
            <div className="stock-grade">Byproduct, awaiting sale</div>
          </div>
          <div className="stock-qty">{fmtNum(huskStockKg)} <span className="stock-unit">kg</span></div>
        </div>
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
              Husk/bran produced (kg, optional)
              <input type="number" min="0" step="0.1" placeholder="0" value={form.huskQuantityKg}
                onChange={(e) => setForm({ ...form, huskQuantityKg: e.target.value })} />
            </label>
          </div>
          <label className="full">
            Notes (optional)
            <input type="text" placeholder="e.g. milling yield, miller name" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" className="btn-primary">
              {editingId ? <Pencil size={16} /> : <Plus size={16} />} {editingId ? "Update milling" : "Record milling"}
            </button>
            {editingId && (
              <button type="button" className="icon-btn" onClick={cancelEdit} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <X size={15} /> Cancel
              </button>
            )}
          </div>
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
                  {m.huskQuantityKg ? ` — ${fmtNum(m.huskQuantityKg)} kg husk/bran` : ""}
                </div>
                {m.notes && <div className="receipt-notes">{m.notes}</div>}
              </div>
              <div className="receipt-right">
                <div style={{ display: "flex", gap: 4 }}>
                  <button className="icon-btn" onClick={() => startEdit(m)} title="Edit">
                    <Pencil size={15} />
                  </button>
                  <button className="icon-btn" onClick={() => deleteMilling(m.id)} title="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="section-label" style={{ marginTop: 32 }}>{editingHuskId ? "Edit husk/bran sale" : "Sell rice husk/bran"}</div>
      <div className="hint-line">Husk/bran is the powdery byproduct of milling — record produced amounts above, then sell it here.</div>
      <form className="form-card" onSubmit={submitHusk}>
        <div className="form-row">
          <label>
            Date
            <input type="date" value={huskForm.date} onChange={(e) => setHuskForm({ ...huskForm, date: e.target.value })} required />
          </label>
          <label>
            Quantity (kg)
            <input type="number" min="0" step="0.1" placeholder="0" value={huskForm.quantityKg}
              onChange={(e) => setHuskForm({ ...huskForm, quantityKg: e.target.value })} required />
          </label>
          <label>
            Price per kg (₱)
            <input type="number" min="0" step="0.01" placeholder="0.00" value={huskForm.pricePerKg}
              onChange={(e) => setHuskForm({ ...huskForm, pricePerKg: e.target.value })} required />
          </label>
          <label>
            Total amount
            <input type="text" value={`₱ ${fmtNum(huskTotal)}`} disabled />
          </label>
        </div>
        <div className="form-row">
          <label>
            Buyer (optional — for credit/utang tracking)
            <select value={huskForm.buyerId} onChange={(e) => setHuskForm({ ...huskForm, buyerId: e.target.value })}>
              <option value="">— walk-in / cash sale —</option>
              {data.buyers.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <label className="full">
            Notes (optional)
            <input type="text" placeholder="e.g. buyer name, use as feed" value={huskForm.notes}
              onChange={(e) => setHuskForm({ ...huskForm, notes: e.target.value })} />
          </label>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" className="btn-primary">
            {editingHuskId ? <Pencil size={16} /> : <Plus size={16} />} {editingHuskId ? "Update sale" : "Record husk/bran sale"}
          </button>
          {editingHuskId && (
            <button type="button" className="icon-btn" onClick={cancelEditHusk} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <X size={15} /> Cancel
            </button>
          )}
        </div>
      </form>

      <div className="section-label" style={{ marginTop: 28 }}>Husk/bran sales log</div>
      {data.huskSales.length === 0 ? (
        <EmptyState icon={Wind} title="No husk/bran sales yet" body="Sales of the milling byproduct will appear here." />
      ) : (
        <div className="receipt-list">
          {data.huskSales.map((h) => {
            const buyer = h.buyerId ? buyerName(h.buyerId) : null;
            return (
              <div className="receipt" key={h.id}>
                <div className="receipt-main">
                  <div className="receipt-line1">
                    <strong>{fmtNum(h.quantityKg)} kg husk/bran</strong>
                    <span className="receipt-date">{fmtDate(h.date)}</span>
                  </div>
                  <div className="receipt-line2">
                    @ ₱{fmtNum(h.pricePerKg)}/kg{buyer ? ` — ${buyer} (credit)` : ""}
                  </div>
                  {h.notes && <div className="receipt-notes">{h.notes}</div>}
                </div>
                <div className="receipt-right">
                  <div className="receipt-total">₱ {fmtNum(h.totalAmount)}</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="icon-btn" onClick={() => startEditHusk(h)} title="Edit">
                      <Pencil size={15} />
                    </button>
                    <button className="icon-btn" onClick={() => deleteHuskSale(h.id)} title="Delete">
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
