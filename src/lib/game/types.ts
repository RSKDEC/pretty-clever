export const DIE_COLORS = [
  "yellow",
  "blue",
  "green",
  "orange",
  "purple",
  "white",
] as const;

export type DieColor = (typeof DIE_COLORS)[number];
export type AreaColor = Exclude<DieColor, "white">;

export type Die = {
  id: string;
  color: DieColor;
  value: number;
};

export type Bonus =
  | { type: "fox" }
  | { type: "extraDie" }
  | { type: "reroll" }
  | { type: "yellowX" }
  | { type: "blueX" }
  | { type: "greenX" }
  | { type: "orangeN"; value: number }
  | { type: "purpleN"; value: number };

export type YellowCell = {
  value: number | "pre";
  marked: boolean;
};

export type Sheet = {
  yellow: YellowCell[];
  blue: boolean[];
  green: number;
  orange: (number | null)[];
  purple: (number | null)[];
  foxes: number;
  extraDie: number;
  extraDieUsed: number;
  rerolls: number;
  rerollsUsed: number;
  roundBonusesClaimed: boolean[];
};

export type Prompt =
  | {
      kind: "round-bonus";
      playerId: string;
      round: number;
    }
  | {
      kind: "pick-die";
      playerId: string;
      source: "active" | "passive-platter" | "passive-chosen" | "extra";
      allowPass: boolean;
    }
  | {
      kind: "white-color";
      playerId: string;
      value: number;
      source: "active" | "passive-platter" | "passive-chosen" | "extra";
    }
  | {
      kind: "yellow-cell";
      playerId: string;
      value: number | "any";
    }
  | {
      kind: "blue-cell";
      playerId: string;
      value: number | "any";
    }
  | {
      kind: "x-pick";
      playerId: string;
    }
  | {
      kind: "six-pick";
      playerId: string;
    }
  | {
      kind: "extra-or-done";
      playerId: string;
    };

export type LogEntry = {
  id: string;
  text: string;
};

export type TablePlayer = {
  id: string;
  name: string;
  connected: boolean;
  sheet: Sheet;
  extraUsedThisTurn: DieColor[];
  passiveDone?: boolean;
};

export type GameState = {
  players: TablePlayer[];
  round: number;
  totalRounds: number;
  activeIndex: number;
  rollsUsed: number;
  dice: {
    pool: Die[];
    rolled: Die[];
    chosen: Die[];
    platter: Die[];
  };
  prompt: Prompt | null;
  bonusQueue: Bonus[];
  pendingAfterBonus: Prompt | null;
  log: LogEntry[];
  status: "playing" | "finished";
  seed: number;
};

export type FinalResult = {
  id: string;
  name: string;
  rank: number;
  winner: boolean;
  total: number;
  areas: Record<AreaColor, number>;
  foxes: number;
  foxSubtotal: number;
  tieBreak: number;
};

export type PublicRoom = {
  code: string;
  hostId: string;
  status: "lobby" | "playing" | "finished";
  youId: string;
  game: GameState | null;
  lobby: { id: string; name: string; ready: boolean }[];
};

export type ClientAction =
  | { type: "claim-round"; choice: "extra" | "reroll" | "x" | "six" }
  | { type: "roll" }
  | { type: "reroll" }
  | { type: "forfeit-roll" }
  | { type: "pick-die"; dieId: string }
  | { type: "pass" }
  | { type: "white-color"; color: AreaColor }
  | { type: "yellow-cell"; index: number }
  | { type: "blue-cell"; index: number }
  | { type: "x-pick"; color: "yellow" | "blue" | "green" }
  | { type: "six-pick"; color: "orange" | "purple" }
  | { type: "use-extra" }
  | { type: "done-extra" };

const AREA_COLORS: readonly string[] = ["yellow", "blue", "green", "orange", "purple"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === [...keys].sort()[index]);
}

export function isClientAction(value: unknown): value is ClientAction {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  switch (value.type) {
    case "roll":
    case "reroll":
    case "forfeit-roll":
    case "pass":
    case "use-extra":
    case "done-extra":
      return hasExactKeys(value, ["type"]);
    case "claim-round":
      return (
        hasExactKeys(value, ["type", "choice"]) &&
        typeof value.choice === "string" &&
        ["extra", "reroll", "x", "six"].includes(value.choice)
      );
    case "pick-die":
      return (
        hasExactKeys(value, ["type", "dieId"]) &&
        typeof value.dieId === "string" &&
        DIE_COLORS.includes(value.dieId as DieColor)
      );
    case "white-color":
      return (
        hasExactKeys(value, ["type", "color"]) &&
        typeof value.color === "string" &&
        AREA_COLORS.includes(value.color)
      );
    case "yellow-cell":
      return (
        hasExactKeys(value, ["type", "index"]) &&
        Number.isInteger(value.index) &&
        (value.index as number) >= 0 &&
        (value.index as number) < 16
      );
    case "blue-cell":
      return (
        hasExactKeys(value, ["type", "index"]) &&
        Number.isInteger(value.index) &&
        (value.index as number) >= 0 &&
        (value.index as number) < 11
      );
    case "x-pick":
      return (
        hasExactKeys(value, ["type", "color"]) &&
        typeof value.color === "string" &&
        ["yellow", "blue", "green"].includes(value.color)
      );
    case "six-pick":
      return (
        hasExactKeys(value, ["type", "color"]) &&
        typeof value.color === "string" &&
        ["orange", "purple"].includes(value.color)
      );
    default:
      return false;
  }
}
