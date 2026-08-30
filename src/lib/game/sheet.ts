import type { AreaColor, Bonus, Die, DieColor, Sheet } from "./types";

/**
 * 4x4 grid. Each value 1-6 appears exactly twice; the anti-diagonal is
 * pre-crossed, which leaves the main diagonal open for its bonus.
 */
export const YELLOW_VALUES: (number | "pre")[] = [
  3, 6, 5, "pre",
  2, 1, "pre", 5,
  1, "pre", 2, 4,
  "pre", 3, 4, 6,
];

export const YELLOW_COL_SCORES = [10, 14, 16, 20];

export const YELLOW_ROW_BONUSES: (Bonus | null)[] = [
  { type: "blueX" },
  { type: "extraDie" },
  { type: "greenX" },
  { type: "reroll" },
];

export const YELLOW_DIAGONAL_BONUS: Bonus = { type: "fox" };

export const BLUE_NUMBERS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** 3 / 4 / 4 layout matching the printed pad. */
export const BLUE_ROWS = [
  [0, 1, 2],
  [3, 4, 5, 6],
  [7, 8, 9, 10],
];

export const BLUE_ROW_BONUSES: Bonus[] = [
  { type: "fox" },
  { type: "extraDie" },
  { type: "extraDie" },
];

export const BLUE_COL_GROUPS: { cells: number[]; bonus: Bonus }[] = [
  { cells: [0, 3, 7], bonus: { type: "yellowX" } },
  { cells: [1, 4, 8], bonus: { type: "greenX" } },
  { cells: [2, 5, 9], bonus: { type: "orangeN", value: 5 } },
];

export const BLUE_SCORES = [0, 1, 2, 4, 7, 11, 16, 22, 29, 37, 46, 56];

export const GREEN_MIN = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];
export const GREEN_SCORES = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66];
export const GREEN_BONUSES: (Bonus | null)[] = [
  null,
  null,
  { type: "reroll" },
  { type: "orangeN", value: 4 },
  { type: "extraDie" },
  { type: "fox" },
  null,
  { type: "extraDie" },
  { type: "reroll" },
  null,
  { type: "purpleN", value: 6 },
];

export const ORANGE_MULT = [1, 1, 1, 2, 1, 1, 2, 1, 2, 1, 3];
export const ORANGE_BONUSES: (Bonus | null)[] = [
  null,
  { type: "extraDie" },
  null,
  { type: "reroll" },
  { type: "yellowX" },
  null,
  { type: "fox" },
  null,
  { type: "extraDie" },
  null,
  { type: "extraDie" },
];

export const PURPLE_BONUSES: (Bonus | null)[] = [
  null,
  null,
  { type: "extraDie" },
  { type: "blueX" },
  { type: "reroll" },
  { type: "extraDie" },
  { type: "fox" },
  { type: "reroll" },
  { type: "extraDie" },
  { type: "greenX" },
  { type: "extraDie" },
];

export const TRACK_LEN = 11;

export function emptySheet(): Sheet {
  return {
    yellow: YELLOW_VALUES.map((value) => ({
      value,
      marked: value === "pre",
    })),
    blue: BLUE_NUMBERS.map(() => false),
    green: 0,
    orange: Array.from({ length: TRACK_LEN }, () => null),
    purple: Array.from({ length: TRACK_LEN }, () => null),
    foxes: 0,
    extraDie: 0,
    extraDieUsed: 0,
    rerolls: 0,
    rerollsUsed: 0,
    roundBonusesClaimed: [false, false, false, false],
  };
}

export function yellowScore(sheet: Sheet): number {
  let total = 0;
  for (let col = 0; col < 4; col++) {
    if (yellowColComplete(sheet, col)) total += YELLOW_COL_SCORES[col];
  }
  return total;
}

export function yellowColComplete(sheet: Sheet, col: number): boolean {
  return [0, 1, 2, 3].every((row) => sheet.yellow[row * 4 + col].marked);
}

export function yellowRowComplete(sheet: Sheet, row: number): boolean {
  return [0, 1, 2, 3].every((col) => sheet.yellow[row * 4 + col].marked);
}

export function yellowDiagComplete(sheet: Sheet): boolean {
  return [0, 1, 2, 3].every((i) => sheet.yellow[i * 4 + i].marked);
}

export function blueScore(sheet: Sheet): number {
  const n = sheet.blue.filter(Boolean).length;
  return BLUE_SCORES[n] ?? 56;
}

export function greenScore(sheet: Sheet): number {
  return GREEN_SCORES[sheet.green] ?? 0;
}

export function orangeScore(sheet: Sheet): number {
  return sheet.orange.reduce<number>((s, v) => s + (v ?? 0), 0);
}

export function purpleScore(sheet: Sheet): number {
  return sheet.purple.reduce<number>((s, v) => s + (v ?? 0), 0);
}

export function areaScores(sheet: Sheet) {
  return {
    yellow: yellowScore(sheet),
    blue: blueScore(sheet),
    green: greenScore(sheet),
    orange: orangeScore(sheet),
    purple: purpleScore(sheet),
  };
}

export function foxScore(sheet: Sheet): number {
  const scores = Object.values(areaScores(sheet));
  const lowest = Math.min(...scores);
  return sheet.foxes * lowest;
}

export function totalScore(sheet: Sheet): number {
  const a = areaScores(sheet);
  return a.yellow + a.blue + a.green + a.orange + a.purple + foxScore(sheet);
}

export function extraDieLeft(sheet: Sheet): number {
  return sheet.extraDie - sheet.extraDieUsed;
}

export function rerollsLeft(sheet: Sheet): number {
  return sheet.rerolls - sheet.rerollsUsed;
}

export function nextOrangeIndex(sheet: Sheet): number {
  return sheet.orange.findIndex((v) => v === null);
}

export function nextPurpleIndex(sheet: Sheet): number {
  return sheet.purple.findIndex((v) => v === null);
}

export function lastPurple(sheet: Sheet): number | null {
  const filled = sheet.purple.filter((v): v is number => v !== null);
  return filled.length ? filled[filled.length - 1] : null;
}

export function canMarkGreen(sheet: Sheet, value: number, ignoreMin = false): boolean {
  if (sheet.green >= TRACK_LEN) return false;
  if (ignoreMin) return true;
  return value >= GREEN_MIN[sheet.green];
}

export function canMarkOrange(sheet: Sheet): boolean {
  return nextOrangeIndex(sheet) !== -1;
}

export function canMarkPurple(sheet: Sheet, value: number): boolean {
  const i = nextPurpleIndex(sheet);
  if (i === -1) return false;
  const prev = lastPurple(sheet);
  if (prev === null || prev === 6) return true;
  return value > prev;
}

export function canMarkYellow(sheet: Sheet, value: number | "any"): boolean {
  return yellowOptions(sheet, value).length > 0;
}

export function yellowOptions(sheet: Sheet, value: number | "any"): number[] {
  return sheet.yellow
    .map((cell, i) => ({ cell, i }))
    .filter(({ cell }) => {
      if (cell.marked) return false;
      if (cell.value === "pre") return false;
      if (value === "any") return true;
      return cell.value === value;
    })
    .map(({ i }) => i);
}

export function canMarkBlue(sheet: Sheet, value: number | "any"): boolean {
  return blueOptions(sheet, value).length > 0;
}

export function blueOptions(sheet: Sheet, value: number | "any"): number[] {
  return BLUE_NUMBERS.map((n, i) => ({ n, i }))
    .filter(({ n, i }) => !sheet.blue[i] && (value === "any" || n === value))
    .map(({ i }) => i);
}

export function blueSum(dice: { color: DieColor; value: number }[]): number {
  const blue = dice.find((d) => d.color === "blue")?.value ?? 0;
  const white = dice.find((d) => d.color === "white")?.value ?? 0;
  return blue + white;
}

export function allCurrentDice(dice: {
  pool: Die[];
  rolled: Die[];
  chosen: Die[];
  platter: Die[];
}): Die[] {
  return [...dice.pool, ...dice.rolled, ...dice.chosen, ...dice.platter];
}

export function canUseAsColor(
  sheet: Sheet,
  color: AreaColor,
  value: number,
  allDice: Die[],
): boolean {
  if (color === "yellow") return canMarkYellow(sheet, value);
  if (color === "green") return canMarkGreen(sheet, value);
  if (color === "orange") return canMarkOrange(sheet);
  if (color === "purple") return canMarkPurple(sheet, value);
  return canMarkBlue(sheet, blueSum(allDice));
}

export function legalWhiteColors(sheet: Sheet, value: number, allDice: Die[]): AreaColor[] {
  return (["yellow", "blue", "green", "orange", "purple"] as AreaColor[]).filter((c) =>
    canUseAsColor(sheet, c, value, allDice),
  );
}

export function canScoreDie(sheet: Sheet, die: Die, allDice: Die[]): boolean {
  if (die.color === "white") return legalWhiteColors(sheet, die.value, allDice).length > 0;
  return canUseAsColor(sheet, die.color, die.value, allDice);
}

export function roundsForPlayerCount(n: number): number {
  if (n >= 4) return 4;
  if (n === 3) return 5;
  return 6;
}
