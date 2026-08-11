import React, { useState } from "react";
import { Truck, Plus, Trash2 } from "lucide-react";
import { todayStr, fmtDate, fmtNum } from "../lib/format.js";
import { EmptyState } from "./ui.jsx";

export default function SupplierPurchases({ data, addSupplierPurchase, deleteSupplierPurchase, riceTypeName, supplierName }) {
  const [form, setForm] = useState({
    date: todayStr(),
    supplierId: data.suppliers[0]?.id || "",
    riceTypeId: data.riceTypes[0]?.id || "",
    quantity: "",
    pricePerUnit: "",
    notes: "",
  });

  const disabled = data.riceTypes.length === 0 || data.suppliers.length === 0;
  const total = (Number(form.quantity) || 0) * (Number(form.pricePerUnit) || 0);

  const submit = (e) => {
    e.preventDefault();
    if (!form.quantity || !form.pricePerUnit || !form.riceTypeId || !form.supplierId) return;
    addSupplierPurchase({
      date: form.date,
      supplierId: form.supplierId,
      riceTypeId: form.riceTypeId,
      quantity: Number(form.quantity),
      pricePerUnit: Number(form.pricePerUnit),
      totalCost: total,
      notes: form.notes,
    });
    setForm({ ...form, quantity: "", pricePerUnit: "", notes: "" });
  };

  return (
    <div>
      <div className="section-label">Buy already-milled rice from a supplier</div>
      <div className="hint-line">Each rice type can carry its own price from each supplier.</div>
      {disabled ? (
        <EmptyState
          icon={Truck}
          title="Add a rice type and a supplier first"
          body="Supplier purchases need both a rice type and a supplier to record against."
        />
      ) : (
        <form className="form-card" onSubmit={submit}>
          <div className="form-row">
            <label>
              Date
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </label>
            <label>
              Supplier
              <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                {data.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label>
              Rice type
              <select value={form.riceTypeId} onChange={(e) => setForm({ ...form, riceTypeId: e.target.value })}>
                {data.riceTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>{rt.name} · {rt.grade} ({rt.unit})</option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              Quantity
              <input type="number" min="0" step="0.01" placeholder="0" value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
            </label>
            <label>
              Price per unit (₱)
              <input type="number" min="0" step="0.01" placeholder="0.00" value={form.pricePerUnit}
                onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })} required />
            </label>
            <label>
              Total cost
              <input type="text" value={`₱ ${fmtNum(total)}`} disabled />
            </label>
          </div>
          <label className="full">
            Notes (optional)
            <input type="text" placeholder="e.g. delivery ref, quality note" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
          <button type="submit" className="btn-primary"><Plus size={16} /> Record purchase</button>
        </form>
      )}

      <div className="section-label" style={{ marginTop: 28 }}>Supplier purchase log</div>
      {data.supplierPurchases.length === 0 ? (
        <EmptyState icon={Truck} title="No supplier purchases yet" body="Finished rice bought directly from suppliers will appear here." />
      ) : (
        <div className="receipt-list">
          {data.supplierPurchases.map((p) => (
            <div className="receipt" key={p.id}>
              <div className="receipt-main">
                <div className="receipt-line1">
                  <strong>{riceTypeName(p.riceTypeId)}</strong>
                  <span className="receipt-date">{fmtDate(p.date)}</span>
                </div>
                <div className="receipt-line2">
                  {fmtNum(p.quantity)} from {supplierName(p.supplierId)} @ ₱{fmtNum(p.pricePerUnit)}
                </div>
                {p.notes && <div className="receipt-notes">{p.notes}</div>}
              </div>
              <div className="receipt-right">
                <div className="receipt-total">₱ {fmtNum(p.totalCost)}</div>
                <button className="icon-btn" onClick={() => deleteSupplierPurchase(p.id)} title="Delete">
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
