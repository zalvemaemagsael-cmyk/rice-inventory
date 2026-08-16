import React from "react";
import { LayoutGrid, Truck, Sprout, Cog, Package, Wheat, Users, BarChart3 } from "lucide-react";

export const TABS = [
  { id: "dashboard", label: "Stock Room", icon: LayoutGrid },
  { id: "supplierPurchases", label: "Supplier Purchases", icon: Truck },
  { id: "rawPurchases", label: "Raw Rice", icon: Sprout },
  { id: "milling", label: "Milling", icon: Cog },
  { id: "stockouts", label: "Stock Out", icon: Package },
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
