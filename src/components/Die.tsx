"use client";

import type { DieColor } from "@/lib/game/types";
import { cn } from "@/lib/utils";

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const FACE: Record<DieColor, string> = {
  yellow: "bg-yellow",
  blue: "bg-blue",
  green: "bg-green",
  orange: "bg-orange",
  purple: "bg-purple",
  white: "bg-sheet",
};

const PIP: Record<DieColor, string> = {
  yellow: "bg-yellow-ink",
  blue: "bg-white",
  green: "bg-white",
  orange: "bg-white",
  purple: "bg-white",
  white: "bg-ink",
};

export function DieFace({
  color,
  value,
  size = "md",
  className,
}: {
  color: DieColor;
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const box = {
    sm: "size-8 rounded-lg p-1",
    md: "size-12 rounded-xl p-1.5",
    lg: "size-12 rounded-xl p-1.5 sm:size-14 sm:rounded-2xl sm:p-2",
  }[size];

  return (
    <span
      className={cn(
        "die-face inline-grid shrink-0 grid-cols-3 grid-rows-3 gap-px shadow-md ring-1 ring-black/15",
        box,
        FACE[color],
        className,
      )}
      aria-label={`${color} ${value}`}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="flex items-center justify-center">
          {PIPS[value]?.includes(i) ? (
            <span className={cn("block size-full max-h-2 max-w-2 rounded-full", PIP[color])} />
          ) : null}
        </span>
      ))}
    </span>
  );
}
