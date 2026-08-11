import React from "react";
import { Wheat, AlertTriangle, LogOut } from "lucide-react";

export default function Header({ lowCount, onLogout }) {
  return (
    <header className="rt-header">
      <div className="brand">
        <Wheat size={22} strokeWidth={1.75} />
        <div>
          <div className="brand-title">Jessa's Rice Stock Ledger</div>
          <div className="brand-sub">Raw stock, milling &amp; finished goods</div>
        </div>
      </div>
      {lowCount > 0 && (
        <div className="header-flag">
          <AlertTriangle size={15} />
          {lowCount} item{lowCount > 1 ? "s" : ""} need attention
        </div>
      )}
      {onLogout && (
        <button className="icon-btn" onClick={onLogout} title="Sign out">
          <LogOut size={16} />
        </button>
      )}
    </header>
  );
}
