import { createServer } from "http";
import next from "next";
import { attachSocket } from "./src/server/io";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 43147);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });
  attachSocket(httpServer);
  httpServer.listen(port, hostname, () => {
    console.log(`Clever Table ready on http://${hostname}:${port}`);
  });
});
