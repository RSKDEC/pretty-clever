"use client";

import { DieFace } from "@/components/Die";
import { canScoreDie } from "@/lib/game/sheet";
import type { Die, DieColor, Sheet } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function DiceTray({
  dice,
  sheet,
  allDice,
  extraUsed,
  source,
  onPick,
}: {
  dice: Die[];
  sheet: Sheet;
  allDice: Die[];
  extraUsed: DieColor[];
  source: string;
  onPick: (id: string) => void;
}) {
  if (dice.length === 0) {
    return <p className="text-sm text-cream/60">No dice available.</p>;
  }

  return (
    <div className="no-scrollbar -mx-1 flex w-full gap-2 overflow-x-auto px-1 pb-1">
      {dice.map((die) => {
        const fits = canScoreDie(sheet, die, allDice);
        const usedColor = source === "extra" && extraUsed.includes(die.color);
        const disabled = usedColor || !fits;

        return (
          <button
            key={die.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(die.id)}
            className={cn(
              "flex min-w-[4rem] shrink-0 flex-col items-center gap-1 rounded-2xl border px-2 py-1.5 transition sm:min-w-[4.5rem] sm:gap-1.5 sm:py-2",
              fits && !usedColor
                ? "border-gold/60 bg-gold/10 active:scale-95"
                : "border-white/10 bg-white/5",
              disabled && "opacity-40",
            )}
          >
            <DieFace color={die.color} value={die.value} size="lg" />
            <span
              className={cn(
                "text-[11px] font-bold tracking-wide uppercase",
                fits && !usedColor ? "text-gold" : "text-cream/45",
              )}
            >
              {usedColor ? "used" : fits ? "score" : "—"}
            </span>
          </button>
        );
      })}
    </div>
  );
}