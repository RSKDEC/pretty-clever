import {
  allCurrentDice,
  BLUE_COL_GROUPS,
  BLUE_NUMBERS,
  BLUE_ROW_BONUSES,
  BLUE_ROWS,
  blueOptions,
  canMarkGreen,
  canScoreDie,
  emptySheet,
  extraDieLeft,
  GREEN_BONUSES,
  GREEN_MIN,
  legalWhiteColors,
  nextOrangeIndex,
  nextPurpleIndex,
  ORANGE_BONUSES,
  ORANGE_MULT,
  PURPLE_BONUSES,
  rerollsLeft,
  roundsForPlayerCount,
  TRACK_LEN,
  yellowDiagComplete,
  yellowOptions,
  yellowRowComplete,
  YELLOW_DIAGONAL_BONUS,
  YELLOW_ROW_BONUSES,
} from "./sheet";
import type {
  AreaColor,
  Bonus,
  ClientAction,
  Die,
  DieColor,
  GameState,
  TablePlayer,
  Prompt,
  Sheet,
} from "./types";

let seq = 1;
function nid(prefix = "id"): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function rollValue(rng: () => number): number {
  return 1 + Math.floor(rng() * 6);
}

function freshDice(): Die[] {
  const colors: DieColor[] = ["yellow", "blue", "green", "orange", "purple", "white"];
  return colors.map((color) => ({ id: color, color, value: 1 }));
}

type Resume =
  | { kind: "after-active" }
  | { kind: "after-passive-or-extra"; source: "passive-platter" | "passive-chosen" | "extra" }
  | { kind: "round-bonus-next" }
  | { kind: "final-extras" };

type Internal = GameState & { resume: Resume | null; closingExtras: boolean };

export function createGame(names: { id: string; name: string }[], seed = Date.now()): GameState {
  const players: TablePlayer[] = names.map((p) => ({
    ...p,
    connected: true,
    sheet: emptySheet(),
    extraUsedThisTurn: [],
    passiveDone: false,
  }));
  const state = {
    players,
    round: 1,
    totalRounds: roundsForPlayerCount(players.length),
    activeIndex: 0,
    rollsUsed: 0,
    dice: { pool: freshDice(), rolled: [], chosen: [], platter: [] },
    prompt: null as Prompt | null,
    bonusQueue: [] as Bonus[],
    pendingAfterBonus: null,
    log: [],
    status: "playing" as const,
    seed,
    resume: null as Resume | null,
    closingExtras: false,
  };
  log(state, `Round 1 — ${players[0].name} starts.`);
  beginRoundBonuses(state);
  return strip(state);
}

function asInternal(state: GameState): Internal {
  const s = state as Internal;
  if (s.resume === undefined) s.resume = null;
  if (s.closingExtras === undefined) s.closingExtras = false;
  return s;
}

function strip(state: Internal): GameState {
  return state;
}

function log(state: Internal, text: string) {
  state.log = [...state.log.slice(-90), { id: nid("log"), text }];
}

function P(state: Internal, id: string): TablePlayer {
  const p = state.players.find((x) => x.id === id);
  if (!p) throw new Error("Unknown player");
  return p;
}

export function applyAction(state: GameState, playerId: string, action: ClientAction): GameState {
  if (state.status !== "playing" || !state.prompt) return state;
  if (state.prompt.playerId !== playerId) return state;
  const next = asInternal(structuredClone(state));
  const prompt = next.prompt!;
  try {
    switch (action.type) {
      case "claim-round":
        if (prompt.kind !== "round-bonus") return state;
        claimRound(next, playerId, action.choice);
        break;
      case "roll":
        doRoll(next, playerId, false);
        break;
      case "reroll":
        doRoll(next, playerId, true);
        break;
      case "pick-die":
        if (prompt.kind !== "pick-die") return state;
        pickDie(next, playerId, action.dieId, action.score);
        break;
      case "pass":
        if (prompt.kind !== "pick-die" || !prompt.allowPass) return state;
        log(next, `${P(next, playerId).name} passes.`);
        resumeFlow(next, {
          kind: "after-passive-or-extra",
          source: prompt.source === "extra" ? "extra" : prompt.source === "active" ? "extra" : prompt.source,
        });
        break;
      case "white-color":
        if (prompt.kind !== "white-color") return state;
        scoreAs(next, playerId, action.color, prompt.value);
        break;
      case "yellow-cell":
        if (prompt.kind !== "yellow-cell") return state;
        markYellow(next, playerId, action.index, prompt.value);
        break;
      case "blue-cell":
        if (prompt.kind !== "blue-cell") return state;
        markBlue(next, playerId, action.index);
        break;
      case "x-pick":
        if (prompt.kind !== "x-pick") return state;
        enqueueAndFlush(next, P(next, playerId), colorToXBonus(action.color));
        break;
      case "six-pick":
        if (prompt.kind !== "six-pick") return state;
        enqueueAndFlush(
          next,
          P(next, playerId),
          action.color === "orange" ? { type: "orangeN", value: 6 } : { type: "purpleN", value: 6 },
        );
        break;
      case "use-extra":
        if (prompt.kind !== "extra-or-done") return state;
        beginExtraRoll(next, playerId);
        break;
      case "done-extra":
        if (prompt.kind !== "extra-or-done") return state;
        doneExtras(next, playerId);
        break;
      default:
        return state;
    }
  } catch {
    return state;
  }
  return strip(next);
}

function colorToXBonus(color: "yellow" | "blue" | "green"): Bonus {
  if (color === "yellow") return { type: "yellowX" };
  if (color === "blue") return { type: "blueX" };
  return { type: "greenX" };
}

function beginRoundBonuses(state: Internal) {
  if (state.round <= 4) {
    state.prompt = { kind: "round-bonus", playerId: state.players[0].id, round: state.round };
    return;
  }
  startActiveTurn(state);
}

function claimRound(state: Internal, playerId: string, choice: "extra" | "reroll" | "x" | "six") {
  const p = P(state, playerId);
  const r = state.round - 1;
  if (p.sheet.roundBonusesClaimed[r]) return;
  if (state.round === 1 || state.round === 3) {
    if (choice !== "extra") return;
    p.sheet.extraDie += 1;
    p.sheet.roundBonusesClaimed[r] = true;
    log(state, `${p.name} banks the round ${state.round} extra die.`);
    advanceRoundBonus(state);
    return;
  }
  if (state.round === 2) {
    if (choice !== "reroll") return;
    p.sheet.rerolls += 1;
    p.sheet.roundBonusesClaimed[r] = true;
    log(state, `${p.name} banks the round 2 reroll.`);
    advanceRoundBonus(state);
    return;
  }
  if (choice === "x") {
    p.sheet.roundBonusesClaimed[r] = true;
    state.resume = { kind: "round-bonus-next" };
    state.prompt = { kind: "x-pick", playerId };
    return;
  }
  if (choice === "six") {
    p.sheet.roundBonusesClaimed[r] = true;
    state.resume = { kind: "round-bonus-next" };
    state.prompt = { kind: "six-pick", playerId };
    return;
  }
}

function advanceRoundBonus(state: Internal) {
  const idx = state.players.findIndex((p) => !p.sheet.roundBonusesClaimed[state.round - 1]);
  if (idx === -1) {
    startActiveTurn(state);
    return;
  }
  state.prompt = { kind: "round-bonus", playerId: state.players[idx].id, round: state.round };
}

function startActiveTurn(state: Internal) {
  const p = state.players[state.activeIndex];
  for (const pl of state.players) {
    pl.extraUsedThisTurn = [];
    pl.passiveDone = false;
  }
  state.rollsUsed = 0;
  state.dice = { pool: freshDice(), rolled: [], chosen: [], platter: [] };
  state.resume = { kind: "after-active" };
  state.prompt = { kind: "pick-die", playerId: p.id, source: "active", allowPass: false };
  log(state, `${p.name} is the active player.`);
}

function doRoll(state: Internal, playerId: string, isReroll: boolean) {
  const p = P(state, playerId);
  if (state.players[state.activeIndex].id !== playerId) return;
  if (state.prompt?.kind !== "pick-die" || state.prompt.source !== "active") return;
  const rng = makeRng(state.seed + ++seq * 9973);

  if (isReroll) {
    if (!rerollsLeft(p.sheet) || state.dice.rolled.length === 0) return;
    p.sheet.rerollsUsed += 1;
    state.dice.rolled = state.dice.rolled.map((d) => ({ ...d, value: rollValue(rng) }));
    log(state, `${p.name} rerolls: ${fmtDice(state.dice.rolled)}.`);
    return;
  }
  if (state.dice.rolled.length > 0 || state.dice.pool.length === 0) return;
  state.dice.rolled = state.dice.pool.map((d) => ({ ...d, value: rollValue(rng) }));
  state.dice.pool = [];
  state.rollsUsed += 1;
  log(state, `${p.name} rolls: ${fmtDice(state.dice.rolled)}.`);
}

function fmtDice(dice: Die[]) {
  return dice.map((d) => `${label(d.color)} ${d.value}`).join(", ");
}

function label(c: DieColor) {
  return c[0]!.toUpperCase() + c.slice(1);
}

function pickDie(state: Internal, playerId: string, dieId: string, score: boolean) {
  const prompt = state.prompt;
  if (!prompt || prompt.kind !== "pick-die") return;
  const p = P(state, playerId);

  if (prompt.source === "active") {
    if (state.dice.rolled.length === 0) return;
    const die = state.dice.rolled.find((d) => d.id === dieId);
    if (!die) return;
    const all = allCurrentDice(state.dice);
    if (score && !canScoreDie(p.sheet, die, all)) return;
    state.dice.rolled = state.dice.rolled.filter((d) => d.id !== dieId);
    const lower = state.dice.rolled.filter((d) => d.value < die.value);
    const keep = state.dice.rolled.filter((d) => d.value >= die.value);
    state.dice.chosen.push(die);
    state.dice.platter.push(...lower);
    state.dice.pool = keep;
    state.dice.rolled = [];
    state.resume = { kind: "after-active" };
    if (score) startScore(state, p, die, "active");
    else {
      log(state, `${p.name} locks ${label(die.color)} ${die.value} without scoring.`);
      afterActivePick(state);
    }
    return;
  }

  const pile = extraPile(state, prompt.source);
  const die = unique(pile).find((d) => d.id === dieId);
  if (!die) return;
  const all = allCurrentDice(state.dice);
  if (score && !canScoreDie(p.sheet, die, all)) return;
  if (prompt.source === "extra") {
    if (p.extraUsedThisTurn.includes(die.color)) return;
    p.extraUsedThisTurn.push(die.color);
  }
  state.resume = { kind: "after-passive-or-extra", source: prompt.source };
  if (score) startScore(state, p, die, prompt.source);
  else {
    log(state, `${p.name} declines to score.`);
    resumeFlow(state, state.resume);
  }
}

function extraPile(state: Internal, source: string): Die[] {
  if (source === "passive-platter") return state.dice.platter;
  if (source === "passive-chosen") return state.dice.chosen;
  return unique(state.dice.chosen);
}

function beginExtraRoll(state: Internal, playerId: string) {
  const p = P(state, playerId);
  if (!extraDieLeft(p.sheet)) return;
  const base = unique(state.dice.chosen);
  if (base.length === 0) {
    log(state, `${p.name} has no dice off the platter to roll.`);
    state.prompt = { kind: "extra-or-done", playerId };
    return;
  }
  p.sheet.extraDieUsed += 1;
  const rng = makeRng(state.seed + ++seq * 7723);
  state.dice.chosen = base.map((d) => ({ ...d, value: rollValue(rng) }));
  state.prompt = { kind: "pick-die", playerId, source: "extra", allowPass: true };
  log(state, `${p.name} spends an extra die: ${fmtDice(state.dice.chosen)}.`);
}

function unique(dice: Die[]): Die[] {
  const seen = new Set<string>();
  return dice.filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)));
}

function startScore(
  state: Internal,
  p: TablePlayer,
  die: Die,
  source: "active" | "passive-platter" | "passive-chosen" | "extra",
) {
  if (die.color === "white") {
    const colors = legalWhiteColors(p.sheet, die.value, allCurrentDice(state.dice));
    if (colors.length === 1) {
      scoreAs(state, p.id, colors[0], die.value);
      return;
    }
    if (colors.length === 0) {
      log(state, `${p.name} cannot place the white ${die.value}.`);
      resumeFlow(state, state.resume ?? { kind: "after-active" });
      return;
    }
    state.prompt = { kind: "white-color", playerId: p.id, value: die.value, source };
    return;
  }
  scoreAs(state, p.id, die.color, die.value);
}

function scoreAs(state: Internal, playerId: string, color: AreaColor, value: number) {
  const p = P(state, playerId);
  if (color === "yellow") {
    const opts = yellowOptions(p.sheet, value);
    if (opts.length === 0) {
      resumeFlow(state, state.resume ?? { kind: "after-active" });
      return;
    }
    if (opts.length === 1) {
      markYellow(state, playerId, opts[0], value);
      return;
    }
    state.prompt = { kind: "yellow-cell", playerId, value };
    return;
  }
  if (color === "blue") {
    const sum =
      (allCurrentDice(state.dice).find((d) => d.color === "blue")?.value ?? 0) +
      (allCurrentDice(state.dice).find((d) => d.color === "white")?.value ?? 0);
    const opts = blueOptions(p.sheet, sum);
    if (opts.length === 0) {
      log(state, `${p.name} cannot mark blue ${sum}.`);
      resumeFlow(state, state.resume ?? { kind: "after-active" });
      return;
    }
    if (opts.length === 1) {
      markBlue(state, playerId, opts[0]);
      return;
    }
    state.prompt = { kind: "blue-cell", playerId, value: sum };
    return;
  }
  if (color === "green") {
    if (!canMarkGreen(p.sheet, value)) {
      resumeFlow(state, state.resume ?? { kind: "after-active" });
      return;
    }
    const idx = p.sheet.green;
    p.sheet.green += 1;
    log(state, `${p.name} marks green ${idx + 1} (≥${GREEN_MIN[idx]}).`);
    enqueueAndFlush(state, p, GREEN_BONUSES[idx]);
    return;
  }
  if (color === "orange") {
    const i = nextOrangeIndex(p.sheet);
    if (i === -1) {
      resumeFlow(state, state.resume ?? { kind: "after-active" });
      return;
    }
    p.sheet.orange[i] = value * ORANGE_MULT[i];
    log(state, `${p.name} writes ${p.sheet.orange[i]} in orange.`);
    enqueueAndFlush(state, p, ORANGE_BONUSES[i]);
    return;
  }
  const i = nextPurpleIndex(p.sheet);
  if (i === -1) {
    resumeFlow(state, state.resume ?? { kind: "after-active" });
    return;
  }
  p.sheet.purple[i] = value;
  log(state, `${p.name} writes ${value} in purple.`);
  enqueueAndFlush(state, p, PURPLE_BONUSES[i]);
}

function markYellow(state: Internal, playerId: string, index: number, value: number | "any") {
  const p = P(state, playerId);
  if (!yellowOptions(p.sheet, value).includes(index)) return;
  const beforeRows = [0, 1, 2, 3].map((r) => yellowRowComplete(p.sheet, r));
  const beforeDiag = yellowDiagComplete(p.sheet);
  p.sheet.yellow[index].marked = true;
  log(state, `${p.name} crosses yellow ${p.sheet.yellow[index].value}.`);
  const gained: Bonus[] = [];
  for (let r = 0; r < 4; r++) {
    if (!beforeRows[r] && yellowRowComplete(p.sheet, r) && YELLOW_ROW_BONUSES[r]) {
      gained.push(YELLOW_ROW_BONUSES[r]!);
    }
  }
  if (!beforeDiag && yellowDiagComplete(p.sheet)) gained.push(YELLOW_DIAGONAL_BONUS);
  enqueueMany(state, p, gained);
}

function markBlue(state: Internal, playerId: string, index: number) {
  const p = P(state, playerId);
  if (p.sheet.blue[index] || index < 0 || index > 10) return;
  const beforeRows = BLUE_ROWS.map((row) => row.every((i) => p.sheet.blue[i]));
  const beforeCols = BLUE_COL_GROUPS.map((g) => g.cells.every((i) => p.sheet.blue[i]));
  p.sheet.blue[index] = true;
  log(state, `${p.name} crosses blue ${BLUE_NUMBERS[index]}.`);
  const gained: Bonus[] = [];
  BLUE_ROWS.forEach((row, r) => {
    if (!beforeRows[r] && row.every((i) => p.sheet.blue[i])) gained.push(BLUE_ROW_BONUSES[r]);
  });
  BLUE_COL_GROUPS.forEach((g, c) => {
    if (!beforeCols[c] && g.cells.every((i) => p.sheet.blue[i])) gained.push(g.bonus);
  });
  enqueueMany(state, p, gained);
}

function enqueueMany(state: Internal, p: TablePlayer, bonuses: (Bonus | null | undefined)[]) {
  for (const b of bonuses) if (b) state.bonusQueue.push(b);
  flushBonuses(state, p);
}

function enqueueAndFlush(state: Internal, p: TablePlayer, bonus: Bonus | null | undefined) {
  if (bonus) state.bonusQueue.push(bonus);
  flushBonuses(state, p);
}

function flushBonuses(state: Internal, p: TablePlayer) {
  while (state.bonusQueue.length) {
    const bonus = state.bonusQueue.shift()!;
    const blocked = applyBonus(state, p, bonus);
    if (blocked) return;
  }
  resumeFlow(state, state.resume ?? { kind: "after-active" });
}

function applyBonus(state: Internal, p: TablePlayer, bonus: Bonus): boolean {
  switch (bonus.type) {
    case "fox":
      p.sheet.foxes += 1;
      log(state, `${p.name} unlocks a fox.`);
      return false;
    case "extraDie":
      p.sheet.extraDie += 1;
      log(state, `${p.name} unlocks an extra die.`);
      return false;
    case "reroll":
      p.sheet.rerolls += 1;
      log(state, `${p.name} unlocks a reroll.`);
      return false;
    case "greenX": {
      if (p.sheet.green >= TRACK_LEN) return false;
      const idx = p.sheet.green;
      p.sheet.green += 1;
      log(state, `${p.name} bonus-marks green.`);
      if (GREEN_BONUSES[idx]) state.bonusQueue.unshift(GREEN_BONUSES[idx]!);
      return false;
    }
    case "yellowX":
      if (yellowOptions(p.sheet, "any").length === 0) return false;
      state.prompt = { kind: "yellow-cell", playerId: p.id, value: "any" };
      return true;
    case "blueX":
      if (blueOptions(p.sheet, "any").length === 0) return false;
      state.prompt = { kind: "blue-cell", playerId: p.id, value: "any" };
      return true;
    case "orangeN": {
      const i = nextOrangeIndex(p.sheet);
      if (i === -1) return false;
      p.sheet.orange[i] = bonus.value * ORANGE_MULT[i];
      log(state, `${p.name} bonus-writes orange ${p.sheet.orange[i]}.`);
      if (ORANGE_BONUSES[i]) state.bonusQueue.unshift(ORANGE_BONUSES[i]!);
      return false;
    }
    case "purpleN": {
      const i = nextPurpleIndex(p.sheet);
      if (i === -1) return false;
      p.sheet.purple[i] = bonus.value;
      log(state, `${p.name} bonus-writes purple ${bonus.value}.`);
      if (PURPLE_BONUSES[i]) state.bonusQueue.unshift(PURPLE_BONUSES[i]!);
      return false;
    }
  }
}

function resumeFlow(state: Internal, resume: Resume) {
  state.resume = resume;
  if (resume.kind === "round-bonus-next") {
    advanceRoundBonus(state);
    return;
  }
  if (resume.kind === "after-active") {
    afterActivePick(state);
    return;
  }
  if (resume.kind === "final-extras") {
    const needy = state.players.find((p) => extraDieLeft(p.sheet) > 0);
    if (!needy) {
      finishGame(state);
      return;
    }
    state.prompt = { kind: "extra-or-done", playerId: needy.id };
    return;
  }
  const pid = state.prompt?.playerId ?? state.players[state.activeIndex].id;
  offerExtra(state, pid);
}

function afterActivePick(state: Internal) {
  const p = state.players[state.activeIndex];
  if (state.dice.chosen.length >= 3 || state.dice.pool.length === 0) {
    state.dice.platter.push(...state.dice.pool, ...state.dice.rolled);
    state.dice.pool = [];
    state.dice.rolled = [];
    offerExtra(state, p.id);
    return;
  }
  state.prompt = { kind: "pick-die", playerId: p.id, source: "active", allowPass: false };
}

function offerExtra(state: Internal, playerId: string) {
  const p = P(state, playerId);
  if (extraDieLeft(p.sheet) > 0) {
    state.prompt = { kind: "extra-or-done", playerId };
    return;
  }
  doneExtras(state, playerId);
}

function doneExtras(state: Internal, playerId: string) {
  if (state.closingExtras) {
    const p = P(state, playerId);
    p.sheet.extraDieUsed = p.sheet.extraDie;
    resumeFlow(state, { kind: "final-extras" });
    return;
  }
  const activeId = state.players[state.activeIndex].id;
  if (playerId === activeId && !P(state, playerId).passiveDone) {
    startPassives(state);
    return;
  }
  if (state.players.length === 1) {
    if (!state.players[0].passiveDone) {
      state.players[0].passiveDone = true;
      startSoloPassive(state);
      return;
    }
    advanceTurn(state);
    return;
  }
  P(state, playerId).passiveDone = true;
  const nxt = nextPassive(state);
  if (nxt === null) {
    advanceTurn(state);
    return;
  }
  promptPassive(state, nxt);
}

function nextPassive(state: Internal): number | null {
  const n = state.players.length;
  for (let k = 1; k < n; k++) {
    const i = (state.activeIndex + k) % n;
    if (!state.players[i].passiveDone) return i;
  }
  return null;
}

function startPassives(state: Internal) {
  if (state.players.length === 1) {
    state.players[0].passiveDone = true;
    startSoloPassive(state);
    return;
  }
  const nxt = nextPassive(state);
  if (nxt === null) {
    advanceTurn(state);
    return;
  }
  promptPassive(state, nxt);
}

function promptPassive(state: Internal, index: number) {
  const p = state.players[index];
  const all = allCurrentDice(state.dice);
  const platterUsable = state.dice.platter.some((d) => canScoreDie(p.sheet, d, all));
  const source = platterUsable ? "passive-platter" : "passive-chosen";
  const chosenUsable =
    platterUsable || unique(state.dice.chosen).some((d) => canScoreDie(p.sheet, d, all));
  state.resume = { kind: "after-passive-or-extra", source };
  state.prompt = { kind: "pick-die", playerId: p.id, source, allowPass: !chosenUsable };
  log(state, `${p.name} scores off the ${platterUsable ? "silver platter" : "active player's dice"}.`);
}

function startSoloPassive(state: Internal) {
  const p = state.players[0]!;
  const all = allCurrentDice(state.dice);
  const platterUsable = state.dice.platter.some((d) => canScoreDie(p.sheet, d, all));
  const source = platterUsable || state.dice.platter.length > 0 ? "passive-platter" : "passive-chosen";
  log(
    state,
    `Solo leftover — score one ${source === "passive-platter" ? "silver platter" : "chosen"} die: ${fmtDice(
      source === "passive-platter" ? state.dice.platter : state.dice.chosen,
    )}.`,
  );
  state.resume = { kind: "after-passive-or-extra", source };
  state.prompt = {
    kind: "pick-die",
    playerId: p.id,
    source,
    allowPass: true,
  };
}

function advanceTurn(state: Internal) {
  const wrapped = (state.activeIndex + 1) % state.players.length === 0;
  if (wrapped) {
    if (state.round >= state.totalRounds) {
      const needy = state.players.find((p) => extraDieLeft(p.sheet) > 0);
      if (needy) {
        state.closingExtras = true;
        state.resume = { kind: "final-extras" };
        state.prompt = { kind: "extra-or-done", playerId: needy.id };
        return;
      }
      finishGame(state);
      return;
    }
    state.round += 1;
    state.activeIndex = 0;
    log(state, `Round ${state.round} begins.`);
    beginRoundBonuses(state);
    return;
  }
  state.activeIndex = (state.activeIndex + 1) % state.players.length;
  startActiveTurn(state);
}

function finishGame(state: Internal) {
  state.status = "finished";
  state.prompt = null;
  log(state, "That's the game — tally the sheet.");
}

export function diceForPrompt(state: GameState): Die[] {
  const prompt = state.prompt;
  if (!prompt || prompt.kind !== "pick-die") return [];
  if (prompt.source === "active") return state.dice.rolled;
  if (prompt.source === "passive-platter") return unique(state.dice.platter);
  if (prompt.source === "passive-chosen") return unique(state.dice.chosen);
  return unique(state.dice.chosen);
}

export function isMyPrompt(state: GameState, playerId: string) {
  return state.prompt?.playerId === playerId;
}

export function cloneSheet(sheet: Sheet): Sheet {
  return structuredClone(sheet);
}
