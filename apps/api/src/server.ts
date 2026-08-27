import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { pinoHttp } from "pino-http";
import { connectDb, readAndResetOps } from "./db.js";
import { logger } from "./logger.js";
import { listings } from "./routes/listings.js";
import { startPermitRevalidation } from "./workers/permit-revalidation.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.disable("x-powered-by");
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(pinoHttp({ logger }));

app.use(
  cors({
    origin: (process.env.CORS_ORIGINS ?? "http://localhost:3000").split(","),
    credentials: true,
  }),
);

app.get("/health", (_req, res) => res.json({ ok: true }));

/**
 * Ops/sec sampling. This is the number that decides the Atlas M10 migration,
 * so it is exposed for scraping rather than buried in logs.
 */
let lastOps = 0;
setInterval(() => {
  lastOps = readAndResetOps();
}, 1000).unref();
app.get("/metrics", (_req, res) => res.json({ opsPerSec: lastOps }));

app.use("/api/listings", listings);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, "unhandled error");
  res.status(500).json({ error: "internal_error" });
});

async function main() {
  await connectDb();
  startPermitRevalidation();

  const server = app.listen(PORT, () => logger.info({ port: PORT }, "api listening"));

  // Graceful shutdown so Docker restarts do not drop in-flight requests.
  for (const sig of ["SIGTERM", "SIGINT"] as const) {
    process.on(sig, () => {
      logger.info({ sig }, "shutting down");
      server.close(() => process.exit(0));
    });
  }
}

main().catch((err) => {
  logger.error({ err }, "failed to start");
  process.exit(1);
});
