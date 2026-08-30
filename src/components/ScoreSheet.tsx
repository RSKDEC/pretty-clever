"use client";

import {
  BLUE_NUMBERS,
  BLUE_ROWS,
  BLUE_SCORES,
  GREEN_BONUSES,
  GREEN_MIN,
  GREEN_SCORES,
  ORANGE_BONUSES,
  ORANGE_MULT,
  PURPLE_BONUSES,
  TRACK_LEN,
  YELLOW_COL_SCORES,
  YELLOW_ROW_BONUSES,
  areaScores,
  blueOptions,
  foxScore,
  totalScore,
  yellowOptions,
} from "@/lib/game/sheet";
import type { Bonus, Prompt, Sheet } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function ScoreSheet({
  sheet,
  prompt,
  onYellow,
  onBlue,
}: {
  sheet: Sheet;
  prompt: Prompt | null;
  onYellow: (index: number) => void;
  onBlue: (index: number) => void;
}) {
  const areas = areaScores(sheet);
  const yellowHot =
    prompt?.kind === "yellow-cell" ? yellowOptions(sheet, prompt.value) : [];
  const blueHot = prompt?.kind === "blue-cell" ? blueOptions(sheet, prompt.value) : [];

  return (
    <div className="rounded-3xl bg-sheet p-3 text-ink shadow-2xl sm:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-2xl">Score sheet</p>
        <p className="text-sm font-semibold">
          {totalScore(sheet)} pts
          <span className="ml-2 font-normal text-ink/50">
            foxes {sheet.foxes} × lowest {Math.min(...Object.values(areas))} = {foxScore(sheet)}
          </span>
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-yellow/25 p-3">
          <h2 className="mb-2 text-xs font-bold tracking-wide text-yellow-ink uppercase">
            Yellow · columns score · rows bonus
          </h2>
          <div className="grid grid-cols-4 gap-1.5">
            {sheet.yellow.map((cell, i) => {
              const hot = yellowHot.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!hot}
                  onClick={() => onYellow(i)}
                  className={cn(
                    "aspect-square rounded-lg border text-sm font-bold",
                    cell.marked
                      ? "border-yellow-ink/40 bg-yellow-ink text-sheet line-through"
                      : "border-yellow-ink/30 bg-sheet",
                    hot && "ring-2 ring-ink animate-pulse",
                  )}
                >
                  {cell.value === "pre" ? "×" : cell.value}
                </button>
              );
            })}
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5 text-center text-[11px] font-semibold text-yellow-ink/80">
            {YELLOW_COL_SCORES.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-ink/55">
            Row bonuses: {YELLOW_ROW_BONUSES.map(bonusLabel).join(" · ")} · diagonal extra die
          </p>
          <p className="mt-1 text-sm font-semibold">{areas.yellow} pts</p>
        </section>

        <section className="rounded-2xl bg-blue/20 p-3">
          <h2 className="mb-2 text-xs font-bold tracking-wide text-blue uppercase">
            Blue · white + blue
          </h2>
          <p className="mb-2 flex flex-wrap gap-1 text-[11px] text-ink/60">
            {BLUE_SCORES.slice(1).map((s, i) => (
              <span key={s} className={cn(sheet.blue.filter(Boolean).length === i + 1 && "font-bold text-blue")}>
                {i + 1}:{s}
              </span>
            ))}
          </p>
          <div className="space-y-1.5">
            {BLUE_ROWS.map((row, r) => (
              <div key={r} className="flex gap-1.5">
                {row.map((i) => {
                  const hot = blueHot.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!hot}
                      onClick={() => onBlue(i)}
                      className={cn(
                        "h-10 min-w-10 flex-1 rounded-lg border text-sm font-bold",
                        sheet.blue[i]
                          ? "border-blue bg-blue text-sheet line-through"
                          : "border-blue/30 bg-sheet text-blue",
                        hot && "ring-2 ring-ink animate-pulse",
                      )}
                    >
                      {BLUE_NUMBERS[i]}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="mt-2 text-sm font-semibold">{areas.blue} pts</p>
        </section>
      </div>

      <Track
        title="Green · next box must meet the number"
        color="green"
        cells={GREEN_MIN.map((min, i) => ({
          label: `≥${min}`,
          filled: i < sheet.green,
          hint: bonusLabel(GREEN_BONUSES[i]),
          star: GREEN_SCORES[i + 1],
        }))}
        score={areas.green}
      />
      <Track
        title="Orange · write pips; × boxes multiply"
        color="orange"
        cells={ORANGE_MULT.map((m, i) => ({
          label: sheet.orange[i] != null ? String(sheet.orange[i]) : m > 1 ? `×${m}` : "·",
          filled: sheet.orange[i] != null,
          hint: bonusLabel(ORANGE_BONUSES[i]),
        }))}
        score={areas.orange}
      />
      <Track
        title="Purple · strictly higher, any number after 6"
        color="purple"
        cells={Array.from({ length: TRACK_LEN }, (_, i) => ({
          label: sheet.purple[i] != null ? String(sheet.purple[i]) : i === 0 ? "any" : ">",
          filled: sheet.purple[i] != null,
          hint: bonusLabel(PURPLE_BONUSES[i]),
        }))}
        score={areas.purple}
      />
    </div>
  );
}

function bonusLabel(b: Bonus | null | undefined) {
  if (!b) return "";
  if (b.type === "fox") return "fox";
  if (b.type === "extraDie") return "+die";
  if (b.type === "reroll") return "reroll";
  if (b.type === "yellowX") return "Y";
  if (b.type === "blueX") return "B";
  if (b.type === "greenX") return "G";
  if (b.type === "orangeN") return `O${b.value}`;
  if (b.type === "purpleN") return `P${b.value}`;
  return "";
}

function Track({
  title,
  color,
  cells,
  score,
}: {
  title: string;
  color: "green" | "orange" | "purple";
  cells: { label: string; filled: boolean; hint: string; star?: number }[];
  score: number;
}) {
  const bg = {
    green: "bg-green/20",
    orange: "bg-orange/20",
    purple: "bg-purple/20",
  }[color];
  const fg = {
    green: "text-green border-green/40",
    orange: "text-orange border-orange/40",
    purple: "text-purple border-purple/40",
  }[color];
  const fill = {
    green: "bg-green text-sheet border-green",
    orange: "bg-orange text-sheet border-orange",
    purple: "bg-purple text-sheet border-purple",
  }[color];

  return (
    <section className={`mt-4 rounded-2xl ${bg} p-3`}>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className={`text-xs font-bold tracking-wide uppercase ${fg.split(" ")[0]}`}>{title}</h2>
        <span className="text-sm font-semibold">{score} pts</span>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {cells.map((c, i) => (
          <div key={i} className="flex min-w-11 flex-col items-center gap-0.5">
            {c.star ? <span className="text-[10px] text-ink/45">{c.star}</span> : <span className="h-3" />}
            <div
              className={cn(
                "flex h-10 w-11 items-center justify-center rounded-lg border text-xs font-bold",
                c.filled ? fill : `bg-sheet ${fg}`,
              )}
            >
              {c.label}
            </div>
            <span className="h-4 text-[9px] text-ink/50">{c.hint}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
