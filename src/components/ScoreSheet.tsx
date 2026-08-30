"use client";

import {
  BLUE_NUMBERS,
  BLUE_COL_GROUPS,
  BLUE_ROW_BONUSES,
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
  YELLOW_DIAGONAL_BONUS,
  YELLOW_ROW_BONUSES,
  areaScores,
  blueOptions,
  foxScore,
  totalScore,
  yellowColComplete,
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
  const yellowHot = prompt?.kind === "yellow-cell" ? yellowOptions(sheet, prompt.value) : [];
  const blueHot = prompt?.kind === "blue-cell" ? blueOptions(sheet, prompt.value) : [];
  const blueMarks = sheet.blue.filter(Boolean).length;
  const lowest = Math.min(...Object.values(areas));

  return (
    <div className="w-full overflow-hidden rounded-3xl bg-sheet p-2.5 text-ink shadow-2xl sm:p-4">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
        <p className="font-display text-xl sm:text-2xl">{totalScore(sheet)} points</p>
        <p className="text-xs text-ink/60 sm:text-sm">
          {sheet.foxes} fox{sheet.foxes === 1 ? "" : "es"} × {lowest} lowest ={" "}
          <strong className="text-ink">{foxScore(sheet)}</strong>
        </p>
      </div>

      <div className="grid gap-2.5 md:grid-cols-2 [&>*]:min-w-0">
        <Area color="yellow" title="Yellow" score={areas.yellow} note="columns score · rows pay bonuses">
          <div className="space-y-1 sm:space-y-1.5">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="grid grid-cols-[minmax(0,1fr)_2.25rem] gap-1">
                <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                  {sheet.yellow.slice(row * 4, row * 4 + 4).map((cell, offset) => {
                    const i = row * 4 + offset;
                    const hot = yellowHot.includes(i);
                    const pre = cell.value === "pre";
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={!hot}
                        onClick={() => onYellow(i)}
                        className={cn(
                          "flex aspect-square items-center justify-center rounded-lg border text-base font-bold transition sm:text-lg",
                          pre
                            ? "border-yellow-ink/25 bg-yellow-ink/20 text-yellow-ink/40"
                            : cell.marked
                              ? "border-yellow-ink bg-yellow-ink text-sheet"
                              : "border-yellow-ink/25 bg-white text-yellow-ink",
                          hot && "ring-2 ring-ink ring-offset-1 ring-offset-sheet",
                        )}
                      >
                        {pre ? "✕" : cell.marked ? "✕" : cell.value}
                      </button>
                    );
                  })}
                </div>
                <BonusChip bonus={YELLOW_ROW_BONUSES[row]} label={`Row ${row + 1}`} />
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-[minmax(0,1fr)_2.25rem] gap-1">
            <div className="grid grid-cols-4 gap-1 text-center sm:gap-1.5">
              {YELLOW_COL_SCORES.map((s, c) => (
                <span
                  key={s}
                  className={cn(
                    "rounded py-0.5 text-[11px] font-bold",
                    yellowColComplete(sheet, c) ? "bg-yellow-ink text-sheet" : "text-yellow-ink/70",
                  )}
                >
                  {s}
                </span>
              ))}
            </div>
            <BonusChip bonus={YELLOW_DIAGONAL_BONUS} label="Diagonal" />
          </div>
        </Area>

        <Area color="blue" title="Blue" score={areas.blue} note="white + blue · any order">
          <div className="space-y-1 sm:space-y-1.5">
            {BLUE_ROWS.map((row, r) => (
              <div key={r} className="grid grid-cols-[minmax(0,1fr)_2.25rem] gap-1">
                <div className="flex gap-1 sm:gap-1.5">
                  {row.map((i) => {
                    const hot = blueHot.includes(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={!hot}
                        onClick={() => onBlue(i)}
                        className={cn(
                          "h-11 flex-1 rounded-lg border text-sm font-bold transition sm:text-base",
                          sheet.blue[i]
                            ? "border-blue bg-blue text-white"
                            : "border-blue/25 bg-white text-blue",
                          hot && "ring-2 ring-ink ring-offset-1 ring-offset-sheet",
                        )}
                      >
                        {BLUE_NUMBERS[i]}
                      </button>
                    );
                  })}
                </div>
                <BonusChip bonus={BLUE_ROW_BONUSES[r]} label={`Row ${r + 1}`} />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex items-center gap-1 overflow-x-auto text-[9px] font-semibold text-blue/70">
            <span className="shrink-0">Columns:</span>
            {BLUE_COL_GROUPS.map((group) => (
              <span key={group.cells.join("-")} className="shrink-0 rounded bg-blue/10 px-1.5 py-1">
                {group.cells.map((i) => BLUE_NUMBERS[i]).join("/")} {bonusLabel(group.bonus)}
              </span>
            ))}
          </div>
          <div className="no-scrollbar mt-1.5 flex gap-1 overflow-x-auto text-[10px] font-semibold">
            {BLUE_SCORES.slice(1).map((s, i) => (
              <span
                key={s}
                className={cn(
                  "shrink-0 rounded px-1 py-0.5",
                  blueMarks === i + 1 ? "bg-blue text-white" : "bg-blue/10 text-blue/70",
                )}
              >
                {i + 1}→{s}
              </span>
            ))}
          </div>
        </Area>
      </div>

      <Track
        color="green"
        title="Green"
        note="left to right · must meet the number"
        score={areas.green}
        cells={GREEN_MIN.map((min, i) => ({
          label: `≥${min}`,
          filled: i < sheet.green,
          bonus: GREEN_BONUSES[i],
          above: GREEN_SCORES[i + 1],
          current: i === sheet.green,
        }))}
      />
      <Track
        color="orange"
        title="Orange"
        note="write the pips · × boxes multiply"
        score={areas.orange}
        cells={ORANGE_MULT.map((m, i) => ({
          label: sheet.orange[i] != null ? String(sheet.orange[i]) : m > 1 ? `×${m}` : "",
          filled: sheet.orange[i] != null,
          bonus: ORANGE_BONUSES[i],
          current: sheet.orange.findIndex((v) => v === null) === i,
          accent: m > 1 && sheet.orange[i] == null,
        }))}
      />
      <Track
        color="purple"
        title="Purple"
        note="must climb · anything after a 6"
        score={areas.purple}
        cells={Array.from({ length: TRACK_LEN }, (_, i) => ({
          label: sheet.purple[i] != null ? String(sheet.purple[i]) : "",
          filled: sheet.purple[i] != null,
          bonus: PURPLE_BONUSES[i],
          current: sheet.purple.findIndex((v) => v === null) === i,
        }))}
      />
    </div>
  );
}

const SKIN = {
  yellow: {
    wrap: "bg-yellow/20",
    title: "text-yellow-ink",
    fill: "border-yellow-ink bg-yellow-ink text-sheet",
    idle: "border-yellow-ink/25 bg-white text-yellow-ink",
  },
  blue: {
    wrap: "bg-blue/10",
    title: "text-blue",
    fill: "border-blue bg-blue text-white",
    idle: "border-blue/25 bg-white text-blue",
  },
  green: {
    wrap: "bg-green/10",
    title: "text-green",
    fill: "border-green bg-green text-white",
    idle: "border-green/25 bg-white text-green",
  },
  orange: {
    wrap: "bg-orange/10",
    title: "text-orange",
    fill: "border-orange bg-orange text-white",
    idle: "border-orange/25 bg-white text-orange",
  },
  purple: {
    wrap: "bg-purple/10",
    title: "text-purple",
    fill: "border-purple bg-purple text-white",
    idle: "border-purple/25 bg-white text-purple",
  },
} as const;

function Area({
  color,
  title,
  note,
  score,
  children,
}: {
  color: keyof typeof SKIN;
  title: string;
  note: string;
  score: number;
  children: React.ReactNode;
}) {
  const skin = SKIN[color];
  return (
    <section className={cn("min-w-0 overflow-hidden rounded-2xl p-2.5 sm:p-3", skin.wrap)}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className={cn("min-w-0 truncate text-xs font-extrabold tracking-wide uppercase", skin.title)}>
          {title}
          <span className="ml-2 font-medium normal-case opacity-60">{note}</span>
        </h2>
        <span className="shrink-0 text-sm font-bold">{score}</span>
      </div>
      {children}
    </section>
  );
}

function Track({
  color,
  title,
  note,
  score,
  cells,
}: {
  color: keyof typeof SKIN;
  title: string;
  note: string;
  score: number;
  cells: {
    label: string;
    filled: boolean;
    bonus: Bonus | null | undefined;
    above?: number;
    current?: boolean;
    accent?: boolean;
  }[];
}) {
  const skin = SKIN[color];
  return (
    <section className={cn("mt-2.5 min-w-0 rounded-2xl p-2.5 sm:p-3", skin.wrap)}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className={cn("min-w-0 truncate text-xs font-extrabold tracking-wide uppercase", skin.title)}>
          {title}
          <span className="ml-2 font-medium normal-case opacity-60">{note}</span>
        </h2>
        <span className="shrink-0 text-sm font-bold">{score}</span>
      </div>
      <div className="no-scrollbar -mx-0.5 flex gap-1 overflow-x-auto px-0.5">
        {cells.map((c, i) => (
          <div key={i} className="flex min-w-[2.6rem] flex-1 flex-col items-center gap-0.5">
            <span className="h-3.5 text-[10px] leading-none font-semibold text-ink/45">
              {c.above ?? ""}
            </span>
            <div
              className={cn(
                "flex h-11 w-full items-center justify-center rounded-lg border text-sm font-bold",
                c.filled ? skin.fill : skin.idle,
                c.accent && "border-dashed",
                c.current && !c.filled && "ring-2 ring-ink/25",
              )}
            >
              {c.label}
            </div>
            <span className="flex h-4 items-center text-[9px] leading-none font-semibold text-ink/55">
              {bonusLabel(c.bonus)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function BonusChip({ bonus, label }: { bonus: Bonus | null | undefined; label: string }) {
  return (
    <span
      aria-label={`${label} bonus: ${bonusLabel(bonus)}`}
      title={`${label} bonus`}
      className="flex min-h-8 items-center justify-center rounded-md bg-white/65 px-1 text-[10px] font-extrabold text-ink/75"
    >
      {bonusLabel(bonus)}
    </span>
  );
}

function bonusLabel(b: Bonus | null | undefined) {
  if (!b) return "";
  switch (b.type) {
    case "fox":
      return "🦊";
    case "extraDie":
      return "+die";
    case "reroll":
      return "↻";
    case "yellowX":
      return "✕Y";
    case "blueX":
      return "✕B";
    case "greenX":
      return "✕G";
    case "orangeN":
      return `O${b.value}`;
    case "purpleN":
      return `P${b.value}`;
  }
}
