"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { DiceTray } from "@/components/DiceTray";
import { ScoreSheet } from "@/components/ScoreSheet";
import { diceForPrompt } from "@/lib/game/engine";
import { areaScores, extraDieLeft, legalWhiteColors, rerollsLeft, totalScore } from "@/lib/game/sheet";
import type { ClientAction, GameState, Prompt } from "@/lib/game/types";
import { Link2, Users } from "lucide-react";

type Snap = {
  code: string;
  hostId: string;
  status: "lobby" | "playing" | "finished";
  youId: string;
  game: GameState | null;
  lobby: { id: string; name: string; host?: boolean }[];
  error?: string;
};

export function GameClient({ initialCode }: { initialCode?: string }) {
  const socketRef = useRef<Socket | null>(null);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState(initialCode ?? "");
  const [state, setState] = useState<Snap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const s = io({ path: "/socket.io" });
    socketRef.current = s;
    s.on("state", (next: Snap) => {
      setState(next);
      setError(null);
    });
    return () => {
      s.close();
      socketRef.current = null;
    };
  }, []);

  function create() {
    socketRef.current?.emit("create", { name }, (res: Snap & { error?: string }) => {
      if (res?.error) setError(res.error);
      else {
        setState(res);
        history.replaceState(null, "", `/r/${res.code}`);
      }
    });
  }

  function join() {
    socketRef.current?.emit("join", { code: joinCode, name }, (res: Snap & { error?: string }) => {
      if (res?.error) setError(res.error);
      else {
        setState(res);
        history.replaceState(null, "", `/r/${res.code}`);
      }
    });
  }

  if (!state) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-10">
        <header className="space-y-3 text-center">
          <p className="text-xs font-semibold tracking-[0.25em] text-amber-200/80 uppercase">
            Unofficial table
          </p>
          <h1 className="font-display text-4xl text-cream sm:text-5xl">Pretty Clever</h1>
          <p className="text-pretty text-sm leading-relaxed text-cream/75">
            Roll six colored dice, pick cleverly, and chain bonuses across your sheet. Open a table,
            send the code to friends, and everyone scores on every turn — including the silver
            platter leftovers.
          </p>
        </header>
        <div className="rounded-2xl border border-white/10 bg-ink-2/80 p-5 shadow-xl backdrop-blur">
          <label className="text-xs font-medium tracking-wide text-cream/60 uppercase">
            Your name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex"
            className="mt-2 w-full rounded-xl border border-white/10 bg-ink px-3 py-2.5 text-cream outline-none ring-amber-300/40 focus:ring-2"
          />
          {error ? <p className="mt-3 text-sm text-orange-300">{error}</p> : null}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={create}
              className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-ink hover:bg-amber-200"
            >
              Open a table
            </button>
            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="CODE"
                maxLength={4}
                className="w-24 rounded-xl border border-white/10 bg-ink px-3 py-2 text-center tracking-[0.3em] text-cream outline-none"
              />
              <button
                type="button"
                onClick={join}
                className="flex-1 rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold text-cream hover:bg-white/5"
              >
                Sit down
              </button>
            </div>
          </div>
        </div>
        <HowTo />
      </div>
    );
  }

  if (!state.game) {
    const share = typeof window !== "undefined" ? `${window.location.origin}/r/${state.code}` : "";
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-10">
        <div className="rounded-2xl border border-white/10 bg-ink-2/80 p-6">
          <p className="text-xs tracking-[0.25em] text-amber-200/80 uppercase">Table code</p>
          <p className="font-display mt-1 text-5xl tracking-[0.2em] text-cream">{state.code}</p>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-2 text-sm text-amber-200 hover:text-amber-100"
            onClick={async () => {
              await navigator.clipboard.writeText(share);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            <Link2 className="size-4" />
            {copied ? "Link copied" : "Copy invite link"}
          </button>
          <ul className="mt-6 space-y-2">
            {state.lobby.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-cream">
                <Users className="size-4 text-cream/50" />
                {p.name}
                {p.id === state.hostId ? (
                  <span className="text-xs text-amber-200/80">host</span>
                ) : null}
              </li>
            ))}
          </ul>
          {state.youId === state.hostId ? (
            <button
              type="button"
              onClick={() => socketRef.current?.emit("start")}
              className="mt-6 w-full rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-ink hover:bg-amber-200"
            >
              Start the game
            </button>
          ) : (
            <p className="mt-6 text-sm text-cream/60">Waiting for the host to start…</p>
          )}
        </div>
        <HowTo compact />
      </div>
    );
  }

  return <Play snap={state} onAction={(action) => socketRef.current?.emit("action", action)} />;
}

function Play({ snap, onAction }: { snap: Snap; onAction: (a: ClientAction) => void }) {
  const game = snap.game!;
  const me = game.players.find((p) => p.id === snap.youId) ?? game.players[0]!;
  const prompt = game.prompt;
  const mine = prompt?.playerId === snap.youId;
  const [viewId, setViewId] = useState(snap.youId);
  const viewed = game.players.find((p) => p.id === viewId) ?? me;
  const pickDice = diceForPrompt(game);
  const scores = game.players
    .map((p) => ({
      id: p.id,
      name: p.name,
      total: totalScore(p.sheet),
      areas: areaScores(p.sheet),
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.25em] text-amber-200/70 uppercase">
            Table {snap.code} · Round {game.round}/{game.totalRounds} · Active{" "}
            {game.players[game.activeIndex]?.name}
          </p>
          <h1 className="font-display text-3xl text-cream">Pretty Clever</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {game.players.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setViewId(p.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                viewId === p.id ? "bg-amber-300 text-ink" : "bg-white/10 text-cream"
              }`}
            >
              {p.name} · {totalScore(p.sheet)}
            </button>
          ))}
        </div>
      </header>

      <PromptBar
        game={game}
        prompt={prompt}
        mine={mine}
        youId={snap.youId}
        pickDice={pickDice}
        onAction={onAction}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <ScoreSheet
          sheet={viewed.sheet}
          prompt={mine && viewed.id === snap.youId ? prompt : null}
          onYellow={(index) => onAction({ type: "yellow-cell", index })}
          onBlue={(index) => onAction({ type: "blue-cell", index })}
        />
        <aside className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-ink-2/80 p-4">
            <p className="text-xs tracking-wide text-cream/50 uppercase">You</p>
            <p className="text-cream">
              Extra dice {extraDieLeft(me.sheet)} · Rerolls {rerollsLeft(me.sheet)} · Foxes{" "}
              {me.sheet.foxes}
            </p>
            <p className="mt-1 text-2xl font-semibold text-amber-200">{totalScore(me.sheet)}</p>
          </div>
          {game.status === "finished" ? (
            <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4">
              <p className="font-display text-xl text-amber-100">Final tally</p>
              <ol className="mt-2 space-y-1 text-sm text-cream">
                {scores.map((s, i) => (
                  <li key={s.id}>
                    {i + 1}. {s.name} — {s.total}
                    <span className="block text-xs text-cream/50">
                      Y {s.areas.yellow} · B {s.areas.blue} · G {s.areas.green} · O {s.areas.orange}{" "}
                      · P {s.areas.purple}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          <div className="rounded-2xl border border-white/10 bg-ink-2/70 p-4">
            <p className="text-xs tracking-wide text-cream/50 uppercase">Table talk</p>
            <ul className="mt-2 max-h-56 space-y-1 overflow-auto text-xs text-cream/70">
              {[...game.log].reverse().map((e) => (
                <li key={e.id}>{e.text}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PromptBar({
  game,
  prompt,
  mine,
  youId,
  pickDice,
  onAction,
}: {
  game: GameState;
  prompt: Prompt | null;
  mine: boolean;
  youId: string;
  pickDice: ReturnType<typeof diceForPrompt>;
  onAction: (a: ClientAction) => void;
}) {
  const waiter = game.players.find((p) => p.id === prompt?.playerId);
  if (game.status === "finished") {
    return (
      <div className="rounded-2xl bg-amber-300 px-4 py-3 text-sm font-semibold text-ink">
        Game over. Compare sheets — foxes score your lowest color, times the number of foxes.
      </div>
    );
  }
  if (!prompt) return null;
  if (!mine) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-cream/80">
        Waiting on {waiter?.name ?? "a player"}…
      </div>
    );
  }

  if (prompt.kind === "round-bonus") {
    if (prompt.round === 2) {
      return (
        <ActionCard title="Round 2 bonus — bank a reroll">
          <button className="btn-primary" onClick={() => onAction({ type: "claim-round", choice: "reroll" })}>
            Take the reroll
          </button>
        </ActionCard>
      );
    }
    if (prompt.round === 4) {
      return (
        <ActionCard title="Round 4 — pick one">
          <button className="btn-primary" onClick={() => onAction({ type: "claim-round", choice: "x" })}>
            Free X (yellow, blue, or green)
          </button>
          <button className="btn-ghost" onClick={() => onAction({ type: "claim-round", choice: "six" })}>
            Write a 6 (orange or purple)
          </button>
        </ActionCard>
      );
    }
    return (
      <ActionCard title={`Round ${prompt.round} bonus — bank an extra die`}>
        <button className="btn-primary" onClick={() => onAction({ type: "claim-round", choice: "extra" })}>
          Take the extra die
        </button>
      </ActionCard>
    );
  }

  if (prompt.kind === "pick-die" && prompt.source === "active" && game.dice.rolled.length === 0) {
    return (
      <ActionCard title={`Roll ${game.rollsUsed + 1} of 3 — ${game.dice.pool.length} dice left`}>
        <button className="btn-primary" onClick={() => onAction({ type: "roll" })}>
          Roll
        </button>
      </ActionCard>
    );
  }

  if (prompt.kind === "pick-die") {
    const me = game.players.find((p) => p.id === youId)!;
    return (
      <ActionCard
        title={
          prompt.source === "active"
            ? `Choose a die (roll ${game.rollsUsed}/3)`
            : prompt.source === "extra"
              ? "Extra die — rolled dice not on the platter (same color only once this turn)"
              : prompt.source === "passive-platter"
                ? "Silver platter — pick one leftover die"
                : "No platter die fits — pick from the chosen dice"
        }
      >
        <DiceTray
          dice={pickDice}
          sheet={me.sheet}
          allDice={[...game.dice.pool, ...game.dice.rolled, ...game.dice.chosen, ...game.dice.platter]}
          extraUsed={me.extraUsedThisTurn}
          source={prompt.source}
          onPick={(id, score) => onAction({ type: "pick-die", dieId: id, score })}
        />
        {prompt.source === "active" && rerollsLeft(me.sheet) > 0 && game.dice.rolled.length > 0 ? (
          <button className="btn-ghost" onClick={() => onAction({ type: "reroll" })}>
            Spend reroll ({rerollsLeft(me.sheet)} left)
          </button>
        ) : null}
        {prompt.allowPass ? (
          <button className="btn-ghost" onClick={() => onAction({ type: "pass" })}>
            Pass
          </button>
        ) : null}
        {prompt.source === "active" ? (
          <p className="w-full text-xs text-cream/50">
            Dice lower than your pick go to the silver platter. Chosen:{" "}
            {game.dice.chosen.map((d) => `${d.color[0]}${d.value}`).join(" ") || "—"} · Platter:{" "}
            {game.dice.platter.map((d) => `${d.color[0]}${d.value}`).join(" ") || "—"}
          </p>
        ) : null}
      </ActionCard>
    );
  }

  if (prompt.kind === "white-color") {
    const me = game.players.find((p) => p.id === youId)!;
    const legal = legalWhiteColors(
      me.sheet,
      prompt.value,
      [...game.dice.pool, ...game.dice.rolled, ...game.dice.chosen, ...game.dice.platter],
    );
    return (
      <ActionCard title={`White ${prompt.value} is wild — pick a color`}>
        {legal.map((c) => (
          <button
            key={c}
            className="btn-ghost capitalize"
            onClick={() => onAction({ type: "white-color", color: c })}
          >
            {c}
          </button>
        ))}
      </ActionCard>
    );
  }

  if (prompt.kind === "yellow-cell") {
    return (
      <ActionCard title={prompt.value === "any" ? "Bonus X — tap any open yellow box" : `Tap a yellow ${prompt.value}`}>
        <p className="text-xs text-cream/60">Matching boxes are highlighted on your sheet.</p>
      </ActionCard>
    );
  }
  if (prompt.kind === "blue-cell") {
    return (
      <ActionCard
        title={
          prompt.value === "any"
            ? "Bonus X — tap any open blue box"
            : `Tap blue ${prompt.value} (white + blue)`
        }
      />
    );
  }
  if (prompt.kind === "x-pick") {
    return (
      <ActionCard title="Free X — which color?">
        <button className="btn-ghost" onClick={() => onAction({ type: "x-pick", color: "yellow" })}>
          Yellow
        </button>
        <button className="btn-ghost" onClick={() => onAction({ type: "x-pick", color: "blue" })}>
          Blue
        </button>
        <button className="btn-ghost" onClick={() => onAction({ type: "x-pick", color: "green" })}>
          Green
        </button>
      </ActionCard>
    );
  }
  if (prompt.kind === "six-pick") {
    return (
      <ActionCard title="Write a 6">
        <button className="btn-ghost" onClick={() => onAction({ type: "six-pick", color: "orange" })}>
          Orange
        </button>
        <button className="btn-ghost" onClick={() => onAction({ type: "six-pick", color: "purple" })}>
          Purple
        </button>
      </ActionCard>
    );
  }
  if (prompt.kind === "extra-or-done") {
    return (
      <ActionCard title="Spend an extra die, or finish">
        <button className="btn-primary" onClick={() => onAction({ type: "use-extra" })}>
          Extra die
        </button>
        <button className="btn-ghost" onClick={() => onAction({ type: "done-extra" })}>
          I&apos;m done
        </button>
      </ActionCard>
    );
  }
  return null;
}

function ActionCard({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-amber-200/20 bg-ink-2 px-4 py-3">
      <p className="text-sm font-semibold text-cream">{title}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function HowTo({ compact }: { compact?: boolean }) {
  return (
    <details
      className="rounded-2xl border border-white/10 bg-ink-2/50 p-4 text-sm text-cream/75"
      open={!compact}
    >
      <summary className="cursor-pointer font-semibold text-cream">How the table works</summary>
      <div className="mt-3 space-y-2 text-pretty leading-relaxed">
        <p>
          On your turn you roll, pick one die to score, then dump every lower die onto the silver
          platter. Repeat up to three times. Friends each take one platter die from your leftovers.
          Solo, you also score one leftover from that same platter.
        </p>
        <p>
          White is wild. Blue always scores white + blue, wherever those two dice currently sit.
          Green must meet the next threshold. Orange writes the pips (watch the ×2 / ×3 boxes).
          Purple must climb, then any number after a 6.
        </p>
        <p>
          Bonuses chain immediately. Extra dice and rerolls can be saved. Foxes multiply your
          lowest color at the end — don&apos;t leave a zero.
        </p>
      </div>
    </details>
  );
}
