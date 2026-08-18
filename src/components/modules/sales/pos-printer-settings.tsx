"use client";

import { Printer, Usb, X } from "lucide-react";
import { hasSavedPosPrinter } from "@/lib/pos-printer";

export function PosPrinterSettingsModal({
  ready,
  supported,
  onClose,
  onSelectPrinter,
  onTestPrint,
}: {
  ready: boolean;
  supported: boolean;
  onClose: () => void;
  onSelectPrinter: () => void;
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

        <div className={`rounded-xl border px-4 py-3 mb-4 ${ready ? "border-yellow-300 bg-yellow-50" : "border-amber-200 bg-amber-50"}`}>
          <p className="text-sm font-semibold text-gray-900">
            {ready ? "Thermal printer connected and saved" : hasSavedPosPrinter() ? "Saved printer is unplugged" : "No thermal printer selected"}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {supported
              ? ready
                ? "This till will print automatically after Pay. You do not need to select the printer again."
                : "Plug in the saved USB till printer. Select again only if you changed printers."
              : "Open this POS in Chrome or Edge to use the thermal printer."}
          </p>
        </div>

        <button
          type="button"
          onClick={onSelectPrinter}
          disabled={!supported}
          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-bold py-3"
        >
          <Usb className="inline h-4 w-4 mr-2" />
          {ready ? "Change thermal printer" : "Select thermal printer"}
        </button>
        <button
          type="button"
          onClick={onTestPrint}
          disabled={!supported}
          className="mt-2 w-full rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold py-3 text-gray-800 disabled:text-gray-400"
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
