import React, { useState } from "react";
import { Truck, Plus, Trash2, Pencil, X } from "lucide-react";
import { todayStr, fmtDate, fmtNum } from "../lib/format.js";
import { EmptyState } from "./ui.jsx";

export default function SupplierPurchases({ data, addSupplierPurchase, updateSupplierPurchase, deleteSupplierPurchase, riceTypeName, supplierName }) {
  const blankForm = {
    date: todayStr(),
    supplierId: data.suppliers[0]?.id || "",
    riceTypeId: data.riceTypes[0]?.id || "",
    quantity: "",
    pricePerUnit: "",
    notes: "",
  };
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);

  const disabled = data.riceTypes.length === 0 || data.suppliers.length === 0;
  const total = (Number(form.quantity) || 0) * (Number(form.pricePerUnit) || 0);

  const startEdit = (p) => {
    setEditingId(p.id);
    setForm({
      date: p.date,
      supplierId: p.supplierId,
      riceTypeId: p.riceTypeId,
      quantity: String(p.quantity),
      pricePerUnit: String(p.pricePerUnit),
      notes: p.notes || "",
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setForm(blankForm);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.quantity || !form.pricePerUnit || !form.riceTypeId || !form.supplierId) return;
    const payload = {
      date: form.date,
      supplierId: form.supplierId,
      riceTypeId: form.riceTypeId,
      quantity: Number(form.quantity),
      pricePerUnit: Number(form.pricePerUnit),
      totalCost: total,
      notes: form.notes,
    };
    if (editingId) {
      updateSupplierPurchase(editingId, payload);
      setEditingId(null);
    } else {
      addSupplierPurchase(payload);
    }
    setForm(blankForm);
  };

  return (
    <div>
      <div className="section-label">{editingId ? "Edit supplier purchase" : "Buy already-milled rice from a supplier"}</div>
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
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" className="btn-primary">
              {editingId ? <Pencil size={16} /> : <Plus size={16} />} {editingId ? "Update purchase" : "Record purchase"}
            </button>
            {editingId && (
              <button type="button" className="icon-btn" onClick={cancelEdit} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <X size={15} /> Cancel
              </button>
            )}
          </div>
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
                <div style={{ display: "flex", gap: 4 }}>
                  <button className="icon-btn" onClick={() => startEdit(p)} title="Edit">
                    <Pencil size={15} />
                  </button>
                  <button className="icon-btn" onClick={() => deleteSupplierPurchase(p.id)} title="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
