import React, { useEffect, useState } from "react";
import { Printer, Bluetooth, Unplug } from "lucide-react";
import {
  getPrinterStatus,
  subscribePrinter,
  restoreSerialPrinter,
  connectSerialPrinter,
  connectBluetoothPrinter,
  disconnectPrinter,
  printTestPage,
  supportsSerial,
  supportsBluetooth,
} from "../lib/printer.js";

// Shows whether a receipt printer is connected, and lets the user connect
// one. Connection state is shared across tabs (it lives in lib/printer.js).
export default function PrinterBar({ showToast }) {
  const [status, setStatus] = useState(getPrinterStatus());
  const [showHelp, setShowHelp] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribePrinter(setStatus);
    restoreSerialPrinter().catch(() => {});
    return unsubscribe;
  }, []);

  // Wraps a connect/test action: ignores the user simply closing the
  // browser's device picker, and reports any other problem.
  const run = async (action) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      const cancelled =
        e?.name === "NotFoundError" || /no port selected|cancelled|chooser/i.test(e?.message || "");
      if (!cancelled) showToast(`Printer: ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  const noWebSupport = !supportsSerial && !supportsBluetooth;

  return (
    <div className="printer-bar">
      <div className="printer-bar-row">
        <Printer size={16} />
        <span className="printer-status">
          {status.connected ? `Printer connected — ${status.label}` : "No receipt printer connected"}
        </span>
        {status.connected ? (
          <>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => run(async () => { await printTestPage(); })}>
              Test print
            </button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={disconnectPrinter}>
              <Unplug size={14} /> Disconnect
            </button>
          </>
        ) : (
          <>
            {supportsSerial && (
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => run(connectSerialPrinter)}>
                <Printer size={14} /> Connect printer (Windows Bluetooth / USB)
              </button>
            )}
            {supportsBluetooth && (
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => run(connectBluetoothPrinter)}>
                <Bluetooth size={14} /> Connect (Bluetooth LE)
              </button>
            )}
          </>
        )}
        <button type="button" className="icon-btn" onClick={() => setShowHelp(!showHelp)}>
          {showHelp ? "Hide help" : "Help"}
        </button>
      </div>

      {noWebSupport && (
        <div className="hint-line" style={{ marginTop: 8 }}>
          This browser can't connect to printers directly. Open the app in Chrome or Edge, or just use
          "Print receipt" — it will open the normal print dialog.
        </div>
      )}

      {showHelp && (
        <div className="hint-line" style={{ marginTop: 8, lineHeight: 1.6 }}>
          <strong>First-time setup on Windows:</strong>
          <ol style={{ margin: "4px 0 0 18px", padding: 0 }}>
            <li>Turn the printer on. In Windows go to Settings → Bluetooth &amp; devices → Add device → Bluetooth, and pair the PT-210 (PIN is usually 0000 or 1234).</li>
            <li>Back here, click <em>Connect printer (Windows Bluetooth / USB)</em> and pick the printer's COM port. If the list shows several COM ports, try the others — Windows usually creates an "incoming" and an "outgoing" one, and the outgoing one is the one that prints.</li>
            <li>Click <em>Test print</em>. If a test strip comes out, you're set — it will reconnect on its own next time.</li>
            <li>If the PT-210 doesn't appear as a COM port, try <em>Connect (Bluetooth LE)</em> instead. If neither works, "Print receipt" still works through the normal print dialog.</li>
          </ol>
          Receipts print as plain text (₱ shows as "PHP") so they come out correctly on any thermal printer.
        </div>
      )}
    </div>
  );
}
