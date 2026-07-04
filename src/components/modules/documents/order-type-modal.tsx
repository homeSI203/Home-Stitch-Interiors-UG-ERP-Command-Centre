"use client";

import { ClipboardList, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DocumentFormConfig } from "./document-form";

interface Props {
  config: DocumentFormConfig;
  onSelect: (type: "normal" | "customized") => void;
}

export function OrderTypeModal({ config, onSelect }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-border/40 w-full max-w-lg mx-4 overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-border/30 bg-green-tint/40">
          <h2 className="text-display text-2xl font-bold text-brand-green">
            New {config.docLabel === "PROFORMA INVOICE" ? "Proforma Invoice" : "Quotation"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground font-ui">
            What type of order is this?
          </p>
        </div>

        {/* Options */}
        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Normal Order */}
          <button
            onClick={() => onSelect("normal")}
            className="group flex flex-col items-center gap-4 rounded-xl border-2 border-border/60
                       hover:border-brand-gold hover:shadow-lg p-6 text-left transition-all duration-200
                       hover:bg-brand-gold/5 cursor-pointer"
          >
            <div className="h-14 w-14 rounded-xl bg-brand-green/10 flex items-center justify-center
                            group-hover:bg-brand-green/20 transition-colors">
              <ClipboardList className="h-7 w-7 text-brand-green" />
            </div>
            <div>
              <p className="font-bold text-base text-foreground font-ui">Normal Order</p>
              <p className="mt-1 text-xs text-muted-foreground font-ui leading-relaxed">
                Standard items — bedsheets, pillowcases, towels, or any fixed-price goods.
              </p>
            </div>
          </button>

          {/* Customized Order */}
          <button
            onClick={() => onSelect("customized")}
            className="group flex flex-col items-center gap-4 rounded-xl border-2 border-border/60
                       hover:border-brand-gold hover:shadow-lg p-6 text-left transition-all duration-200
                       hover:bg-brand-gold/5 cursor-pointer"
          >
            <div className="h-14 w-14 rounded-xl bg-brand-gold/10 flex items-center justify-center
                            group-hover:bg-brand-gold/20 transition-colors">
              <Scissors className="h-7 w-7 text-brand-gold" />
            </div>
            <div>
              <p className="font-bold text-base text-foreground font-ui">Customized Order</p>
              <p className="mt-1 text-xs text-muted-foreground font-ui leading-relaxed">
                Curtains &amp; fittings — fabric, pipes, holders, end caps, tie backs, measured per room.
              </p>
            </div>
          </button>
        </div>

        <div className="px-8 pb-6 flex justify-end border-t border-border/30 pt-4">
          <Button variant="ghost" size="sm" className="font-ui text-muted-foreground" onClick={() => history.back()}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
