# Pretty Clever

An unofficial web table for **That's Pretty Clever** (Ganz schön clever) so you can open a room, send a code, and play with friends in the browser.

This is a fan table for the Wolfgang Warsch dice game. It is not affiliated with Schmidt Spiele, CMYK, or the Steam edition.

## Play locally

```bash
npm install
npm run dev
```

Open [http://localhost:43147](http://localhost:43147). One person opens a table, everyone else joins with the four-letter code (or the `/r/CODE` link). You can also start a solo table and take both the active turn and the silver-platter leftover.

The layout is built for phones and tablets first: the sheet scrolls between a fixed header and an action dock that keeps the current decision within thumb reach, and it opens into two columns from tablet width up.

## How a turn works

1. The active player rolls up to three times. After each roll they score one die. Every remaining die showing a **lower** value goes to the silver platter and is gone for the rest of their turn.
2. White is wild. Blue always uses **white + blue**, no matter where those two dice sit.
3. After the active player is done (and may spend extra dice by re-rolling dice **not** on the platter), everyone else simultaneously (in seating order here) scores **one** die from the platter. If nothing on the platter fits, they may use a die the active player kept.
4. Extra-die and reroll tokens can be saved. Foxes score your **lowest** color at the end — a zero in any color makes them worthless.

Rounds scale with player count: 6 (1–2 players), 5 (3), 4 (4).

## Deploy

This app needs a **long-running Node server** (Socket.IO). Plain static hosts and Vercel/Netlify will not work.

### Fastest path for a friends table

```bash
npm install
npm run build
npm start
```

Then put a tunnel in front of port `43147` (Cloudflare Tunnel, ngrok, etc.) and share the HTTPS URL.

### Docker / Fly / Render

```bash
docker build -t pretty-clever .
docker run --rm -p 43147:43147 pretty-clever
```

- **Fly.io** — `fly launch` / `fly deploy` (see `fly.toml`)
- **Render** — Web Service with the Docker runtime (see `render.yaml`)

Rooms live **in memory on one process**. Keep a single instance; a restart clears open tables. Rejoin the same code with the same name if you drop mid-game.

## Scripts

- `npm run dev` — Next.js + Socket.IO on port 43147
- `npm test` — scoring and turn-flow checks
- `npm run build` / `npm start` — production

## Fidelity note

Scoring, the silver platter, the wild white die, round bonuses, and the five-fox ceiling follow the printed rules. The exact square each bonus icon sits on is reconstructed rather than copied from the pad, so a few bonuses may sit one box away from your physical copy.
