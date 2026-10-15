import { encodeEscPos, linesToText } from "./receipt.js";

// Three ways to get a receipt onto paper, tried in this order:
//   1. "serial" — a printer paired in Windows Bluetooth settings shows up
//      as a COM port, which Chrome/Edge can write to via Web Serial. This is
//      the most likely route for a classic-Bluetooth printer like the PT-210.
//   2. "ble"    — Bluetooth Low Energy printers, via Web Bluetooth.
//   3. Browser print dialog — works with any printer Windows can print to.
//
// Connection state lives here at module level so it survives switching
// tabs inside the app (it is lost if the page is reloaded; the serial
// route re-attaches automatically, Bluetooth Low Energy has to be
// re-connected).

const PREF_KEY = "rt_printer_mode";

export const supportsSerial = typeof navigator !== "undefined" && "serial" in navigator;
export const supportsBluetooth = typeof navigator !== "undefined" && "bluetooth" in navigator;

const state = { mode: null, port: null, device: null, characteristic: null, label: "" };
const listeners = new Set();

export function getPrinterStatus() {
  return {
    connected: Boolean(state.port || state.device),
    mode: state.mode,
    label: state.label,
  };
}

function emit() {
  const s = getPrinterStatus();
  listeners.forEach((fn) => fn(s));
}

export function subscribePrinter(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function rememberMode(mode) {
  try {
    localStorage.setItem(PREF_KEY, mode);
  } catch {
    /* storage unavailable — not critical */
  }
}

export function disconnectPrinter() {
  try {
    if (state.device?.gatt?.connected) state.device.gatt.disconnect();
  } catch {
    /* ignore */
  }
  state.mode = null;
  state.port = null;
  state.device = null;
  state.characteristic = null;
  state.label = "";
  try {
    localStorage.removeItem(PREF_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

// ---- 1. Serial (Windows Bluetooth COM port, or USB) ----

export async function connectSerialPrinter() {
  if (!supportsSerial) throw new Error("This browser can't use serial ports. Use Chrome or Edge on Windows.");
  const port = await navigator.serial.requestPort();
  state.mode = "serial";
  state.port = port;
  state.device = null;
  state.characteristic = null;
  state.label = "Serial port (Windows Bluetooth / USB)";
  rememberMode("serial");
  emit();
}

// After the first pairing, the browser remembers the permission, so on a
// later visit we can re-attach without asking again.
export async function restoreSerialPrinter() {
  if (!supportsSerial || state.port) return;
  let pref = null;
  try {
    pref = localStorage.getItem(PREF_KEY);
  } catch {
    /* ignore */
  }
  if (pref !== "serial") return;
  const ports = await navigator.serial.getPorts();
  if (ports.length > 0) {
    state.mode = "serial";
    state.port = ports[0];
    state.label = "Serial port (Windows Bluetooth / USB)";
    emit();
  }
}

async function writeSerial(bytes) {
  const port = state.port;
  try {
    await port.open({ baudRate: 9600 }); // baud rate is ignored by Bluetooth COM ports
  } catch (e) {
    if (e.name !== "InvalidStateError") throw e; // already open is fine
  }
  const writer = port.writable.getWriter();
  try {
    // Small chunks with short pauses, since many cheap printers have tiny
    // input buffers and no flow control.
    for (let i = 0; i < bytes.length; i += 128) {
      await writer.write(bytes.slice(i, i + 128));
      await sleep(25);
    }
    await sleep(400); // let the last bytes leave before closing
  } finally {
    writer.releaseLock();
    try {
      await port.close();
    } catch {
      /* ignore */
    }
  }
}

// ---- 2. Bluetooth Low Energy ----

// Service UUIDs commonly used by BLE receipt printers. The browser only
// exposes services that are listed here up front.
const BLE_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000fee7-0000-1000-8000-00805f9b34fb",
];

async function findWritableCharacteristic(device) {
  const server = await device.gatt.connect();
  const services = await server.getPrimaryServices();
  for (const service of services) {
    const chars = await service.getCharacteristics();
    for (const c of chars) {
      if (c.properties.write || c.properties.writeWithoutResponse) return c;
    }
  }
  return null;
}

export async function connectBluetoothPrinter() {
  if (!supportsBluetooth) throw new Error("This browser doesn't support Bluetooth. Use Chrome or Edge.");
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: BLE_SERVICES,
  });
  const characteristic = await findWritableCharacteristic(device);
  if (!characteristic) {
    throw new Error(
      "Found the device but no printer channel on it. It may be a classic-Bluetooth printer — use the Windows serial option instead."
    );
  }
  state.mode = "ble";
  state.device = device;
  state.characteristic = characteristic;
  state.port = null;
  state.label = `Bluetooth LE: ${device.name || "printer"}`;
  rememberMode("ble");
  emit();
}

async function writeBluetooth(bytes) {
  if (!state.device.gatt.connected) {
    state.characteristic = await findWritableCharacteristic(state.device);
    if (!state.characteristic) throw new Error("Lost the printer channel. Reconnect the printer.");
  }
  const c = state.characteristic;
  for (let i = 0; i < bytes.length; i += 20) {
    const chunk = bytes.slice(i, i + 20);
    if (c.properties.writeWithoutResponse && c.writeValueWithoutResponse) {
      await c.writeValueWithoutResponse(chunk);
    } else {
      await c.writeValue(chunk);
    }
    await sleep(15);
  }
}

// ---- 3. Browser print dialog fallback ----

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function printViaBrowser(lines) {
  const text = escapeHtml(linesToText(lines));
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(
    `<html><head><title>Receipt</title><style>
      @page { size: 58mm auto; margin: 2mm; }
      body { margin: 0; font-family: "Courier New", monospace; font-size: 11px; line-height: 1.25; white-space: pre; }
    </style></head><body>${text}</body></html>`
  );
  doc.close();
  const cleanup = () => iframe.remove();
  iframe.contentWindow.onafterprint = cleanup;
  setTimeout(cleanup, 120000);
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 200);
}

// ---- Public: print a receipt the best way available ----

// Returns "printer" if it went straight to a connected printer, or
// "browser" if it opened the print dialog instead. Throws if a connected
// printer couldn't be reached.
export async function printReceipt(lines) {
  if (state.mode === "serial" && state.port) {
    await writeSerial(encodeEscPos(lines));
    return "printer";
  }
  if (state.mode === "ble" && state.device) {
    await writeBluetooth(encodeEscPos(lines));
    return "printer";
  }
  printViaBrowser(lines);
  return "browser";
}

export async function printTestPage() {
  const L = (text, bold = false) => ({ text, bold });
  return printReceipt([
    L("        PRINTER TEST", true),
    L("--------------------------------"),
    L("If you can read this, the"),
    L("receipt printer is connected."),
    L("--------------------------------"),
    L("12345678901234567890123456789012"),
  ]);
}
