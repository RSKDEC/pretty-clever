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
  | { type: "pick-die"; dieId: string; score: boolean }
  | { type: "pass" }
  | { type: "white-color"; color: AreaColor }
  | { type: "yellow-cell"; index: number }
  | { type: "blue-cell"; index: number }
  | { type: "x-pick"; color: "yellow" | "blue" | "green" }
  | { type: "six-pick"; color: "orange" | "purple" }
  | { type: "use-extra" }
  | { type: "done-extra" };
