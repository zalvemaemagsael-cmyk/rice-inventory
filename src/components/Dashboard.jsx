import React from "react";
import { Wheat } from "lucide-react";
import { fmtNum } from "../lib/format.js";
import { SackGauge, StatusBadge, EmptyState, KpiCard } from "./ui.jsx";

const RAW_STOCK_TARGET_KG = 6000;

export default function Dashboard({ data, rawStockKg, rawPurchaseCostTotal, stockByType, statusFor }) {
  return (
    <div>
      <div className="section-label">Raw stock (unmilled palay, awaiting milling)</div>
      <KpiCard
        label="Palay / unmilled rice"
        sublabel="Bought locally by weight"
        value={rawStockKg}
        unit="kg"
        target={RAW_STOCK_TARGET_KG}
        footer={`₱ ${fmtNum(rawPurchaseCostTotal)} tied up in stock on hand`}
      />

      <div className="section-label" style={{ marginTop: 24 }}>Finished stock by type</div>
      <div className="hint-line">Filled by supplier purchases and milling runs; drawn down by stock-outs.</div>
      {data.riceTypes.length === 0 ? (
        <EmptyState
          icon={Wheat}
          title="No rice types yet"
          body="Add your first rice type in the Rice Types tab to start tracking finished stock."
        />
      ) : (
        <div className="grid-cards">
          {data.riceTypes.map((rt) => {
            const stock = stockByType[rt.id] || 0;
            const status = statusFor(rt);
            const pct = (stock / (rt.reorderLevel * 2)) * 100;
            return (
              <div className="stock-card" key={rt.id}>
                <div className="stock-card-top">
                  <div>
                    <div className="stock-name">{rt.name}</div>
                    <div className="stock-grade">{rt.grade}</div>
                  </div>
                  <StatusBadge status={status} />
                </div>
                <div className="stock-qty">
                  {fmtNum(stock)} <span className="stock-unit">{rt.unit}</span>
                </div>
                <SackGauge pct={pct} status={status} />
                <div className="stock-reorder">Reorder point: {fmtNum(rt.reorderLevel)} {rt.unit}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
