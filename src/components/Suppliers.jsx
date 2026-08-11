import React, { useState } from "react";
import { Users, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "./ui.jsx";

export default function Suppliers({ data, addSupplier, deleteSupplier }) {
  const [form, setForm] = useState({ name: "", contact: "" });

  const submit = (e) => {
    e.preventDefault();
    if (!form.name) return;
    addSupplier(form);
    setForm({ name: "", contact: "" });
  };

  return (
    <div>
      <div className="section-label">Add a supplier</div>
      <form className="form-card" onSubmit={submit}>
        <div className="form-row">
          <label>
            Name
            <input type="text" placeholder="e.g. Nueva Ecija Mill" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Contact (optional)
            <input type="text" placeholder="phone or address" value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          </label>
        </div>
        <button type="submit" className="btn-primary"><Plus size={16} /> Add supplier</button>
      </form>

      <div className="section-label" style={{ marginTop: 28 }}>All suppliers</div>
      {data.suppliers.length === 0 ? (
        <EmptyState icon={Users} title="None yet" body="Add a supplier above." />
      ) : (
        <div className="list-table">
          {data.suppliers.map((s) => (
            <div className="list-row" key={s.id}>
              <div>
                <strong>{s.name}</strong>
                {s.contact && <span className="muted"> · {s.contact}</span>}
              </div>
              <div className="list-row-right">
                <button className="icon-btn" onClick={() => deleteSupplier(s.id)} title="Delete">
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
