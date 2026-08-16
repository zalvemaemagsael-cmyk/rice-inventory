import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { emptyData } from "./data/emptyData.js";
import { loadData as loadLocalData, saveData as saveLocalData } from "./lib/storage.js";
import { isCloudConfigured, loadAll, isCloudEmpty, insertRow, deleteRow, importAll, subscribeToChanges } from "./lib/db.js";
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

  const addSupplierPurchase = (p) => {
    const row = { ...p, id: uid("sup") };
    const next = { ...data, supplierPurchases: [row, ...data.supplierPurchases] };
    isCloudConfigured ? withCloud("supplierPurchases", next, row) : persistLocal(next);
    showToast("Purchase recorded — finished stock updated.");
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
  const deleteMilling = (id) => {
    const next = { ...data, millings: data.millings.filter((m) => m.id !== id) };
    isCloudConfigured ? withCloudDelete("millings", next, id) : persistLocal(next);
  };

  const addStockOut = (s) => {
    const row = { ...s, id: uid("so") };
    const next = { ...data, stockOuts: [row, ...data.stockOuts] };
    isCloudConfigured ? withCloud("stockOuts", next, row) : persistLocal(next);
    showToast("Stock-out recorded.");
  };
  const deleteStockOut = (id) => {
    const next = { ...data, stockOuts: data.stockOuts.filter((s) => s.id !== id) };
    isCloudConfigured ? withCloudDelete("stockOuts", next, id) : persistLocal(next);
  };

  const riceTypeName = (id) => {
    const rt = data.riceTypes.find((r) => r.id === id);
    return rt ? `${rt.name} · ${rt.grade}` : "—";
  };
  const supplierName = (id) => {
    const sp = data.suppliers.find((s) => s.id === id);
    return sp ? sp.name : "—";
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
            deleteSupplierPurchase={deleteSupplierPurchase}
            riceTypeName={riceTypeName}
            supplierName={supplierName}
          />
        )}
        {tab === "rawPurchases" && (
          <RawPurchases data={data} rawPurchaseCostTotal={rawPurchaseCostTotal} addRawPurchase={addRawPurchase} deleteRawPurchase={deleteRawPurchase} />
        )}
        {tab === "milling" && (
          <Milling
            data={data}
            rawStockKg={rawStockKg}
            addMilling={addMilling}
            deleteMilling={deleteMilling}
            riceTypeName={riceTypeName}
          />
        )}
        {tab === "stockouts" && (
          <StockOuts
            data={data}
            stockByType={stockByType}
            addStockOut={addStockOut}
            deleteStockOut={deleteStockOut}
            riceTypeName={riceTypeName}
          />
        )}
        {tab === "reports" && (
          <Reports data={data} rawPurchaseCostTotal={rawPurchaseCostTotal} riceTypeName={riceTypeName} />
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
