const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { apiRouter } = require("./routes");
const { notFoundHandler } = require("./middlewares/not-found");
const { errorHandler } = require("./middlewares/error");
const path = require("path");
const app = express();

app.use(
  "/covers",
  express.static(path.join(process.cwd(), "storage", "covers"), {
    // good kiosk defaults
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

app.use("/api", apiRouter);

// 404 + error middleware
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };
