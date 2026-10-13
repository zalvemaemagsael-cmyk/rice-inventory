import { createClient } from "@supabase/supabase-js";

// Cloud database backend (Supabase/Postgres). This replaces localStorage
// so every device/staff member using the same URL + keys shares one
// inventory in real time. See supabase-schema.sql for the table setup and
// README.md for full deployment steps.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isCloudConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isCloudConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Maps each key in the app's data object to its Supabase table + the
// column/direction it should be sorted by when loaded, plus which of its
// columns are actually numbers.
//
// IMPORTANT: Postgres/Supabase sends `numeric` columns back as JSON
// *strings*, not numbers — this is intentional on their end (it avoids
// silently losing precision on large decimals), but it means every one of
// these fields arrives as e.g. "2000" instead of 2000. Added with the `+`
// operator, two string "numbers" concatenate ("2000"+"3000" = "20003000")
// instead of adding — which stays invisible with one record, then quietly
// corrupts any total built from more than one. `numericFields` below is
// used to convert these back into real numbers right when data is loaded,
// so nothing downstream has to worry about it.
export const TABLES = {
  riceTypes: { table: "rice_types", orderBy: "createdAt", ascending: true, numericFields: ["reorderLevel"] },
  suppliers: { table: "suppliers", orderBy: "createdAt", ascending: true, numericFields: [] },
  buyers: { table: "buyers", orderBy: "createdAt", ascending: true, numericFields: [] },
  supplierPurchases: {
    table: "supplier_purchases",
    orderBy: "createdAt",
    ascending: false,
    numericFields: ["quantity", "pricePerUnit", "totalCost"],
  },
  rawPurchases: {
    table: "raw_purchases",
    orderBy: "createdAt",
    ascending: false,
    numericFields: ["quantityKg", "pricePerKg", "sackSizeKg", "travelFee", "totalCost"],
  },
  millings: {
    table: "millings",
    orderBy: "createdAt",
    ascending: false,
    numericFields: ["rawQuantityKg", "outputQuantity", "huskQuantityKg"],
  },
  stockOuts: {
    table: "stock_outs",
    orderBy: "createdAt",
    ascending: false,
    numericFields: ["quantity", "pricePerUnit", "totalAmount"],
  },
  payments: { table: "payments", orderBy: "createdAt", ascending: false, numericFields: ["amount"] },
  expenses: { table: "expenses", orderBy: "createdAt", ascending: false, numericFields: ["amount"] },
  huskSales: {
    table: "husk_sales",
    orderBy: "createdAt",
    ascending: false,
    numericFields: ["quantityKg", "pricePerKg", "totalAmount"],
  },
};

// Loads every table and returns the same shaped object App.jsx already
// works with: { riceTypes: [...], suppliers: [...], ... }
export async function loadAll() {
  const out = {};
  for (const key of Object.keys(TABLES)) {
    const { table, orderBy, ascending, numericFields } = TABLES[key];
    const { data, error } = await supabase.from(table).select("*").order(orderBy, { ascending });
    if (error) throw new Error(`Loading ${table} failed: ${error.message}`);
    out[key] = data.map(({ createdAt, ...rest }) => {
      for (const field of numericFields) {
        if (rest[field] != null) rest[field] = Number(rest[field]);
      }
      return rest;
    });
  }
  return out;
}

// True only if every table has zero rows (fresh/empty cloud database).
export async function isCloudEmpty() {
  for (const key of Object.keys(TABLES)) {
    const { table } = TABLES[key];
    const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
    if (error) throw new Error(`Checking ${table} failed: ${error.message}`);
    if (count > 0) return false;
  }
  return true;
}

export async function insertRow(key, row) {
  const { table } = TABLES[key];
  const { error } = await supabase.from(table).insert(row);
  if (error) throw new Error(error.message);
}

export async function updateRow(key, id, patch) {
  const { table } = TABLES[key];
  const { error } = await supabase.from(table).update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteRow(key, id) {
  const { table } = TABLES[key];
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// Pushes an entire local dataset (e.g. from an old localStorage backup)
// into the cloud tables in one go. Used by the one-time import banner.
// Order matters: tables referenced by others (riceTypes, suppliers,
// buyers) must be inserted before the tables that reference them.
export async function importAll(data) {
  for (const key of ["riceTypes", "suppliers", "buyers", "supplierPurchases", "rawPurchases", "millings", "stockOuts", "payments", "expenses", "huskSales"]) {
    const rows = data[key] || [];
    if (rows.length === 0) continue;
    const { table } = TABLES[key];
    const { error } = await supabase.from(table).insert(rows);
    if (error) throw new Error(`Importing ${table} failed: ${error.message}`);
  }
}

// Subscribes to changes on every table so other devices' edits show up
// here without a manual refresh. Calls `onChange` (no arguments) whenever
// anything changes anywhere; App.jsx reloads all data in response.
export function subscribeToChanges(onChange) {
  const channel = supabase.channel("rice-ledger-changes");
  for (const key of Object.keys(TABLES)) {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLES[key].table },
      () => onChange()
    );
  }
  channel.subscribe();
  return () => supabase.removeChannel(channel);
}
