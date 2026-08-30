# Pretty Clever

An unofficial web table for **That's Pretty Clever** (Ganz schön clever) so you can open a room, send a code, and play with friends in the browser.

This is a fan table for the Wolfgang Warsch dice game. It is not affiliated with Schmidt Spiele, CMYK, or the Steam edition.

## Play locally

```bash
npm install
npm run dev
```

Open [http://localhost:43147](http://localhost:43147). One person opens a table, everyone else joins with the four-letter code (or the `/r/CODE` link). You can also start a solo table and take both the active turn and the silver-platter leftover.

## How a turn works

1. The active player rolls up to three times. After each roll they score one die. Every remaining die showing a **lower** value goes to the silver platter and is gone for the rest of their turn.
2. White is wild. Blue always uses **white + blue**, no matter where those two dice sit.
3. After the active player is done (and may spend extra dice by re-rolling dice **not** on the platter), everyone else simultaneously (in seating order here) scores **one** die from the platter. If nothing on the platter fits, they may use a die the active player kept.
4. Extra-die and reroll tokens can be saved. Foxes score your **lowest** color at the end — a zero in any color makes them worthless.

Rounds scale with player count: 6 (1–2 players), 5 (3), 4 (4).

## Scripts

- `npm run dev` — Next.js + Socket.IO on port 43147
- `npm test` — scoring and turn-flow checks
- `npm run build` / `npm start` — production

Rooms live in memory on the server process. Restarting the server clears open tables.
