"use client";

import { canScoreDie } from "@/lib/game/sheet";
import type { Die, DieColor, Sheet } from "@/lib/game/types";
import { cn } from "@/lib/utils";

const FACE: Record<number, string> = {
  1: "⚀",
  2: "⚁",
  3: "⚂",
  4: "⚃",
  5: "⚄",
  6: "⚅",
};

const TINT: Record<DieColor, string> = {
  yellow: "bg-yellow text-yellow-ink",
  blue: "bg-blue text-white",
  green: "bg-green text-white",
  orange: "bg-orange text-white",
  purple: "bg-purple text-white",
  white: "bg-white text-ink border border-ink/20",
};

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
  onPick: (id: string, score: boolean) => void;
}) {
  if (dice.length === 0) {
    return <p className="text-sm text-cream/60">No dice here.</p>;
  }
  return (
    <div className="flex w-full flex-wrap gap-2">
      {dice.map((die) => {
        const legal = canScoreDie(sheet, die, allDice);
        const blockedExtra = source === "extra" && extraUsed.includes(die.color);
        return (
          <div key={die.id} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "flex size-14 flex-col items-center justify-center rounded-2xl shadow",
                TINT[die.color],
                blockedExtra && "opacity-40",
              )}
            >
              <span className="text-2xl leading-none">{FACE[die.value]}</span>
              <span className="text-[10px] font-bold tracking-wide uppercase">{die.color[0]}</span>
            </div>
            <button
              type="button"
              disabled={!legal || blockedExtra}
              onClick={() => onPick(die.id, true)}
              className="rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-bold text-ink disabled:bg-white/10 disabled:text-cream/30"
            >
              Score
            </button>
            {source === "active" ? (
              <button
                type="button"
                onClick={() => onPick(die.id, false)}
                className="text-[10px] text-cream/50 hover:text-cream"
              >
                Lock only
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
