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

Production locally (same port, `HOST=0.0.0.0`):

```bash
npm run build
npm start
```

## How a turn works

1. The active player rolls up to three times. After each roll they score one die. Every remaining die showing a **lower** value goes to the silver platter and is gone for the rest of their turn.
2. White is wild. Blue always uses **white + blue**, no matter where those two dice sit.
3. After the active player is done, they may spend extra-die actions to score any of the six dice at its current value. Everyone else then scores **one** shared platter die (serialized in seating order by this web table). If nothing on the platter fits, they may use a die the active player kept.
4. Extra-die and reroll tokens can be saved. Foxes score your **lowest** color at the end — a zero in any color makes them worthless.

Rounds scale with player count: 6 (1–2 players), 5 (3), 4 (4).

## Host it (Render)

This app is a **long-running Node process** with Socket.IO. Vercel, Netlify, and other request-scoped hosts will not work. Rooms live **in memory on one process** — keep a single instance. A restart (or a Free-plan sleep) clears every open table. Rejoin the same code with the same name if you drop mid-game.

Render is the straightforward always-on-ish path: Docker Web Service, HTTPS URL, no extra database.

### What you have to click (I cannot finish this from here)

There is no Render account or API key in this environment, so a live `*.onrender.com` URL has to be created in **your** Render dashboard. This project also started as a Cursor Origin git remote. Render clones **GitHub, GitLab, or Bitbucket only** — it will not accept the Origin URL.

1. In Cursor, use **Create repo** to publish this project to GitHub (new project; there is no GitHub repository until you do that).
2. Sign in at [render.com](https://render.com) (Hobby/free workspace is enough to try).
3. Deploy with either path below. Stay on **one instance**.

### Path A — Blueprint (uses `render.yaml`)

1. Dashboard → **New** → **Blueprint**.
2. Connect GitHub and select the repo you just created.
3. Confirm the service `pretty-clever`: Docker runtime, `plan: free`, `numInstances: 1`.
4. Apply. Render builds the Dockerfile and gives you `https://pretty-clever.onrender.com` (or a name you choose).

### Path B — Web Service from the dashboard

1. Dashboard → **New** → **Web Service**.
2. Connect the GitHub repo.
3. Runtime: **Docker** (it should pick up `Dockerfile`).
4. Instance type: **Free** to try, or **Starter** (`0.5c-512mb`) if you want the table to stay up between game nights.
5. Instance count: **1**. Do not enable autoscaling.
6. Environment (Render already injects `PORT`):
   - `NODE_ENV=production`
   - `HOST=0.0.0.0`
7. Deploy. Share the `*.onrender.com` HTTPS URL. Friends open it, one person creates a table, everyone else joins with the four-letter code.

### Free vs always-on

- **Free** — $0, sleeps after **15 minutes idle**, ~1 minute cold start, **rooms are gone** when it sleeps. Fine for a trial.
- **Starter** — paid, always on. Use this for a friends table you actually keep.

Do not scale to two instances. Two processes means two different in-memory lobbies; the same code will not find the same table.

### Docker on your machine (same image Render builds)

```bash
docker build -t pretty-clever .
docker run --rm -p 43147:43147 pretty-clever
```

Fly.io is also wired (`fly.toml`) if you already have that account: `fly launch` / `fly deploy`. Same single-instance rule.

A Cloudflare quick tunnel in front of `npm start` still works for a one-off night. Those URLs expire; Render does not.

## Scripts

- `npm run dev` — Next.js + Socket.IO on port 43147
- `npm test` — scoring and turn-flow checks
- `npm run build` / `npm start` — production

## Fidelity note

Scoring, the silver platter, the wild white die, round bonuses, and the five-fox ceiling follow the printed rules. The exact square each bonus icon sits on is reconstructed rather than copied from the pad, so a few bonuses may sit one box away from your physical copy.
