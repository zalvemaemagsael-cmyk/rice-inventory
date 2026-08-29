import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { emptyData } from "./data/emptyData.js";
import { loadData as loadLocalData, saveData as saveLocalData } from "./lib/storage.js";
import { isCloudConfigured, loadAll, isCloudEmpty, insertRow, updateRow, deleteRow, importAll, subscribeToChanges } from "./lib/db.js";
import { uid } from "./lib/format.js";
import Header from "./components/Header.jsx";
import TabNav from "./components/TabNav.jsx";
import Dashboard from "./components/Dashboard.jsx";
import SupplierPurchases from "./components/SupplierPurchases.jsx";
import RawPurchases from "./components/RawPurchases.jsx";
import Milling from "./components/Milling.jsx";
import StockOuts from "./components/StockOuts.jsx";
import RiceTypes from "./components/RiceTypes.jsx";
import Suppliers from "./components/Suppliers.jsx";
import Buyers from "./components/Buyers.jsx";
import Expenses from "./components/Expenses.jsx";
import Reports from "./components/Reports.jsx";

export default function App({ onLogout }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [loadError, setLoadError] = useState(null);
  // Whether an old, on-this-device backup can be imported into a freshly
  // created (empty) cloud database. Only ever offered once.
  const [importOffer, setImportOffer] = useState(null);
  const [importing, setImporting] = useState(false);
  const reloading = useRef(false);

  const reload = useCallback(async () => {
    if (!isCloudConfigured || reloading.current) return;
    reloading.current = true;
    try {
      const fresh = await loadAll();
      setData(fresh);
      setLoadError(null);
    } catch (e) {
      setLoadError(e.message);
    } finally {
      reloading.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isCloudConfigured) {
        try {
          const fresh = await loadAll();
          if (cancelled) return;
          setData(fresh);
          // If the cloud database is brand new (no rows anywhere) and this
          // browser has an old local backup, offer a one-time import.
          const localBackup = loadLocalData();
          if (localBackup && (await isCloudEmpty())) {
            setImportOffer(localBackup);
          }
        } catch (e) {
          if (!cancelled) setLoadError(e.message);
        }
      } else {
        setData(loadLocalData() || emptyData());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Live-sync: when a teammate on another device changes something, reload.
  useEffect(() => {
    if (!isCloudConfigured) return;
    const unsubscribe = subscribeToChanges(() => reload());
    return unsubscribe;
  }, [reload]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const runImport = async () => {
    setImporting(true);
    try {
      await importAll(importOffer);
      await reload();
      setImportOffer(null);
      showToast("Old data imported into the shared database.");
    } catch (e) {
      showToast(`Import failed: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  // ---- derived stock ----
  // Raw (unmilled) stock: one pool tracked by weight (kg), fed by local
  // palay purchases, drawn down by milling runs.
  // NOTE: these hooks must run on every render (even before `data` has
  // loaded) so the hook order never changes between renders. They guard
  // internally against `data` being null instead of being skipped via an
  // early return above them.
  const rawStockKg = useMemo(() => {
    if (!data) return 0;
    const bought = data.rawPurchases.reduce((sum, p) => sum + p.quantityKg, 0);
    const milled = data.millings.reduce((sum, m) => sum + m.rawQuantityKg, 0);
    return bought - milled;
  }, [data]);

  // Running total of money spent buying raw palay — sums the totalCost of
  // every raw purchase automatically, updating the moment a new one is
  // recorded (no manual re-entry needed).
  const rawPurchaseCostTotal = useMemo(() => {
    if (!data) return 0;
    return data.rawPurchases.reduce((sum, p) => sum + (p.totalCost || 0), 0);
  }, [data]);

  // Finished stock per rice type: two acquisition paths feed the same pool -
  // buying already-milled rice from suppliers, and milling your own palay.
  // Stock-outs (sales, damage, adjustments) draw it back down.
  const stockByType = useMemo(() => {
    if (!data) return {};
    const map = {};
    for (const rt of data.riceTypes) map[rt.id] = 0;
    for (const p of data.supplierPurchases) map[p.riceTypeId] = (map[p.riceTypeId] || 0) + p.quantity;
    for (const m of data.millings) map[m.riceTypeId] = (map[m.riceTypeId] || 0) + m.outputQuantity;
    for (const s of data.stockOuts) map[s.riceTypeId] = (map[s.riceTypeId] || 0) - s.quantity;
    return map;
  }, [data]);

  // Total of every recorded expense (milling labor, electricity, etc.) —
  // feeds into the Reports tab's cost/profit figures.
  const totalExpenses = useMemo(() => {
    if (!data) return 0;
    return data.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [data]);

  // Rice husk/bran: the powdery byproduct of milling, tracked separately
  // from finished rice since it isn't tied to a rice type.
  const huskStockKg = useMemo(() => {
    if (!data) return 0;
    const produced = data.millings.reduce((sum, m) => sum + (m.huskQuantityKg || 0), 0);
    const sold = data.huskSales.reduce((sum, h) => sum + (h.quantityKg || 0), 0);
    return produced - sold;
  }, [data]);

  const totalHuskSales = useMemo(() => {
    if (!data) return 0;
    return data.huskSales.reduce((sum, h) => sum + (h.totalAmount || 0), 0);
  }, [data]);

  // Each buyer's running balance: their linked "Sale" stock-outs and husk
  // sales minus their recorded payments. Positive = they still owe you
  // (utang).
  const buyerBalances = useMemo(() => {
    if (!data) return {};
    const map = {};
    for (const b of data.buyers) map[b.id] = 0;
    for (const s of data.stockOuts) {
      if (s.reason === "Sale" && s.buyerId) {
        map[s.buyerId] = (map[s.buyerId] || 0) + (s.totalAmount || 0);
      }
    }
    for (const h of data.huskSales) {
      if (h.buyerId) map[h.buyerId] = (map[h.buyerId] || 0) + (h.totalAmount || 0);
    }
    for (const pay of data.payments) {
      if (pay.buyerId) map[pay.buyerId] = (map[pay.buyerId] || 0) - (pay.amount || 0);
    }
    return map;
  }, [data]);

  // Now that every hook has run, it's safe to bail out early while data
  // is still loading (or failed to load).
  if (loadError) {
    return (
      <div className="rt-root">
        <div className="loading">
          Couldn't reach the database: {loadError}
          <br />
          Check your internet connection and that VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are correct, then refresh.
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="rt-root">
        <div className="loading">Opening the ledger…</div>
      </div>
    );
  }

  const statusFor = (rt) => {
    const stock = stockByType[rt.id] || 0;
    if (stock <= 0) return "out";
    if (stock < rt.reorderLevel) return "critical";
    if (stock < rt.reorderLevel * 1.5) return "low";
    return "good";
  };

  const lowCount = data.riceTypes.filter((rt) => {
    const s = statusFor(rt);
    return s === "low" || s === "critical" || s === "out";
  }).length;

  // ---- mutators ----
  // Every mutator updates local state immediately (so the UI feels
  // instant), then writes through to whichever backend is active. On the
  // cloud backend, a write failure reloads from the server so the screen
  // never drifts out of sync with what's actually saved.
  const withCloud = (key, localNext, row) => {
    setData(localNext);
    insertRow(key, row).catch((e) => {
      showToast(`Couldn't save: ${e.message}`);
      reload();
    });
  };
  const withCloudUpdate = (key, localNext, id, patch) => {
    setData(localNext);
    updateRow(key, id, patch).catch((e) => {
      showToast(`Couldn't save changes: ${e.message}`);
      reload();
    });
  };
  const withCloudDelete = (key, localNext, id) => {
    setData(localNext);
    deleteRow(key, id).catch((e) => {
      showToast(`Couldn't delete: ${e.message}`);
      reload();
    });
  };
  const persistLocal = (next) => {
    setData(next);
    saveLocalData(next);
  };

  const addRiceType = (rt) => {
    const row = { ...rt, id: uid("rt") };
    const next = { ...data, riceTypes: [...data.riceTypes, row] };
    isCloudConfigured ? withCloud("riceTypes", next, row) : persistLocal(next);
  };
  const deleteRiceType = (id) => {
    const inUse =
      data.supplierPurchases.some((p) => p.riceTypeId === id) ||
      data.millings.some((m) => m.riceTypeId === id) ||
      data.stockOuts.some((s) => s.riceTypeId === id);
    if (inUse) {
      showToast("Can't remove — it has purchase, milling, or stock-out history.");
      return;
    }
    const next = { ...data, riceTypes: data.riceTypes.filter((r) => r.id !== id) };
    isCloudConfigured ? withCloudDelete("riceTypes", next, id) : persistLocal(next);
  };

  const addSupplier = (sp) => {
    const row = { ...sp, id: uid("sp") };
    const next = { ...data, suppliers: [...data.suppliers, row] };
    isCloudConfigured ? withCloud("suppliers", next, row) : persistLocal(next);
  };
  const deleteSupplier = (id) => {
    if (data.supplierPurchases.some((p) => p.supplierId === id)) {
      showToast("Can't remove — this supplier has purchase history.");
      return;
    }
    const next = { ...data, suppliers: data.suppliers.filter((s) => s.id !== id) };
    isCloudConfigured ? withCloudDelete("suppliers", next, id) : persistLocal(next);
  };

  const addBuyer = (b) => {
    const row = { ...b, id: uid("by") };
    const next = { ...data, buyers: [...data.buyers, row] };
    isCloudConfigured ? withCloud("buyers", next, row) : persistLocal(next);
  };
  const deleteBuyer = (id) => {
    const inUse =
      data.stockOuts.some((s) => s.buyerId === id) || data.payments.some((p) => p.buyerId === id);
    if (inUse) {
      showToast("Can't remove — this buyer has sales or payment history.");
      return;
    }
    const next = { ...data, buyers: data.buyers.filter((b) => b.id !== id) };
    isCloudConfigured ? withCloudDelete("buyers", next, id) : persistLocal(next);
  };

  const addSupplierPurchase = (p) => {
    const row = { ...p, id: uid("sup") };
    const next = { ...data, supplierPurchases: [row, ...data.supplierPurchases] };
    isCloudConfigured ? withCloud("supplierPurchases", next, row) : persistLocal(next);
    showToast("Purchase recorded — finished stock updated.");
  };
  const updateSupplierPurchase = (id, patch) => {
    const next = { ...data, supplierPurchases: data.supplierPurchases.map((p) => (p.id === id ? { ...p, ...patch } : p)) };
    isCloudConfigured ? withCloudUpdate("supplierPurchases", next, id, patch) : persistLocal(next);
    showToast("Purchase updated.");
  };
  const deleteSupplierPurchase = (id) => {
    const next = { ...data, supplierPurchases: data.supplierPurchases.filter((p) => p.id !== id) };
    isCloudConfigured ? withCloudDelete("supplierPurchases", next, id) : persistLocal(next);
  };

  const addRawPurchase = (p) => {
    const row = { ...p, id: uid("rp") };
    const next = { ...data, rawPurchases: [row, ...data.rawPurchases] };
    isCloudConfigured ? withCloud("rawPurchases", next, row) : persistLocal(next);
    showToast("Raw purchase recorded — unmilled stock updated.");
  };
  const updateRawPurchase = (id, patch) => {
    const next = { ...data, rawPurchases: data.rawPurchases.map((p) => (p.id === id ? { ...p, ...patch } : p)) };
    isCloudConfigured ? withCloudUpdate("rawPurchases", next, id, patch) : persistLocal(next);
    showToast("Raw purchase updated.");
  };
  const deleteRawPurchase = (id) => {
    const next = { ...data, rawPurchases: data.rawPurchases.filter((p) => p.id !== id) };
    isCloudConfigured ? withCloudDelete("rawPurchases", next, id) : persistLocal(next);
  };

  const addMilling = (m) => {
    const row = { ...m, id: uid("mi") };
    const next = { ...data, millings: [row, ...data.millings] };
    isCloudConfigured ? withCloud("millings", next, row) : persistLocal(next);
    showToast("Milling recorded — finished stock updated.");
  };
  const updateMilling = (id, patch) => {
    const next = { ...data, millings: data.millings.map((m) => (m.id === id ? { ...m, ...patch } : m)) };
    isCloudConfigured ? withCloudUpdate("millings", next, id, patch) : persistLocal(next);
    showToast("Milling entry updated.");
  };
  const deleteMilling = (id) => {
    const next = { ...data, millings: data.millings.filter((m) => m.id !== id) };
    isCloudConfigured ? withCloudDelete("millings", next, id) : persistLocal(next);
  };

  const addHuskSale = (h) => {
    const row = { ...h, id: uid("hu") };
    const next = { ...data, huskSales: [row, ...data.huskSales] };
    isCloudConfigured ? withCloud("huskSales", next, row) : persistLocal(next);
    showToast("Husk/bran sale recorded.");
  };
  const updateHuskSale = (id, patch) => {
    const next = { ...data, huskSales: data.huskSales.map((h) => (h.id === id ? { ...h, ...patch } : h)) };
    isCloudConfigured ? withCloudUpdate("huskSales", next, id, patch) : persistLocal(next);
    showToast("Husk/bran sale updated.");
  };
  const deleteHuskSale = (id) => {
    const next = { ...data, huskSales: data.huskSales.filter((h) => h.id !== id) };
    isCloudConfigured ? withCloudDelete("huskSales", next, id) : persistLocal(next);
  };

  const addStockOut = (s) => {
    const row = { ...s, id: uid("so") };
    const next = { ...data, stockOuts: [row, ...data.stockOuts] };
    isCloudConfigured ? withCloud("stockOuts", next, row) : persistLocal(next);
    showToast("Stock-out recorded.");
  };
  const updateStockOut = (id, patch) => {
    const next = { ...data, stockOuts: data.stockOuts.map((s) => (s.id === id ? { ...s, ...patch } : s)) };
    isCloudConfigured ? withCloudUpdate("stockOuts", next, id, patch) : persistLocal(next);
    showToast("Stock-out updated.");
  };
  const deleteStockOut = (id) => {
    const next = { ...data, stockOuts: data.stockOuts.filter((s) => s.id !== id) };
    isCloudConfigured ? withCloudDelete("stockOuts", next, id) : persistLocal(next);
  };

  const addPayment = (p) => {
    const row = { ...p, id: uid("pay") };
    const next = { ...data, payments: [row, ...data.payments] };
    isCloudConfigured ? withCloud("payments", next, row) : persistLocal(next);
    showToast("Payment recorded.");
  };
  const deletePayment = (id) => {
    const next = { ...data, payments: data.payments.filter((p) => p.id !== id) };
    isCloudConfigured ? withCloudDelete("payments", next, id) : persistLocal(next);
  };

  const addExpense = (e) => {
    const row = { ...e, id: uid("ex") };
    const next = { ...data, expenses: [row, ...data.expenses] };
    isCloudConfigured ? withCloud("expenses", next, row) : persistLocal(next);
    showToast("Expense recorded.");
  };
  const updateExpense = (id, patch) => {
    const next = { ...data, expenses: data.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)) };
    isCloudConfigured ? withCloudUpdate("expenses", next, id, patch) : persistLocal(next);
    showToast("Expense updated.");
  };
  const deleteExpense = (id) => {
    const next = { ...data, expenses: data.expenses.filter((e) => e.id !== id) };
    isCloudConfigured ? withCloudDelete("expenses", next, id) : persistLocal(next);
  };

  const riceTypeName = (id) => {
    const rt = data.riceTypes.find((r) => r.id === id);
    return rt ? `${rt.name} · ${rt.grade}` : "—";
  };
  const supplierName = (id) => {
    const sp = data.suppliers.find((s) => s.id === id);
    return sp ? sp.name : "—";
  };
  const buyerName = (id) => {
    const b = data.buyers.find((b) => b.id === id);
    return b ? b.name : null;
  };

  return (
    <div className="rt-root">
      <Header lowCount={lowCount} onLogout={onLogout} />
      <TabNav tab={tab} setTab={setTab} />

      {importOffer && (
        <div className="toast" style={{ bottom: "auto", top: 16, maxWidth: 480, textAlign: "left" }}>
          Found existing data saved on this device. Import it into the shared database?
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button className="btn-primary" disabled={importing} onClick={runImport}>
              {importing ? "Importing…" : "Import it"}
            </button>
            <button className="icon-btn" disabled={importing} onClick={() => setImportOffer(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="rt-main">
        {tab === "dashboard" && (
          <Dashboard data={data} rawStockKg={rawStockKg} rawPurchaseCostTotal={rawPurchaseCostTotal} stockByType={stockByType} statusFor={statusFor} />
        )}
        {tab === "supplierPurchases" && (
          <SupplierPurchases
            data={data}
            addSupplierPurchase={addSupplierPurchase}
            updateSupplierPurchase={updateSupplierPurchase}
            deleteSupplierPurchase={deleteSupplierPurchase}
            riceTypeName={riceTypeName}
            supplierName={supplierName}
          />
        )}
        {tab === "rawPurchases" && (
          <RawPurchases
            data={data}
            rawPurchaseCostTotal={rawPurchaseCostTotal}
            addRawPurchase={addRawPurchase}
            updateRawPurchase={updateRawPurchase}
            deleteRawPurchase={deleteRawPurchase}
          />
        )}
        {tab === "milling" && (
          <Milling
            data={data}
            rawStockKg={rawStockKg}
            huskStockKg={huskStockKg}
            addMilling={addMilling}
            updateMilling={updateMilling}
            deleteMilling={deleteMilling}
            addHuskSale={addHuskSale}
            updateHuskSale={updateHuskSale}
            deleteHuskSale={deleteHuskSale}
            riceTypeName={riceTypeName}
            buyerName={buyerName}
          />
        )}
        {tab === "stockouts" && (
          <StockOuts
            data={data}
            stockByType={stockByType}
            addStockOut={addStockOut}
            updateStockOut={updateStockOut}
            deleteStockOut={deleteStockOut}
            riceTypeName={riceTypeName}
            buyerName={buyerName}
          />
        )}
        {tab === "buyers" && (
          <Buyers
            data={data}
            buyerBalances={buyerBalances}
            addBuyer={addBuyer}
            deleteBuyer={deleteBuyer}
            addPayment={addPayment}
            deletePayment={deletePayment}
          />
        )}
        {tab === "expenses" && (
          <Expenses
            data={data}
            totalExpenses={totalExpenses}
            addExpense={addExpense}
            updateExpense={updateExpense}
            deleteExpense={deleteExpense}
          />
        )}
        {tab === "reports" && (
          <Reports
            data={data}
            rawPurchaseCostTotal={rawPurchaseCostTotal}
            totalExpenses={totalExpenses}
            totalHuskSales={totalHuskSales}
            buyerBalances={buyerBalances}
            riceTypeName={riceTypeName}
            supplierName={supplierName}
            buyerName={buyerName}
          />
        )}
        {tab === "types" && (
          <RiceTypes data={data} addRiceType={addRiceType} deleteRiceType={deleteRiceType} />
        )}
        {tab === "suppliers" && (
          <Suppliers data={data} addSupplier={addSupplier} deleteSupplier={deleteSupplier} />
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
