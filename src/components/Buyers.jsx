import React, { useState } from "react";
import { HandCoins, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { todayStr, fmtDate, fmtNum } from "../lib/format.js";
import { EmptyState } from "./ui.jsx";

export default function Buyers({ data, buyerBalances, addBuyer, deleteBuyer, addPayment, deletePayment }) {
  const [form, setForm] = useState({ name: "", contact: "", notes: "" });
  const [expandedId, setExpandedId] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ date: todayStr(), amount: "", notes: "" });

  const submit = (e) => {
    e.preventDefault();
    if (!form.name) return;
    addBuyer(form);
    setForm({ name: "", contact: "", notes: "" });
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
    setPaymentForm({ date: todayStr(), amount: "", notes: "" });
  };

  const submitPayment = (e, buyerId) => {
    e.preventDefault();
    if (!paymentForm.amount) return;
    addPayment({ buyerId, date: paymentForm.date, amount: Number(paymentForm.amount), notes: paymentForm.notes });
    setPaymentForm({ date: todayStr(), amount: "", notes: "" });
  };

  const totalOwed = data.buyers.reduce((sum, b) => sum + Math.max(0, buyerBalances[b.id] || 0), 0);

  return (
    <div>
      <div className="section-label">Add a buyer</div>
      <div className="hint-line">Track who buys on credit (utang). Attach a buyer to a Sale in Stock Out to build up their balance, then record payments here as they pay it down.</div>
      <form className="form-card" onSubmit={submit}>
        <div className="form-row">
          <label>
            Name
            <input type="text" placeholder="e.g. Aling Nena" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Contact (optional)
            <input type="text" placeholder="phone or address" value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          </label>
          <label className="full">
            Notes (optional)
            <input type="text" placeholder="e.g. sari-sari store owner" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
        </div>
        <button type="submit" className="btn-primary"><Plus size={16} /> Add buyer</button>
      </form>

      {data.buyers.length > 0 && (
        <div className="report-summary-row" style={{ marginTop: 16 }}>
          <div className="report-summary-card">
            <div className="report-summary-label">Total outstanding (utang)</div>
            <div className="report-summary-value" style={{ color: totalOwed > 0 ? "var(--alert)" : "var(--paddy)" }}>
              ₱ {fmtNum(totalOwed)}
            </div>
          </div>
        </div>
      )}

      <div className="section-label" style={{ marginTop: 28 }}>All buyers</div>
      {data.buyers.length === 0 ? (
        <EmptyState icon={HandCoins} title="None yet" body="Add a buyer above to start tracking credit sales." />
      ) : (
        <div className="list-table">
          {data.buyers.map((b) => {
            const balance = buyerBalances[b.id] || 0;
            const sales = data.stockOuts.filter((s) => s.buyerId === b.id && s.reason === "Sale");
            const buyerPayments = data.payments.filter((p) => p.buyerId === b.id);
            const isExpanded = expandedId === b.id;
            return (
              <div key={b.id}>
                <div className="list-row" style={{ cursor: "pointer" }} onClick={() => toggleExpand(b.id)}>
                  <div>
                    <strong>{b.name}</strong>
                    {b.contact && <span className="muted"> · {b.contact}</span>}
                  </div>
                  <div className="list-row-right">
                    <span
                      className="receipt-total"
                      style={{ color: balance > 0 ? "var(--alert)" : balance < 0 ? "var(--paddy)" : "var(--husk)" }}
                    >
                      {balance > 0 ? `Owes ₱${fmtNum(balance)}` : balance < 0 ? `Overpaid ₱${fmtNum(-balance)}` : "Settled"}
                    </span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    <button
                      className="icon-btn"
                      onClick={(e) => { e.stopPropagation(); deleteBuyer(b.id); }}
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="form-card" style={{ marginTop: -2, marginBottom: 8, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                    <div className="section-label">Record a payment from {b.name}</div>
                    <form className="form-row" onSubmit={(e) => submitPayment(e, b.id)} style={{ alignItems: "flex-end" }}>
                      <label>
                        Date
                        <input type="date" value={paymentForm.date}
                          onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} required />
                      </label>
                      <label>
                        Amount (₱)
                        <input type="number" min="0" step="0.01" placeholder="0.00" value={paymentForm.amount}
                          onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} required />
                      </label>
                      <label className="full">
                        Notes (optional)
                        <input type="text" placeholder="e.g. partial payment" value={paymentForm.notes}
                          onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
                      </label>
                      <button type="submit" className="btn-primary"><Plus size={15} /> Add payment</button>
                    </form>

                    {(sales.length > 0 || buyerPayments.length > 0) && (
                      <div style={{ marginTop: 14 }}>
                        <div className="hint-line">History (most recent first)</div>
                        <div className="receipt-list">
                          {[...sales.map((s) => ({ ...s, kind: "sale" })), ...buyerPayments.map((p) => ({ ...p, kind: "payment" }))]
                            .sort((a, b2) => (a.date < b2.date ? 1 : -1))
                            .map((entry) => (
                              <div className="receipt" key={entry.id}>
                                <div className="receipt-main">
                                  <div className="receipt-line1">
                                    <strong>{entry.kind === "sale" ? "Sale" : "Payment received"}</strong>
                                    <span className="receipt-date">{fmtDate(entry.date)}</span>
                                  </div>
                                  {entry.notes && <div className="receipt-notes">{entry.notes}</div>}
                                </div>
                                <div className="receipt-right">
                                  <div
                                    className="receipt-total"
                                    style={{ color: entry.kind === "sale" ? "var(--alert)" : "var(--paddy)" }}
                                  >
                                    {entry.kind === "sale" ? "+" : "−"}₱ {fmtNum(entry.kind === "sale" ? entry.totalAmount : entry.amount)}
                                  </div>
                                  {entry.kind === "payment" && (
                                    <button className="icon-btn" onClick={() => deletePayment(entry.id)} title="Delete payment">
                                      <Trash2 size={15} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
