import assert from "node:assert/strict";
import { applyAction, createGame } from "./engine";
import {
  areaScores,
  canMarkPurple,
  emptySheet,
  foxScore,
  GREEN_MIN,
  orangeScore,
  totalScore,
  yellowScore,
} from "./sheet";

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
assert.ok((g.dice.rolled.length === 6), "six dice on first roll");
const die = g.dice.rolled[0]!;
g = applyAction(g, "a", { type: "pick-die", dieId: die.id, score: false });
assert.equal(g.dice.chosen.length, 1);
assert.ok(g.dice.platter.every((d) => d.value < die.value));

assert.ok(totalScore(emptySheet()) === 0);
assert.ok(GREEN_MIN[0] === 1);

console.log("ok");
