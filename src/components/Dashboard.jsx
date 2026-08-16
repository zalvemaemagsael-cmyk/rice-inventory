import React from "react";
import { Wheat } from "lucide-react";
import { fmtNum } from "../lib/format.js";
import { SackGauge, StatusBadge, EmptyState } from "./ui.jsx";

export default function Dashboard({ data, rawStockKg, rawPurchaseCostTotal, stockByType, statusFor }) {
  return (
    <div>
      <div className="section-label">Raw stock (unmilled palay, awaiting milling)</div>
      <div className="raw-card">
        <div>
          <div className="stock-name">Palay / unmilled rice</div>
          <div className="stock-grade">Bought locally by weight</div>
        </div>
        <div>
          <div className="stock-qty" style={{ textAlign: "right" }}>
            {fmtNum(rawStockKg)} <span className="stock-unit">kg</span>
          </div>
          <div className="muted" style={{ textAlign: "right" }}>
            ₱ {fmtNum(rawPurchaseCostTotal)} spent to date
          </div>
        </div>
      </div>

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
