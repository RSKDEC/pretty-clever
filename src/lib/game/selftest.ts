import assert from "node:assert/strict";
import { applyAction, canUseExtraAction, createGame, diceForPrompt } from "./engine";
import {
  BLUE_COL_GROUPS,
  BLUE_ROW_BONUSES,
  GREEN_BONUSES,
  GREEN_MIN,
  ORANGE_BONUSES,
  PURPLE_BONUSES,
  YELLOW_DIAGONAL_BONUS,
  YELLOW_ROW_BONUSES,
  blueSum,
  canMarkPurple,
  emptySheet,
  finalResults,
  foxScore,
  orangeScore,
  soloRating,
  totalScore,
  yellowScore,
} from "./sheet";
import { isClientAction, type Die, type DieColor, type GameState, type TablePlayer } from "./types";

const colors: DieColor[] = ["yellow", "blue", "green", "orange", "purple", "white"];
const dice = (values: number[] = [1, 2, 3, 4, 5, 6]): Die[] =>
  colors.map((color, index) => ({ id: color, color, value: values[index]! }));

function onePlayer(seed = 1): GameState {
  let game = createGame([{ id: "a", name: "Ada" }], seed);
  game = applyAction(game, "a", { type: "claim-round", choice: "reroll" });
  assert.equal(game.prompt?.kind, "pick-die");
  return game;
}

function players(...entries: { id: string; name: string }[]): TablePlayer[] {
  return entries.map((entry) => ({
    ...entry,
    connected: true,
    sheet: emptySheet(),
    extraUsedThisTurn: [],
    passiveDone: false,
  }));
}

// Printed pad constants are deliberately exhaustive: position is gameplay.
assert.deepEqual(YELLOW_ROW_BONUSES, [
  { type: "blueX" },
  { type: "orangeN", value: 4 },
  { type: "greenX" },
  { type: "fox" },
]);
assert.deepEqual(YELLOW_DIAGONAL_BONUS, { type: "extraDie" });
assert.deepEqual(BLUE_ROW_BONUSES, [
  { type: "orangeN", value: 5 },
  { type: "yellowX" },
  { type: "fox" },
]);
assert.deepEqual(BLUE_COL_GROUPS, [
  { cells: [3, 7], bonus: { type: "reroll" } },
  { cells: [0, 4, 8], bonus: { type: "greenX" } },
  { cells: [1, 5, 9], bonus: { type: "purpleN", value: 6 } },
  { cells: [2, 6, 10], bonus: { type: "extraDie" } },
]);
assert.deepEqual(GREEN_MIN, [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 6]);
assert.deepEqual(GREEN_BONUSES, [
  null,
  null,
  null,
  { type: "extraDie" },
  null,
  { type: "blueX" },
  { type: "fox" },
  null,
  { type: "purpleN", value: 6 },
  { type: "reroll" },
  null,
]);
assert.deepEqual(ORANGE_BONUSES, [
  null,
  null,
  { type: "reroll" },
  null,
  { type: "yellowX" },
  { type: "extraDie" },
  null,
  { type: "fox" },
  null,
  { type: "purpleN", value: 6 },
  null,
]);
assert.deepEqual(PURPLE_BONUSES, [
  null,
  null,
  { type: "reroll" },
  { type: "blueX" },
  { type: "extraDie" },
  { type: "yellowX" },
  { type: "fox" },
  { type: "reroll" },
  { type: "greenX" },
  { type: "orangeN", value: 6 },
  { type: "extraDie" },
]);

// Fundamental area scoring and purple's post-six reset.
const yellow = emptySheet();
yellow.yellow.forEach((cell, index) => {
  if (index % 4 === 0) cell.marked = true;
});
assert.equal(yellowScore(yellow), 10);
const orange = emptySheet();
orange.orange[0] = 4;
orange.orange[3] = 12;
assert.equal(orangeScore(orange), 16);
const purple = emptySheet();
purple.purple[0] = 2;
assert.equal(canMarkPurple(purple, 2), false);
assert.equal(canMarkPurple(purple, 6), true);
purple.purple[1] = 6;
assert.equal(canMarkPurple(purple, 1), true);
assert.equal(totalScore(emptySheet()), 0);
const zeroFox = emptySheet();
zeroFox.foxes = 5;
zeroFox.orange[0] = 6;
assert.equal(foxScore(zeroFox), 0);

// Round rewards: reroll, extra die, reroll, then X-or-six.
for (const [round, choice, field] of [
  [1, "reroll", "rerolls"],
  [2, "extra", "extraDie"],
  [3, "reroll", "rerolls"],
] as const) {
  let game = createGame([{ id: "a", name: "Ada" }], round);
  game.round = round;
  game.prompt = { kind: "round-bonus", playerId: "a", round };
  game = applyAction(game, "a", { type: "claim-round", choice });
  assert.equal(game.players[0]!.sheet[field], 1, `round ${round} reward`);
}
let roundFour = createGame([{ id: "a", name: "Ada" }], 4);
roundFour.round = 4;
roundFour.prompt = { kind: "round-bonus", playerId: "a", round: 4 };
roundFour = applyAction(roundFour, "a", { type: "claim-round", choice: "six" });
assert.equal(roundFour.prompt?.kind, "six-pick");
roundFour = applyAction(roundFour, "a", { type: "six-pick", color: "orange" });
assert.equal(roundFour.players[0]!.sheet.orange[0], 6);

// Extra die: all six immutable values are candidates; regular selection can repeat,
// but the same physical die cannot be selected twice through extra actions.
let extra = onePlayer(11);
extra.players[0]!.sheet.extraDie = 2;
extra.dice = {
  pool: [],
  rolled: [],
  chosen: [dice()[3]!],
  platter: dice().filter((die) => die.color !== "orange"),
};
extra.prompt = { kind: "extra-or-done", playerId: "a" };
const immutableDice = structuredClone(extra.dice);
assert.equal(canUseExtraAction(extra, "a"), true);
extra = applyAction(extra, "a", { type: "use-extra" });
assert.deepEqual(extra.dice, immutableDice, "spending an extra never rerolls");
assert.equal(diceForPrompt(extra).length, 6, "all six dice are offered");
extra = applyAction(extra, "a", { type: "pick-die", dieId: "orange" });
assert.equal(extra.players[0]!.sheet.orange[0], 4, "kept regular die may be selected again");
assert.deepEqual(extra.players[0]!.extraUsedThisTurn, ["orange"]);
extra = applyAction(extra, "a", { type: "use-extra" });
const beforeDuplicate = structuredClone(extra);
extra = applyAction(extra, "a", { type: "pick-die", dieId: "orange" });
assert.deepEqual(extra, beforeDuplicate, "same die is rejected for a second extra");

// Solo passive role is a fresh six-die roll with exactly the deterministic low three.
let solo = onePlayer(29);
solo.dice = { pool: [], rolled: [], chosen: [dice([6, 6, 6, 6, 6, 6])[0]!], platter: [] };
solo.players[0]!.extraUsedThisTurn = ["yellow"];
solo.prompt = { kind: "extra-or-done", playerId: "a" };
solo = applyAction(solo, "a", { type: "done-extra" });
assert.equal(solo.prompt?.kind, "pick-die");
assert.equal(solo.prompt?.kind === "pick-die" && solo.prompt.source, "passive-platter");
assert.deepEqual(
  solo.players[0]!.extraUsedThisTurn,
  [],
  "solo passive roll starts a fresh extra-die identity limit",
);
assert.equal(solo.dice.platter.length, 3);
assert.equal(solo.dice.chosen.length, 3);
const soloAll = [...solo.dice.platter, ...solo.dice.chosen];
const colorOrder = new Map(colors.map((color, index) => [color, index]));
const sortedSolo = [...soloAll].sort(
  (a, b) => a.value - b.value || colorOrder.get(a.color)! - colorOrder.get(b.color)!,
);
assert.deepEqual(solo.dice.platter, sortedSolo.slice(0, 3));
assert.deepEqual(solo.dice.chosen, sortedSolo.slice(3));

// An active player must select a legal die and has a server-authoritative no-fit action.
let mandatory = onePlayer(31);
mandatory = applyAction(mandatory, "a", { type: "roll" });
mandatory.dice.rolled = dice([1, 2, 3, 4, 5, 6]);
mandatory.players[0]!.sheet.yellow.forEach((cell) => {
  if (cell.value === 1) cell.marked = true;
});
const beforeIllegalPick = structuredClone(mandatory);
mandatory = applyAction(mandatory, "a", { type: "pick-die", dieId: "yellow" });
assert.deepEqual(mandatory, beforeIllegalPick, "an unusable die cannot be picked while legal dice exist");

mandatory.players[0]!.sheet.yellow.forEach((cell) => (cell.marked = true));
mandatory.players[0]!.sheet.blue.fill(true);
mandatory.players[0]!.sheet.green = 11;
mandatory.players[0]!.sheet.orange.fill(1);
mandatory.players[0]!.sheet.purple.fill(6);
const forfeitedValues = mandatory.dice.rolled.map((die) => die.value);
mandatory = applyAction(mandatory, "a", { type: "forfeit-roll" });
assert.equal(mandatory.dice.rolled.length, 0);
assert.deepEqual(mandatory.dice.pool.map((die) => die.value), forfeitedValues);
assert.equal(mandatory.dice.chosen.length, 0);
assert.equal(mandatory.dice.platter.length, 0);

// A forfeited roll still counts toward the three-roll limit.
let capped = onePlayer(33);
capped.players[0]!.sheet.yellow.forEach(cell => { if (cell.value === 1) cell.marked = true; });
capped.dice = { pool: [], rolled: [{ id: "yellow", color: "yellow", value: 1 }], chosen: [], platter: [] };
capped.rollsUsed = 1;
capped = applyAction(capped, "a", { type: "forfeit-roll" });
capped = applyAction(capped, "a", { type: "roll" });
capped.dice = { pool: [], rolled: [
  { id: "orange", color: "orange", value: 1 },
  { id: "green", color: "green", value: 2 },
  { id: "purple", color: "purple", value: 6 },
], chosen: [], platter: [] };
capped = applyAction(capped, "a", { type: "pick-die", dieId: "orange" });
capped = applyAction(capped, "a", { type: "roll" });
assert.equal(capped.rollsUsed, 3);
capped.dice.rolled = [
  { id: "green", color: "green", value: 2 },
  { id: "purple", color: "purple", value: 6 },
];
capped.players[0]!.sheet.extraDie = 1; // Pause at extras before solo dice reset.
capped = applyAction(capped, "a", { type: "pick-die", dieId: "green" });
assert.equal(capped.prompt?.kind, "extra-or-done", "third roll ends active play even with fewer than three kept dice");
assert.equal(capped.dice.pool.length, 0);
assert.equal(capped.dice.platter.length, 1, "unselected die goes to platter after third roll");

// Server guard: a fourth normal roll must not mutate dice or counters.
let exhausted = onePlayer(35);
exhausted.rollsUsed = 3;
const beforeFourth = structuredClone(exhausted);
exhausted = applyAction(exhausted, "a", { type: "roll" });
assert.deepEqual(exhausted, beforeFourth, "reject a fourth normal roll");

// Blue always reads both immutable dice regardless of their table partitions.
const splitDice = {
  pool: [] as Die[],
  rolled: [{ id: "blue", color: "blue", value: 3 } as Die],
  chosen: [] as Die[],
  platter: [{ id: "white", color: "white", value: 4 } as Die],
};
assert.equal(blueSum([...splitDice.rolled, ...splitDice.platter]), 7);
for (let bluePosition = 0; bluePosition < 4; bluePosition++) {
  for (let whitePosition = 0; whitePosition < 4; whitePosition++) {
    const partitions: Die[][] = [[], [], [], []];
    partitions[bluePosition]!.push({ id: "blue", color: "blue", value: 2 });
    partitions[whitePosition]!.push({ id: "white", color: "white", value: 5 });
    assert.equal(blueSum(partitions.flat()), 7, `blue/white positions ${bluePosition}/${whitePosition}`);
  }
}
let blue = onePlayer(37);
blue.dice = splitDice;
blue.rollsUsed = 1;
blue.prompt = { kind: "pick-die", playerId: "a", source: "active", allowPass: false };
blue = applyAction(blue, "a", { type: "pick-die", dieId: "blue" });
assert.equal(blue.players[0]!.sheet.blue[5], true, "blue 3 + white 4 marks seven");

// The photo's left blue column contains only 5 and 9; 2 belongs above 6/10.
let leftColumn = onePlayer(39);
leftColumn.players[0]!.sheet.blue[3] = true;
leftColumn.prompt = { kind: "blue-cell", playerId: "a", value: "any" };
const rerollsBeforeColumn = leftColumn.players[0]!.sheet.rerolls;
leftColumn = applyAction(leftColumn, "a", { type: "blue-cell", index: 7 });
assert.equal(leftColumn.players[0]!.sheet.rerolls, rerollsBeforeColumn + 1, "5 + 9 earns a reroll without marking 2");
let secondColumn = onePlayer(40);
secondColumn.players[0]!.sheet.blue[4] = true;
secondColumn.players[0]!.sheet.blue[8] = true;
secondColumn.prompt = { kind: "blue-cell", playerId: "a", value: "any" };
secondColumn = applyAction(secondColumn, "a", { type: "blue-cell", index: 0 });
assert.equal(secondColumn.players[0]!.sheet.green, 1, "2 + 6 + 10 earns a green cross");

// Immediate bonuses chain: yellow row -> blue X -> blue row -> orange 5.
let chain = onePlayer(41);
chain.players[0]!.sheet.yellow[0]!.marked = true;
chain.players[0]!.sheet.yellow[1]!.marked = true;
chain.players[0]!.sheet.blue[1] = true;
chain.players[0]!.sheet.blue[2] = true;
chain.prompt = { kind: "yellow-cell", playerId: "a", value: "any" };
chain = applyAction(chain, "a", { type: "yellow-cell", index: 2 });
assert.equal(chain.prompt?.kind, "blue-cell");
chain = applyAction(chain, "a", { type: "blue-cell", index: 0 });
assert.equal(chain.players[0]!.sheet.orange[0], 5);

// Passive players must use a usable platter die; fallback is only offered otherwise.
let passive = createGame(
  [
    { id: "a", name: "Ada" },
    { id: "b", name: "Bea" },
  ],
  43,
);
passive = applyAction(passive, "a", { type: "claim-round", choice: "reroll" });
passive = applyAction(passive, "b", { type: "claim-round", choice: "reroll" });
passive.players[1]!.sheet.yellow.forEach((cell) => {
  if (cell.value === 1) cell.marked = true;
});
passive.dice = {
  pool: [],
  rolled: [],
  chosen: [{ id: "orange", color: "orange", value: 4 }],
  platter: [{ id: "yellow", color: "yellow", value: 1 }],
};
passive.prompt = { kind: "extra-or-done", playerId: "a" };
passive = applyAction(passive, "a", { type: "done-extra" });
assert.equal(passive.prompt?.kind === "pick-die" && passive.prompt.source, "passive-chosen");
assert.equal(passive.prompt?.kind === "pick-die" && passive.prompt.allowPass, false);
const beforeMandatoryPass = structuredClone(passive);
passive = applyAction(passive, "b", { type: "pass" });
assert.deepEqual(passive, beforeMandatoryPass);

// Formal result ordering uses total, then highest single color, with shared winners.
const table = players(
  { id: "a", name: "Ada" },
  { id: "b", name: "Bea" },
  { id: "c", name: "Cy" },
);
table[0]!.sheet.orange[0] = 10;
table[0]!.sheet.blue[0] = true; // 11 total, highest color 10
table[1]!.sheet.orange[0] = 8;
table[1]!.sheet.green = 2; // 11 total, highest color 8
table[2]!.sheet.orange[0] = 10;
table[2]!.sheet.blue[0] = true; // unresolved tie with Ada
const results = finalResults(table);
assert.deepEqual(
  results.map((result) => [result.name, result.rank, result.winner]),
  [
    ["Ada", 1, true],
    ["Cy", 1, true],
    ["Bea", 3, false],
  ],
);
assert.equal(soloRating(281), "You’re so clever!");
assert.equal(soloRating(260), "Are you Einstein?");
assert.equal(soloRating(140), "Not bad… you could do better.");
assert.equal(soloRating(139), "Try harder!");

// The game ends only after the final passive role and final extra opportunity.
let ending = onePlayer(47);
ending.round = ending.totalRounds;
ending.players[0]!.passiveDone = true;
ending.prompt = { kind: "extra-or-done", playerId: "a" };
ending = applyAction(ending, "a", { type: "done-extra" });
assert.equal(ending.status, "finished");
assert.equal(ending.prompt, null);

// Socket actions are strict at runtime.
assert.equal(isClientAction({ type: "roll" }), true);
assert.equal(isClientAction({ type: "roll", extra: true }), false);
assert.equal(isClientAction({ type: "pick-die", dieId: "orange" }), true);
assert.equal(isClientAction({ type: "pick-die", dieId: "bogus" }), false);
assert.equal(isClientAction({ type: "pick-die", dieId: "orange", score: false }), false);
assert.equal(isClientAction({ type: "yellow-cell", index: 15 }), true);
assert.equal(isClientAction({ type: "yellow-cell", index: 16 }), false);
assert.equal(isClientAction({ type: "white-color", color: "white" }), false);
assert.equal(isClientAction({ type: "x-pick", color: "purple" }), false);

console.log("ok");
