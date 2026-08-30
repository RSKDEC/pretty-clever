import assert from "node:assert/strict";
import { applyAction, createGame } from "./engine";
import {
  areaScores,
  canMarkPurple,
  emptySheet,
  extraDieLeft,
  foxScore,
  GREEN_MIN,
  orangeScore,
  totalScore,
  YELLOW_VALUES,
  yellowScore,
} from "./sheet";
import type { DieColor, GameState } from "./types";

const pips = YELLOW_VALUES.filter((v): v is number => v !== "pre");
assert.equal(YELLOW_VALUES.filter((v) => v === "pre").length, 4);
for (let n = 1; n <= 6; n++) assert.equal(pips.filter((v) => v === n).length, 2);

const sheet = emptySheet();
assert.equal(yellowScore(sheet), 0);
sheet.yellow.forEach((c, i) => {
  if (i % 4 === 0) c.marked = true;
});
assert.equal(yellowScore(sheet), 10);

sheet.foxes = 2;
sheet.green = 4;
assert.equal(areaScores(sheet).green, 10);
assert.equal(foxScore(sheet), 0);

const s2 = emptySheet();
s2.orange[0] = 4;
s2.orange[3] = 12;
assert.equal(orangeScore(s2), 16);

const p = emptySheet();
assert.equal(canMarkPurple(p, 2), true);
p.purple[0] = 2;
assert.equal(canMarkPurple(p, 2), false);
assert.equal(canMarkPurple(p, 3), true);
p.purple[1] = 6;
assert.equal(canMarkPurple(p, 1), true);

let g = createGame([{ id: "a", name: "Ada" }], 42);
assert.equal(g.prompt?.kind, "round-bonus");
g = applyAction(g, "a", { type: "claim-round", choice: "extra" });
assert.equal(g.players[0].sheet.extraDie, 1);
assert.equal(g.prompt?.kind, "pick-die");
g = applyAction(g, "a", { type: "roll" });
assert.ok(g.dice.rolled.length === 6, "six dice on first roll");
const die = g.dice.rolled[0]!;
g = applyAction(g, "a", { type: "pick-die", dieId: die.id, score: false });
assert.equal(g.dice.chosen.length, 1);
assert.ok(g.dice.platter.every((d) => d.value < die.value));

assert.ok(totalScore(emptySheet()) === 0);
assert.ok(GREEN_MIN[0] === 1);

function setRolled(state: GameState, values: Partial<Record<DieColor, number>>): GameState {
  const next = structuredClone(state);
  next.dice.rolled = next.dice.rolled.map((d) =>
    values[d.color] != null ? { ...d, value: values[d.color]! } : d,
  );
  return next;
}

function rollIfNeeded(state: GameState, id: string): GameState {
  if (state.prompt?.kind === "pick-die" && state.prompt.source === "active" && state.dice.rolled.length === 0) {
    return applyAction(state, id, { type: "roll" });
  }
  return state;
}

function pickColor(state: GameState, id: string, color: DieColor, score: boolean): GameState {
  const next = rollIfNeeded(state, id);
  const d = next.dice.rolled.find((x) => x.color === color);
  assert.ok(d, `missing ${color} in rolled`);
  return applyAction(next, id, { type: "pick-die", dieId: d!.id, score });
}

function skipCells(state: GameState, id: string): GameState {
  let next = state;
  while (next.prompt?.kind === "yellow-cell") {
    const idx = next.players[0]!.sheet.yellow.findIndex(
      (c) => !c.marked && c.value !== "pre" && (next.prompt?.kind === "yellow-cell" && (next.prompt.value === "any" || c.value === next.prompt.value)),
    );
    assert.ok(idx >= 0);
    next = applyAction(next, id, { type: "yellow-cell", index: idx });
  }
  while (next.prompt?.kind === "blue-cell") {
    const want = next.prompt.value;
    const idx =
      want === "any"
        ? next.players[0]!.sheet.blue.findIndex((m) => !m)
        : [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].findIndex((n, i) => n === want && !next.players[0]!.sheet.blue[i]);
    assert.ok(idx >= 0);
    next = applyAction(next, id, { type: "blue-cell", index: idx });
  }
  if (next.prompt?.kind === "white-color") {
    next = applyAction(next, id, { type: "white-color", color: "orange" });
  }
  return next;
}

function finishActivePicks(state: GameState, id: string): GameState {
  let next = state;
  let guard = 12;
  while (guard-- && next.prompt?.kind === "pick-die" && next.prompt.source === "active") {
    next = rollIfNeeded(next, id);
    const d = next.dice.rolled[0];
    if (!d) break;
    next = applyAction(next, id, { type: "pick-die", dieId: d.id, score: false });
    next = skipCells(next, id);
  }
  return next;
}

let solo = createGame([{ id: "a", name: "Ada" }], 7);
solo = applyAction(solo, "a", { type: "claim-round", choice: "extra" });
solo = finishActivePicks(solo, "a");
assert.equal(solo.prompt?.kind, "extra-or-done");
const platterBefore = solo.dice.platter.map((d) => `${d.color}:${d.value}`).sort().join(",");
const chosenBefore = solo.dice.chosen.map((d) => d.id).sort().join(",");
solo = applyAction(solo, "a", { type: "done-extra" });
assert.equal(solo.prompt?.kind, "pick-die");
assert.equal(solo.prompt && solo.prompt.kind === "pick-die" && solo.prompt.source, "passive-platter");
assert.equal(
  solo.dice.platter.map((d) => `${d.color}:${d.value}`).sort().join(","),
  platterBefore,
  "solo leftover must keep the turn's silver platter",
);
assert.equal(solo.dice.chosen.map((d) => d.id).sort().join(","), chosenBefore);

let extra = createGame([{ id: "a", name: "Ada" }], 11);
extra = applyAction(extra, "a", { type: "claim-round", choice: "extra" });
extra = finishActivePicks(extra, "a");
assert.ok(extraDieLeft(extra.players[0]!.sheet) > 0);
const platterSnap = extra.dice.platter.map((d) => `${d.id}:${d.value}`).join(",");
extra = applyAction(extra, "a", { type: "use-extra" });
assert.equal(extra.prompt?.kind, "pick-die");
assert.equal(extra.prompt && extra.prompt.kind === "pick-die" && extra.prompt.source, "extra");
assert.equal(extra.dice.platter.map((d) => `${d.id}:${d.value}`).join(","), platterSnap, "extra die does not reroll the platter");
assert.equal(extraDieLeft(extra.players[0]!.sheet), 0);

let green = createGame([{ id: "a", name: "Ada" }], 3);
green = applyAction(green, "a", { type: "claim-round", choice: "extra" });
green = applyAction(green, "a", { type: "roll" });
green = setRolled(green, { green: 6, yellow: 6, blue: 6, orange: 6, purple: 6, white: 6 });
green = pickColor(green, "a", "green", true);
assert.equal(green.players[0]!.sheet.green, 1);
green = applyAction(green, "a", { type: "roll" });
green = setRolled(green, { yellow: 6, blue: 6, orange: 6, purple: 6, white: 6 });
const extrasBefore = green.players[0]!.sheet.extraDie;
green = pickColor(green, "a", "white", true);
if (green.prompt?.kind === "white-color") {
  green = applyAction(green, "a", { type: "white-color", color: "green" });
}
assert.equal(green.players[0]!.sheet.green, 2);
assert.equal(green.players[0]!.sheet.extraDie, extrasBefore + 1, "second green box awards an extra die");

let duo = createGame(
  [
    { id: "a", name: "Ada" },
    { id: "b", name: "Bea" },
  ],
  19,
);
duo = applyAction(duo, "a", { type: "claim-round", choice: "extra" });
duo = applyAction(duo, "b", { type: "claim-round", choice: "extra" });
duo = finishActivePicks(duo, "a");
assert.equal(duo.prompt?.kind, "extra-or-done");
duo = applyAction(duo, "a", { type: "done-extra" });
assert.equal(duo.prompt?.kind, "pick-die");
assert.equal(duo.prompt?.playerId, "b");
assert.ok(duo.prompt && duo.prompt.kind === "pick-die" && duo.prompt.source.startsWith("passive"));

const purple = emptySheet();
assert.equal(canMarkPurple(purple, 1), true);
purple.purple[0] = 5;
assert.equal(canMarkPurple(purple, 5), false);
assert.equal(canMarkPurple(purple, 6), true);

console.log("ok");
