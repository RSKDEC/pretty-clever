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
  const scores = areaScores(sheet);
  const yellowHot =
    prompt?.kind === "yellow-cell" ? yellowOptions(sheet, prompt.value) : [];
  const blueHot =
    prompt?.kind === "blue-cell" ? blueOptions(sheet, prompt.value) : [];
  const blueMarks = sheet.blue.filter(Boolean).length;
  return (
    <div className="score-sheet">
      <div className="sheet-heading">
        <div>
          <span className="eyebrow">Scorecard</span>
          <p>
            <strong>{totalScore(sheet)}</strong> points
          </p>
        </div>
        <div className="fox-tally">
          <Fox />
          <span>
            {sheet.foxes} × {Math.min(...Object.values(scores))}
            <small>Fox bonus · {foxScore(sheet)} pts</small>
          </span>
        </div>
      </div>
      <div className="sheet-grids">
        <Area
          color="yellow"
          title="Yellow"
          score={scores.yellow}
          note="Complete columns to score"
        >
          <div className="number-grid">
            {[0, 1, 2, 3].map((row) => (
              <div className="board-row" key={row}>
                {sheet.yellow
                  .slice(row * 4, row * 4 + 4)
                  .map((cell, offset) => {
                    const i = row * 4 + offset;
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={!yellowHot.includes(i)}
                        onClick={() => onYellow(i)}
                        aria-label={`Yellow row ${row + 1}, column ${offset + 1}: ${cell.value === "pre" ? "pre-marked" : cell.value}${cell.marked ? ", marked" : ""}`}
                        className={cn(
                          "board-cell",
                          cell.marked && "marked",
                          cell.value === "pre" && "pre-marked",
                          yellowHot.includes(i) && "playable",
                        )}
                      >
                        {cell.marked ? "×" : cell.value}
                      </button>
                    );
                  })}
                <BonusChip
                  bonus={YELLOW_ROW_BONUSES[row]}
                  label={`Yellow row ${row + 1}`}
                />
              </div>
            ))}
            <div className="board-row column-bonuses">
              {YELLOW_COL_SCORES.map((score, i) => (
                <span
                  key={score}
                  className={cn(
                    "score-star",
                    yellowColComplete(sheet, i) && "earned",
                  )}
                >
                  {score}
                </span>
              ))}
              <BonusChip
                bonus={YELLOW_DIAGONAL_BONUS}
                label="Yellow diagonal"
              />
            </div>
          </div>
        </Area>
        <Area
          color="blue"
          title="Blue"
          score={scores.blue}
          note="Blue + white · mark the sum"
        >
          <div className="blue-ladder" aria-label="Blue scoring table">
            {BLUE_SCORES.slice(1).map((score, i) => (
              <span key={score} className={cn(blueMarks === i + 1 && "earned")}>
                <b>{score}</b>
                <small>{i + 1}</small>
              </span>
            ))}
          </div>
          <div className="number-grid blue-grid">
            {BLUE_ROWS.map((row, r) => (
              <div className="board-row" key={r}>
                {r === 0 && (
                  <span className="blue-sum" aria-label="Blue plus white">
                    ◆<span>+</span>◇
                  </span>
                )}
                {row.map((i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={!blueHot.includes(i)}
                    onClick={() => onBlue(i)}
                    aria-label={`Blue ${BLUE_NUMBERS[i]}${sheet.blue[i] ? ", marked" : ""}`}
                    className={cn(
                      "board-cell",
                      sheet.blue[i] && "marked",
                      blueHot.includes(i) && "playable",
                    )}
                  >
                    {sheet.blue[i] ? "×" : BLUE_NUMBERS[i]}
                  </button>
                ))}
                <BonusChip
                  bonus={BLUE_ROW_BONUSES[r]}
                  label={`Blue row ${r + 1}`}
                />
              </div>
            ))}
            <div className="board-row column-bonuses">
              {BLUE_COL_GROUPS.map((group, i) => (
                <BonusChip
                  key={i}
                  bonus={group.bonus}
                  label={`Blue column ${i + 1} (${group.cells.map((c) => BLUE_NUMBERS[c]).join(", ")})`}
                />
              ))}
            </div>
          </div>
        </Area>
      </div>
      <Track
        color="green"
        title="Green"
        note="Meet the minimum · left to right"
        score={scores.green}
        cells={GREEN_MIN.map((min, i) => ({
          label: i < sheet.green ? "×" : `≥${min}`,
          filled: i < sheet.green,
          bonus: GREEN_BONUSES[i],
          above: GREEN_SCORES[i + 1],
          current: i === sheet.green,
        }))}
      />
      <Track
        color="orange"
        title="Orange"
        note="Write the value · multiply where shown"
        score={scores.orange}
        cells={ORANGE_MULT.map((m, i) => ({
          label:
            sheet.orange[i] != null
              ? String(sheet.orange[i])
              : m > 1
                ? `×${m}`
                : "",
          filled: sheet.orange[i] != null,
          bonus: ORANGE_BONUSES[i],
          current: sheet.orange.findIndex((v) => v === null) === i,
        }))}
      />
      <Track
        color="purple"
        title="Purple"
        note="Go higher · any value after a 6"
        score={scores.purple}
        cells={sheet.purple.map((v, i) => ({
          label: v != null ? String(v) : "",
          filled: v != null,
          bonus: PURPLE_BONUSES[i],
          current: sheet.purple.findIndex((v) => v === null) === i,
        }))}
      />
      <p className="sheet-key">
        <span>↻ Reroll</span>
        <span>+1 Extra die</span>
        <span>Colored bonuses fill that area</span>
      </p>
    </div>
  );
}
function Area({
  color,
  title,
  note,
  score,
  children,
}: {
  color: string;
  title: string;
  note: string;
  score: number;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`board-area area-${color}`}
      aria-label={`${title} area`}
    >
      <div className="area-heading">
        <div>
          <h2>{title}</h2>
          <p>{note}</p>
        </div>
        <span className="area-score" aria-label={`${score} points`}>
          {score}
          <small>pts</small>
        </span>
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
  color: string;
  title: string;
  note: string;
  score: number;
  cells: {
    label: string;
    filled: boolean;
    bonus: Bonus | null | undefined;
    above?: number;
    current?: boolean;
  }[];
}) {
  return (
    <Area color={color} title={title} note={note} score={score}>
      <div
        className="track-scroll"
        tabIndex={0}
        role="group"
        aria-label={`${title} track, scroll to see all 11 spaces`}
      >
        <div className="track-cells">
          {cells.map((c, i) => (
            <div className="track-space" key={i}>
              {c.above != null && (
                <span className={cn("track-points", c.filled && "earned")}>
                  {c.above}
                </span>
              )}
              <div
                className={cn(
                  "board-cell",
                  c.filled && "marked",
                  c.current && "next-cell",
                )}
                aria-label={`${title} space ${i + 1}: ${c.label || "empty"}${c.current ? ", next" : ""}`}
              >
                {c.label || (c.current ? "·" : "")}
              </div>
              <BonusChip bonus={c.bonus} label={`${title} space ${i + 1}`} />
            </div>
          ))}
        </div>
      </div>
    </Area>
  );
}
function Fox() {
  return (
    <svg viewBox="0 0 36 36" aria-hidden="true" className="fox-icon">
      <path
        d="M5 3 16 10 20 10 31 3 29 20 33 25 23 28 18 34 13 28 3 25 7 20Z"
        fill="#e97662"
        stroke="#fff2de"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="20" r="2" fill="#fff2de" />
      <circle cx="24" cy="20" r="2" fill="#fff2de" />
      <path d="m15 27 3 3 3-3" fill="#fff2de" />
    </svg>
  );
}
function BonusChip({
  bonus,
  label,
}: {
  bonus: Bonus | null | undefined;
  label: string;
}) {
  if (!bonus) return <span className="bonus-empty" />;
  const info = {
    fox: ["fox", "Fox", ""],
    extraDie: ["neutral", "Extra die", "+1"],
    reroll: ["neutral", "Reroll", "↻"],
    yellowX: ["yellow", "Yellow cross", "×"],
    blueX: ["blue", "Blue cross", "×"],
    greenX: ["green", "Green cross", "×"],
    orangeN: ["orange", "Orange value", "value"],
    purpleN: ["purple", "Purple value", "value"],
  }[bonus.type];
  const description = `${label} bonus: ${info[1]}${"value" in bonus ? ` ${bonus.value}` : ""}`;
  return (
    <span
      className={`bonus-chip bonus-${info[0]}`}
      title={description}
      aria-label={description}
    >
      {bonus.type === "fox" ? (
        <Fox />
      ) : (
        <>
          <span>{"value" in bonus ? bonus.value : info[2]}</span>
          {!["neutral", "fox"].includes(info[0]) && (
            <small>{info[0][0].toUpperCase()}</small>
          )}
        </>
      )}
    </span>
  );
}
