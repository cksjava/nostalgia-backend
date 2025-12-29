const { app } = require("./app");
const { initDb } = require("./db");

const PORT = process.env.PORT || 4000;

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
