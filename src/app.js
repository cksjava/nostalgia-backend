const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const { apiRouter } = require("./routes");
const { notFoundHandler } = require("./middlewares/not-found");
const { errorHandler } = require("./middlewares/error");

const app = express();

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

app.get("/health", (req, res) => res.json({ ok: true }));

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

// SPA fallback (for React Router)
app.get("*", (req, res, next) => {
  // If it's an API route, let your 404 handler deal with it
  if (req.path.startsWith("/api") || req.path.startsWith("/covers")) return next();

  res.sendFile(path.join(frontendDir, "index.html"), (err) => {
    if (err) next(err);
  });
});

// 404 + error middleware
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };
