import React from "react";
import { LayoutGrid, Truck, Sprout, Cog, Package, Wheat, Users, BarChart3, HandCoins, Receipt, Scale } from "lucide-react";

export const TABS = [
  { id: "dashboard", label: "Stock Room", icon: LayoutGrid },
  { id: "supplierPurchases", label: "Supplier Purchases", icon: Truck },
  { id: "rawPurchases", label: "Raw Rice", icon: Sprout },
  { id: "sellPalay", label: "Sell Palay", icon: Scale },
  { id: "milling", label: "Milling", icon: Cog },
  { id: "stockouts", label: "Stock Out", icon: Package },
  { id: "buyers", label: "Buyers", icon: HandCoins },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "types", label: "Rice Types", icon: Wheat },
  { id: "suppliers", label: "Suppliers", icon: Users },
];

export default function TabNav({ tab, setTab }) {
  return (
    <nav className="rt-tabs">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`rt-tab ${tab === t.id ? "active" : ""}`}
          onClick={() => setTab(t.id)}
        >
          <t.icon size={16} strokeWidth={1.75} />
          {t.label}
        </button>
      ))}
    </nav>
  );
}
