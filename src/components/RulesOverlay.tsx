"use client";

import { useEffect } from "react";
import { RulesContent } from "@/components/RulesContent";
import { X } from "lucide-react";

export function RulesOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/95 pt-safe pb-safe">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-4">
        <header className="flex shrink-0 items-center justify-between gap-3 py-3">
          <div>
            <p className="text-[11px] font-bold tracking-[0.3em] text-gold/80 uppercase">
              Unofficial table
            </p>
            <h2 className="font-display text-2xl text-cream">How to play</h2>
          </div>
          <button type="button" className="btn-ghost px-3" onClick={onClose} aria-label="Close rules">
            <X className="size-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8">
          <RulesContent />
        </div>
      </div>
    </div>
  );
}
