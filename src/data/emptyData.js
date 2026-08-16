// The two acquisition paths this app tracks:
//   1. supplierPurchases - buying already-milled rice of various types
//      from suppliers, each type at its own price.
//   2. rawPurchases + millings - buying unmilled palay locally by weight,
//      then milling it into a finished rice type.
// Both paths add to the same finished-stock pool per rice type; stockOuts
// (sales, damage, adjustments) draw it back down.

export const emptyData = () => ({
  riceTypes: [
    { id: "rt_seed_1", name: "Dinorado", grade: "Premium", unit: "sack (25kg)", reorderLevel: 20 },
    { id: "rt_seed_2", name: "Sinandomeng", grade: "Well-Milled", unit: "sack (25kg)", reorderLevel: 30 },
  ],
  suppliers: [
    { id: "sp_seed_1", name: "Sample Supplier - Nueva Ecija Mill", contact: "" },
  ],
  buyers: [],
  supplierPurchases: [],
  rawPurchases: [],
  millings: [],
  stockOuts: [],
  payments: [],
  expenses: [],
});
