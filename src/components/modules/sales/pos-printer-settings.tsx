"use client";

import { Printer, Usb, X } from "lucide-react";
import { hasSavedPosPrinter } from "@/lib/pos-printer";
import type { DesktopPrinter } from "@/lib/pos-desktop";

export function PosPrinterSettingsModal({
  ready,
  supported,
  desktop,
  printers,
  selectedPrinter,
  onClose,
  onSelectPrinter,
  onSelectWindowsPrinter,
  onRefreshPrinters,
  onTestPrint,
}: {
  ready: boolean;
  supported: boolean;
  desktop?: boolean;
  printers?: DesktopPrinter[];
  selectedPrinter?: string;
  onClose: () => void;
  onSelectPrinter: () => void;
  onSelectWindowsPrinter?: (name: string) => void;
  onRefreshPrinters?: () => void;
  onTestPrint: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Thermal printer</h2>
            <p className="text-sm text-gray-500 mt-0.5">POS prints straight to the till. No preview.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        {desktop ? (
          <>
            <div className={`rounded-xl border px-4 py-3 mb-4 ${ready ? "border-yellow-300 bg-yellow-50" : "border-amber-200 bg-amber-50"}`}>
              <p className="text-sm font-semibold text-gray-900">
                {ready ? "Windows USB printer saved" : "Select the USB till printer"}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                This Windows app lists USB printers (USB001). Firebase stays the database. Pay prints here with no Chrome preview.
              </p>
            </div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Windows printers</label>
            <select
              value={selectedPrinter || ""}
              onChange={(e) => onSelectWindowsPrinter?.(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-900 bg-white"
            >
              <option value="">Select a printer</option>
              {(printers ?? []).map((printer) => (
                <option key={printer.name} value={printer.name}>
                  {printer.displayName || printer.name}
                  {printer.port ? ` — ${printer.port}` : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onRefreshPrinters}
              className="mt-2 w-full rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold py-3 text-gray-800"
            >
              Refresh printer list
            </button>
          </>
        ) : (
          <>
            <div className={`rounded-xl border px-4 py-3 mb-4 ${ready ? "border-yellow-300 bg-yellow-50" : "border-amber-200 bg-amber-50"}`}>
              <p className="text-sm font-semibold text-gray-900">
                {ready ? "COM thermal printer connected" : hasSavedPosPrinter() ? "Saved COM printer is unplugged" : "No COM printer selected"}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {supported
                  ? "Chrome only lists COM ports. For USB printers, use the Windows ERP app (yarn desktop / the installer)."
                  : "Use the Windows ERP app to print to USB till printers."}
              </p>
            </div>
            <button
              type="button"
              onClick={onSelectPrinter}
              disabled={!supported}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-bold py-3"
            >
              <Usb className="inline h-4 w-4 mr-2" />
              {ready ? "Change COM printer" : "Select COM printer"}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onTestPrint}
          className="mt-2 w-full rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold py-3 text-gray-800"
        >
          <Printer className="inline h-4 w-4 mr-2" />
          Test print
        </button>
        <button type="button" onClick={onClose} className="mt-2 w-full text-sm text-gray-400 hover:text-gray-600 py-2">
          Done
        </button>
      </div>
    </div>
  );
}
