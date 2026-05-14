import { createServer } from "http";
import { parse } from "url";
import next from "next";

const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev: false, hostname: "0.0.0.0", port });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer((req, res) => {
  const parsedUrl = parse(req.url, true);
  handle(req, res, parsedUrl);
});

// SSE streams for AI generation can run 5+ minutes.
// Node.js 18+ defaults to 300 s requestTimeout which kills long-running streams.
server.requestTimeout = 0;
server.headersTimeout = 0;
server.keepAliveTimeout = 90_000;

server.listen(port, "0.0.0.0", () => {
  console.log(`> Open Carrusel ready on http://localhost:${port}`);

  // Check for scheduled publications every 5 minutes
  const CRON_INTERVAL_MS = 5 * 60 * 1000;
  const runCron = () =>
    fetch(`http://127.0.0.1:${port}/api/cron/publish`, { method: "POST" })
      .then((r) => r.json())
      .then((result) => {
        if (result.published > 0 || result.failed > 0) {
          console.log(`> Scheduled publish: ${result.published} published, ${result.failed} failed`);
        }
      })
      .catch((err) => console.error("> Cron error:", err));

  // Run once 30s after boot (catch anything missed while server was down)
  setTimeout(runCron, 30_000);
  setInterval(runCron, CRON_INTERVAL_MS);
});
