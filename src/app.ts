import express from "express";
import http from "http";
import routes from "./routes";
import { initDb, sequelize } from "./db/sequelize";
import cors from "cors";

async function main() {
  await initDb();

  const app = express();

  // CORS only for local dev (Vite). In production (nginx proxy), skip CORS entirely.
  if (process.env.NODE_ENV !== "production") {
    app.use(
      cors({
        origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
      })
    );
  }

  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api", routes);

  const port = Number(process.env.PORT || 3001);
  const server = http.createServer(app);

  server.listen(port, () => console.log(`API listening on ${port}`));

  async function shutdown(signal: string) {
    console.log(`[shutdown] received ${signal}, closing...`);

    server.close(async (err) => {
      if (err) console.error("[shutdown] server close error:", err);

      try {
        await sequelize.close();
      } catch (e) {
        console.error("[shutdown] sequelize close error:", e);
      } finally {
        process.exit(err ? 1 : 0);
      }
    });

    setTimeout(() => process.exit(1), 10_000).unref();
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
