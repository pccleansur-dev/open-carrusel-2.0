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

server.requestTimeout = 0;
server.headersTimeout = 0;
server.keepAliveTimeout = 90_000;

server.listen(port, "0.0.0.0", () => {
  console.log(`> Open Carrusel ready on http://localhost:${port}`);

  const cronIntervalMs = 5 * 60 * 1000;
  const runCron = () =>
    fetch(`http://127.0.0.1:${port}/api/cron/publish`, { method: "POST" })
      .then((response) => response.json())
      .then((result) => {
        if (result.published > 0 || result.failed > 0) {
          console.log(`> Scheduled publish: ${result.published} published, ${result.failed} failed`);
        }
      })
      .catch((error) => console.error("> Cron error:", error));

  setTimeout(runCron, 30_000);
  setInterval(runCron, cronIntervalMs);
});
