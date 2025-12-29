const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const { apiRouter } = require("./routes");
const { notFoundHandler } = require("./middlewares/not-found");
const { errorHandler } = require("./middlewares/error");

const { createMpvIpc } = require("./services/mpvIpc");

const app = express();

/**
 * MPV bootstrap
 */
const mpv = createMpvIpc();
mpv.start();

mpv.waitUntilConnected().catch((e) => console.error(e.message));

// make it available in routes/controllers later
app.locals.mpv = mpv;

// stop mpv on shutdown
process.on("SIGINT", () => {
  mpv.stop();
  process.exit(0);
});
process.on("SIGTERM", () => {
  mpv.stop();
  process.exit(0);
});

/**
 * Middleware
 */

// Covers static
app.use(
  "/covers",
  express.static(path.join(process.cwd(), "storage", "covers"), {
    etag: true,
    maxAge: "30d",
    immutable: true,
  })
);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ ok: true, mpv: mpv.getState() }));

// API
app.use("/api", apiRouter);

/**
 * Frontend static hosting
 * Copies Vite dist -> nostalgia-backend/static
 */
const frontendDir = path.join(process.cwd(), "static");
app.use(
  express.static(frontendDir, {
    etag: true,
    maxAge: "1h",
  })
);

// SPA fallback (for React Router) - must be AFTER static + API routes
app.get(/^(?!\/api(?:\/|$))(?!\/covers(?:\/|$)).*/, (req, res, next) => {
  res.sendFile(path.join(frontendDir, "index.html"), (err) => {
    if (err) next(err);
  });
});

// 404 + error middleware
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };
