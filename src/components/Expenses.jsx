import React, { useState } from "react";
import { Receipt, Plus, Trash2, Pencil, X } from "lucide-react";
import { todayStr, fmtDate, fmtNum } from "../lib/format.js";
import { EmptyState } from "./ui.jsx";

const CATEGORIES = ["Milling labor", "Electricity", "Packaging / sacks", "Transport", "Rent", "Other"];

export default function Expenses({ data, totalExpenses, addExpense, updateExpense, deleteExpense }) {
  const blankForm = { date: todayStr(), category: CATEGORIES[0], amount: "", notes: "" };
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);

  const startEdit = (e) => {
    setEditingId(e.id);
    setForm({ date: e.date, category: e.category, amount: String(e.amount), notes: e.notes || "" });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setForm(blankForm);
  };

  const submit = (ev) => {
    ev.preventDefault();
    if (!form.amount) return;
    const payload = { date: form.date, category: form.category, amount: Number(form.amount), notes: form.notes };
    if (editingId) {
      updateExpense(editingId, payload);
      setEditingId(null);
    } else {
      addExpense(payload);
    }
    setForm(blankForm);
  };

  return (
    <div>
      <div className="section-label">{editingId ? "Edit expense" : "Record an expense"}</div>
      <div className="hint-line">Milling labor, electricity, packaging, transport, and other overhead — counted in the Reports tab's cost and profit totals.</div>
      <form className="form-card" onSubmit={submit}>
        <div className="form-row">
          <label>
            Date
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </label>
          <label>
            Category
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>
            Amount (₱)
            <input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </label>
          <label className="full">
            Notes (optional)
            <input type="text" placeholder="e.g. August electric bill" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" className="btn-primary">
            {editingId ? <Pencil size={16} /> : <Plus size={16} />} {editingId ? "Update expense" : "Record expense"}
          </button>
          {editingId && (
            <button type="button" className="icon-btn" onClick={cancelEdit} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <X size={15} /> Cancel
            </button>
          )}
        </div>
      </form>

      <div className="section-label" style={{ marginTop: 28, display: "flex", justifyContent: "space-between" }}>
        <span>Expense log</span>
        <span className="muted">Total: ₱ {fmtNum(totalExpenses)}</span>
      </div>
      {data.expenses.length === 0 ? (
        <EmptyState icon={Receipt} title="No expenses recorded yet" body="Other business costs will appear here." />
      ) : (
        <div className="receipt-list">
          {data.expenses.map((e) => (
            <div className="receipt" key={e.id}>
              <div className="receipt-main">
                <div className="receipt-line1">
                  <strong>{e.category}</strong>
                  <span className="receipt-date">{fmtDate(e.date)}</span>
                </div>
                {e.notes && <div className="receipt-notes">{e.notes}</div>}
              </div>
              <div className="receipt-right">
                <div className="receipt-total">₱ {fmtNum(e.amount)}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button className="icon-btn" onClick={() => startEdit(e)} title="Edit">
                    <Pencil size={15} />
                  </button>
                  <button className="icon-btn" onClick={() => deleteExpense(e.id)} title="Delete">
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
