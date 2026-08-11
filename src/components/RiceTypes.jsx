import React, { useState } from "react";
import { Wheat, Plus, Trash2 } from "lucide-react";
import { fmtNum } from "../lib/format.js";
import { EmptyState } from "./ui.jsx";

export default function RiceTypes({ data, addRiceType, deleteRiceType }) {
  const [form, setForm] = useState({ name: "", grade: "Premium", unit: "sack (25kg)", reorderLevel: "" });

  const submit = (e) => {
    e.preventDefault();
    if (!form.name || form.reorderLevel === "") return;
    addRiceType({ ...form, reorderLevel: Number(form.reorderLevel) });
    setForm({ name: "", grade: "Premium", unit: "sack (25kg)", reorderLevel: "" });
  };

  return (
    <div>
      <div className="section-label">Add a finished rice type</div>
      <form className="form-card" onSubmit={submit}>
        <div className="form-row">
          <label>
            Name
            <input type="text" placeholder="e.g. Dinorado" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Grade
            <select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
              <option>Premium</option>
              <option>Well-Milled</option>
              <option>Regular-Milled</option>
              <option>Special</option>
            </select>
          </label>
          <label>
            Unit
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              <option>sack (25kg)</option>
              <option>sack (50kg)</option>
              <option>kg</option>
            </select>
          </label>
        </div>
        <label className="full">
          Reorder point ({form.unit})
          <input type="number" min="0" step="0.01" placeholder="e.g. 20" value={form.reorderLevel}
            onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} required />
        </label>
        <button type="submit" className="btn-primary"><Plus size={16} /> Add rice type</button>
      </form>

      <div className="section-label" style={{ marginTop: 28 }}>All rice types</div>
      {data.riceTypes.length === 0 ? (
        <EmptyState icon={Wheat} title="None yet" body="Add a rice type above." />
      ) : (
        <div className="list-table">
          {data.riceTypes.map((rt) => (
            <div className="list-row" key={rt.id}>
              <div>
                <strong>{rt.name}</strong>
                <span className="muted"> · {rt.grade} · {rt.unit}</span>
              </div>
              <div className="list-row-right">
                <span className="muted">Reorder at {fmtNum(rt.reorderLevel)}</span>
                <button className="icon-btn" onClick={() => deleteRiceType(rt.id)} title="Delete">
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
