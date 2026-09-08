"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { io, type Socket } from "socket.io-client";
import { DieFace } from "@/components/Die";
import { DiceTray } from "@/components/DiceTray";
import { RulesOverlay } from "@/components/RulesOverlay";
import { ScoreSheet } from "@/components/ScoreSheet";
import { canUseExtraAction, diceForPrompt } from "@/lib/game/engine";
import {
  canScoreDie,
  extraDieLeft,
  finalResults,
  legalWhiteColors,
  rerollsLeft,
  roundFourSixOptions,
  roundFourXOptions,
  soloRating,
  totalScore,
} from "@/lib/game/sheet";
import type { ClientAction, Die, GameState, Prompt } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { BookOpen, Check, Link2, RotateCcw, Users } from "lucide-react";

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
    socketRef.current?.emit(
      "create",
      { name },
      (res: Snap & { error?: string }) => {
        if (res?.error) setError(res.error);
        else {
          setState(res);
          history.replaceState(null, "", `/r/${res.code}`);
        }
      },
    );
  }

  function join() {
    socketRef.current?.emit(
      "join",
      { code: joinCode, name },
      (res: Snap & { error?: string }) => {
        if (res?.error) setError(res.error);
        else {
          setState(res);
          history.replaceState(null, "", `/r/${res.code}`);
        }
      },
    );
  }

  if (!state) {
    return (
      <div className="landing">
        <nav className="landing-top" aria-label="Main navigation">
          <span className="wordmark">PC / PRETTY CLEVER</span>
          <Link href="/rules">
            <BookOpen className="size-4" /> How to play
          </Link>
        </nav>
        <div className="landing-content">
          <header className="landing-intro">
            <span className="eyebrow">A little luck. A clever choice.</span>
            <h1>
              Pretty dice.
              <br />
              <em>Clever moves.</em>
            </h1>
            <p>
              Six dice. Five colors. Endless little victories. Build your score,
              chain your bonuses, and leave your friends something to think
              about.
            </p>
            <div className="hero-dice" aria-label="Six colored dice">
              {(
                [
                  "yellow",
                  "blue",
                  "green",
                  "orange",
                  "purple",
                  "white",
                ] as const
              ).map((color, i) => (
                <DieFace
                  key={color}
                  color={color}
                  value={[3, 5, 2, 6, 4, 1][i]}
                />
              ))}
            </div>
            <div className="landing-meta">
              <span>1–4 players</span>
              <span>Six colored dice</span>
              <span>Play together</span>
            </div>
          </header>

          <div className="entry-card">
            <h2>Your table awaits.</h2>
            <p>Start a solo game or make room for friends.</p>
            <label
              htmlFor="name"
              className="text-[11px] font-bold tracking-wide text-cream/60 uppercase"
            >
              Your name
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex"
              autoComplete="nickname"
              className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-ink px-3 text-base text-cream outline-none ring-gold/40 focus:ring-2"
            />
            {error ? <p className="mt-3 text-sm text-orange">{error}</p> : null}

            <button
              type="button"
              onClick={create}
              className="btn-primary mt-4 w-full"
            >
              Open a table
            </button>

            <div className="my-4 flex items-center gap-3 text-[11px] tracking-widest text-cream/35 uppercase">
              <span className="h-px flex-1 bg-white/10" />
              or join
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) =>
                  setJoinCode(
                    e.target.value.toUpperCase().replace(/[^A-Z]/g, ""),
                  )
                }
                placeholder="CODE"
                aria-label="Table code"
                maxLength={4}
                autoCapitalize="characters"
                className="h-12 w-28 rounded-xl border border-white/10 bg-ink text-center text-lg font-bold tracking-[0.25em] text-cream outline-none ring-gold/40 focus:ring-2"
              />
              <button type="button" onClick={join} className="btn-ghost flex-1">
                Sit down
              </button>
            </div>
          </div>
        </div>
        <footer className="landing-footer">
          <span>An unofficial That&apos;s Pretty Clever fan table.</span>
          <span>Roll. Choose. Outfox.</span>
        </footer>
      </div>
    );
  }

  if (!state.game) {
    const share =
      typeof window !== "undefined"
        ? `${window.location.origin}/r/${state.code}`
        : "";
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-5 px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-ink-2/80 p-5 text-center shadow-2xl">
          <p className="text-[11px] tracking-[0.3em] text-gold/80 uppercase">
            Table code
          </p>
          <p className="font-display mt-1 text-6xl tracking-[0.15em] text-cream">
            {state.code}
          </p>
          <button
            type="button"
            className="btn-ghost mt-4 w-full"
            onClick={async () => {
              await navigator.clipboard.writeText(share);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Link2 className="size-4" />
            )}
            {copied ? "Link copied" : "Copy invite link"}
          </button>

          <ul className="mt-5 space-y-1.5 text-left">
            {state.lobby.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-cream"
              >
                <Users className="size-4 shrink-0 text-cream/40" />
                <span className="flex-1 truncate">{p.name}</span>
                {p.id === state.hostId ? (
                  <span className="text-[10px] font-bold tracking-wide text-gold uppercase">
                    host
                  </span>
                ) : null}
              </li>
            ))}
          </ul>

          {state.youId === state.hostId ? (
            <>
              <button
                type="button"
                onClick={() => socketRef.current?.emit("start")}
                className="btn-primary mt-5 w-full"
              >
                Start the game
              </button>
              <p className="mt-2 text-xs text-cream/45">
                {state.lobby.length === 1
                  ? "Solo works too — 6 rounds against the score table."
                  : `${state.lobby.length} players · ${state.lobby.length >= 4 ? 4 : state.lobby.length === 3 ? 5 : 6} rounds`}
              </p>
            </>
          ) : (
            <p className="mt-5 text-sm text-cream/60">
              Waiting for the host to start…
            </p>
          )}
        </div>
        <LobbyRules />
      </div>
    );
  }

  return (
    <Play
      snap={state}
      onAction={(action) => socketRef.current?.emit("action", action)}
    />
  );
}

function Play({
  snap,
  onAction,
}: {
  snap: Snap;
  onAction: (a: ClientAction) => void;
}) {
  const game = snap.game!;
  const me = game.players.find((p) => p.id === snap.youId) ?? game.players[0]!;
  const prompt = game.prompt;
  const mine = prompt?.playerId === snap.youId;
  const [viewId, setViewId] = useState(snap.youId);
  const viewed = game.players.find((p) => p.id === viewId) ?? me;
  const viewingSelf = viewed.id === snap.youId;
  const active = game.players[game.activeIndex];

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="pt-safe shrink-0 border-b border-white/10 bg-ink/85 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-3 pb-2">
          <div className="flex items-center justify-between gap-3 py-1.5">
            <div className="min-w-0">
              <h1 className="font-display truncate text-lg leading-tight text-cream sm:text-xl">
                Pretty Clever
              </h1>
              <p className="truncate text-[11px] text-cream/50">
                Table {snap.code} · Round {game.round}/{game.totalRounds} ·{" "}
                {game.status === "finished"
                  ? "finished"
                  : `${active?.name}'s turn`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-cream/70">
              <PlayRules />
              <Pill label="🦊" value={me.sheet.foxes} />
              <Pill label="+die" value={extraDieLeft(me.sheet)} />
              <Pill label="↻" value={rerollsLeft(me.sheet)} />
            </div>
          </div>

          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
            {game.players.map((p) => {
              const isActive = p.id === active?.id;
              const isWaiting = prompt?.playerId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setViewId(p.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition",
                    viewId === p.id
                      ? "bg-gold text-ink"
                      : "bg-white/8 text-cream/80",
                  )}
                >
                  {isWaiting ? (
                    <span className="size-1.5 rounded-full bg-current" />
                  ) : null}
                  <span className="max-w-24 truncate">{p.name}</span>
                  <span
                    className={cn(
                      viewId === p.id ? "text-ink/60" : "text-cream/45",
                    )}
                  >
                    {totalScore(p.sheet)}
                  </span>
                  {isActive ? <span aria-label="active player">🎲</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-6xl gap-4 px-2 py-3 sm:px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-3">
            {!viewingSelf ? (
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                <span className="truncate text-cream/80">
                  Viewing {viewed.name}&apos;s sheet
                </span>
                <button
                  type="button"
                  onClick={() => setViewId(snap.youId)}
                  className="shrink-0 text-xs font-bold text-gold"
                >
                  Back to mine
                </button>
              </div>
            ) : null}

            <ScoreSheet
              sheet={viewed.sheet}
              prompt={mine && viewingSelf ? prompt : null}
              onYellow={(index) => onAction({ type: "yellow-cell", index })}
              onBlue={(index) => onAction({ type: "blue-cell", index })}
            />
          </div>

          <aside className="game-sidebar mt-3 space-y-3 lg:mt-0">
            <div className="rounded-2xl border border-white/10 bg-ink-2/70 p-4">
              <p className="eyebrow">
                Round {game.round} of {game.totalRounds}
              </p>
              <div className="round-strip" aria-label="Round progress">
                {Array.from({ length: game.totalRounds }, (_, i) => (
                  <span
                    key={i}
                    aria-current={i + 1 === game.round ? "step" : undefined}
                    className={
                      i + 1 === game.round
                        ? "current-round"
                        : i + 1 < game.round
                          ? "past-round"
                          : ""
                    }
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
              <p className="text-xs text-cream/70">
                {game.status === "finished"
                  ? "All rounds complete"
                  : `${active?.name}'s turn`}
              </p>
            </div>
            {game.status === "finished" ? <FinalTally game={game} /> : null}
            <TableDice game={game} />
            <LogPanel game={game} />
          </aside>
        </div>
      </main>

      <footer className="pb-safe shrink-0 border-t border-white/10 bg-ink-2/95 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-3 pt-2.5">
          <PromptBar
            game={game}
            prompt={prompt}
            mine={mine}
            youId={snap.youId}
            pickDice={diceForPrompt(game)}
            onAction={onAction}
          />
        </div>
      </footer>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: number }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-1 tabular-nums",
        value > 0 ? "bg-gold/15 text-gold" : "bg-white/5 text-cream/35",
      )}
    >
      {label} {value}
    </span>
  );
}

function TableDice({ game }: { game: GameState }) {
  const strip = (dice: Die[], muted?: boolean) =>
    dice.length ? (
      <div className="flex flex-wrap gap-1">
        {dice.map((d, i) => (
          <DieFace
            key={`${d.id}-${i}`}
            color={d.color}
            value={d.value}
            size="sm"
            className={muted ? "opacity-60" : ""}
          />
        ))}
      </div>
    ) : (
      <span className="text-xs text-cream/35">empty</span>
    );

  return (
    <div className="rounded-2xl border border-white/10 bg-ink-2/70 p-3">
      <p className="text-[11px] font-bold tracking-wide text-cream/45 uppercase">
        On the table
      </p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-cream/70">
            Kept ({game.dice.chosen.length}/3)
          </p>
          {strip(game.dice.chosen)}
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-cream/70">Silver platter</p>
          {strip(game.dice.platter, true)}
        </div>
      </div>
    </div>
  );
}

function LogPanel({ game }: { game: GameState }) {
  return (
    <details
      className="rounded-2xl border border-white/10 bg-ink-2/70 p-3"
      open
    >
      <summary className="cursor-pointer list-none text-[11px] font-bold tracking-wide text-cream/45 uppercase">
        Table talk
      </summary>
      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs leading-relaxed text-cream/65">
        {[...game.log].reverse().map((e) => (
          <li key={e.id}>{e.text}</li>
        ))}
      </ul>
    </details>
  );
}

function FinalTally({ game }: { game: GameState }) {
  const scores = finalResults(game.players);
  const winners = scores.filter((score) => score.winner);

  return (
    <div className="pop-in rounded-2xl border border-gold/30 bg-gold/10 p-4">
      <p className="font-display text-xl text-gold">Final tally</p>
      <p className="mt-1 text-xs font-semibold text-cream/70">
        {game.players.length === 1
          ? soloRating(scores[0]?.total ?? 0)
          : winners.length > 1
            ? `Shared winners: ${winners.map((winner) => winner.name).join(", ")}`
            : `${winners[0]?.name ?? "No one"} wins`}
      </p>
      <ol className="mt-2 space-y-2">
        {scores.map((s) => (
          <li key={s.id} className="text-sm text-cream">
            <span className="font-bold">
              {s.rank}. {s.name} — {s.total}
            </span>
            <span className="mt-0.5 block text-[11px] text-cream/50">
              Y {s.areas.yellow} · B {s.areas.blue} · G {s.areas.green} · O{" "}
              {s.areas.orange} · P {s.areas.purple} · 🦊 {s.foxes} ×{" "}
              {s.foxes ? s.foxSubtotal / s.foxes : 0} = {s.foxSubtotal}
            </span>
          </li>
        ))}
      </ol>
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
  pickDice: Die[];
  onAction: (a: ClientAction) => void;
}) {
  const waiter = game.players.find((p) => p.id === prompt?.playerId);
  const me = game.players.find((p) => p.id === youId)!;
  const allDice = [
    ...game.dice.pool,
    ...game.dice.rolled,
    ...game.dice.chosen,
    ...game.dice.platter,
  ];
  const activeRollHasLegalDie =
    prompt?.kind === "pick-die" &&
    prompt.source === "active" &&
    game.dice.rolled.some((die) => canScoreDie(me.sheet, die, allDice));

  if (game.status === "finished") {
    return (
      <Dock title="Game over">
        <p className="text-sm text-cream/70">
          Each fox scored your lowest color. Scroll up for the final tally.
        </p>
      </Dock>
    );
  }
  if (!prompt) return null;

  if (!mine) {
    return (
      <Dock title={`Waiting on ${waiter?.name ?? "a player"}…`} muted>
        <p className="text-sm text-cream/55">
          Tap a name above to watch their sheet fill up.
        </p>
      </Dock>
    );
  }

  if (prompt.kind === "round-bonus") {
    if (prompt.round === 1 || prompt.round === 3) {
      return (
        <Dock title={`Round ${prompt.round} bonus`}>
          <button
            className="btn-primary flex-1"
            onClick={() => onAction({ type: "claim-round", choice: "reroll" })}
          >
            <RotateCcw className="size-4" /> Bank a reroll
          </button>
        </Dock>
      );
    }
    if (prompt.round === 4) {
      const xOptions = roundFourXOptions(me.sheet);
      const sixOptions = roundFourSixOptions(me.sheet);
      return (
        <Dock title="Round 4 bonus — pick one">
          {xOptions.length ? (
            <button
              className="btn-primary flex-1"
              onClick={() => onAction({ type: "claim-round", choice: "x" })}
            >
              Free ✕
            </button>
          ) : null}
          {sixOptions.length ? (
            <button
              className="btn-ghost flex-1"
              onClick={() => onAction({ type: "claim-round", choice: "six" })}
            >
              Write a 6
            </button>
          ) : null}
        </Dock>
      );
    }
    return (
      <Dock title={`Round ${prompt.round} bonus`}>
        <button
          className="btn-primary flex-1"
          onClick={() => onAction({ type: "claim-round", choice: "extra" })}
        >
          Bank an extra die
        </button>
      </Dock>
    );
  }

  if (
    prompt.kind === "pick-die" &&
    prompt.source === "active" &&
    game.dice.rolled.length === 0
  ) {
    return (
      <Dock
        title={`Roll ${game.rollsUsed + 1} of 3 · ${game.dice.pool.length} dice in hand`}
      >
        <button
          className="btn-primary flex-1"
          onClick={() => onAction({ type: "roll" })}
        >
          Roll the dice
        </button>
      </Dock>
    );
  }

  if (prompt.kind === "pick-die") {
    const title =
      prompt.source === "active"
        ? "Pick a die — everything lower goes to the platter"
        : prompt.source === "extra"
          ? "Extra die — one per color this turn"
          : prompt.source === "passive-platter"
            ? "Silver platter — take one"
            : "Nothing fits the platter — take one of the kept dice";
    return (
      <Dock title={title}>
        <div className="w-full space-y-2">
          {prompt.source === "active" ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-cream/45 lg:hidden">
              <MiniStrip
                label={`Kept ${game.dice.chosen.length}/3`}
                dice={game.dice.chosen}
              />
              <MiniStrip label="Platter" dice={game.dice.platter} />
            </div>
          ) : null}
          <DiceTray
            dice={pickDice}
            sheet={me.sheet}
            allDice={allDice}
            extraUsed={me.extraUsedThisTurn}
            source={prompt.source}
            onPick={(id) => onAction({ type: "pick-die", dieId: id })}
          />
          <div className="flex gap-2">
            {prompt.source === "active" &&
            rerollsLeft(me.sheet) > 0 &&
            game.dice.rolled.length > 0 ? (
              <button
                className="btn-ghost flex-1"
                onClick={() => onAction({ type: "reroll" })}
              >
                <RotateCcw className="size-4" /> Reroll ({rerollsLeft(me.sheet)}
                )
              </button>
            ) : null}
            {prompt.source === "active" &&
            game.dice.rolled.length > 0 &&
            !activeRollHasLegalDie ? (
              <button
                className="btn-primary flex-1"
                onClick={() => onAction({ type: "forfeit-roll" })}
              >
                No legal die — forfeit roll
              </button>
            ) : null}
            {prompt.allowPass ? (
              <button
                className="btn-ghost flex-1"
                onClick={() => onAction({ type: "pass" })}
              >
                Pass
              </button>
            ) : null}
          </div>
        </div>
      </Dock>
    );
  }

  if (prompt.kind === "white-color") {
    const legal = legalWhiteColors(me.sheet, prompt.value, allDice);
    return (
      <Dock title={`White ${prompt.value} is wild — use it as`}>
        <div className="flex w-full flex-wrap gap-2">
          {legal.map((c) => (
            <button
              key={c}
              className="btn-ghost flex-1 capitalize"
              onClick={() => onAction({ type: "white-color", color: c })}
            >
              {c}
            </button>
          ))}
        </div>
      </Dock>
    );
  }

  if (prompt.kind === "yellow-cell") {
    return (
      <Dock
        title={
          prompt.value === "any"
            ? "Bonus ✕ — tap any open yellow box"
            : `Tap a yellow ${prompt.value}`
        }
        muted
      >
        <p className="text-sm text-cream/55">
          The playable boxes are outlined on your sheet.
        </p>
      </Dock>
    );
  }
  if (prompt.kind === "blue-cell") {
    return (
      <Dock
        title={
          prompt.value === "any"
            ? "Bonus ✕ — tap any open blue box"
            : `Tap blue ${prompt.value}`
        }
        muted
      >
        <p className="text-sm text-cream/55">
          The playable boxes are outlined on your sheet.
        </p>
      </Dock>
    );
  }
  if (prompt.kind === "x-pick") {
    const options = roundFourXOptions(me.sheet);
    return (
      <Dock title="Free ✕ — which color?">
        {options.map((color) => (
          <button
            key={color}
            className="btn-ghost flex-1 capitalize"
            onClick={() => onAction({ type: "x-pick", color })}
          >
            {color}
          </button>
        ))}
      </Dock>
    );
  }
  if (prompt.kind === "six-pick") {
    const options = roundFourSixOptions(me.sheet);
    return (
      <Dock title="Write a 6 in">
        {options.map((color) => (
          <button
            key={color}
            className="btn-ghost flex-1 capitalize"
            onClick={() => onAction({ type: "six-pick", color })}
          >
            {color}
          </button>
        ))}
      </Dock>
    );
  }
  if (prompt.kind === "extra-or-done") {
    const canUseExtra = canUseExtraAction(game, youId);
    return (
      <Dock title={`Extra dice available: ${extraDieLeft(me.sheet)}`}>
        <button
          disabled={!canUseExtra}
          className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onAction({ type: "use-extra" })}
        >
          Take an extra die
        </button>
        <button
          className="btn-ghost flex-1"
          onClick={() => onAction({ type: "done-extra" })}
        >
          End turn
        </button>
      </Dock>
    );
  }
  return null;
}

function MiniStrip({ label, dice }: { label: string; dice: Die[] }) {
  return (
    <span className="flex items-center gap-1">
      <span className="font-semibold">{label}</span>
      {dice.length ? (
        dice.map((d, i) => (
          <DieFace
            key={`${d.id}-${i}`}
            color={d.color}
            value={d.value}
            size="sm"
            className="size-6 p-0.5"
          />
        ))
      ) : (
        <span className="opacity-60">—</span>
      )}
    </span>
  );
}

function Dock({
  title,
  muted,
  children,
}: {
  title: string;
  muted?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="pop-in pb-2">
      <p
        className={cn(
          "mb-2 text-sm font-bold",
          muted ? "text-cream/60" : "text-gold",
        )}
      >
        {title}
      </p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function LobbyRules() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="btn-ghost w-full"
        onClick={() => setOpen(true)}
      >
        <BookOpen className="size-4" />
        Rules
      </button>
      <RulesOverlay open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function PlayRules() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-bold text-cream/80"
        onClick={() => setOpen(true)}
      >
        Rules
      </button>
      <RulesOverlay open={open} onClose={() => setOpen(false)} />
    </>
  );
}
