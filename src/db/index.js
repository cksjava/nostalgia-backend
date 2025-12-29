const { Sequelize } = require("sequelize");
const path = require("path");

const DB_PATH =
  process.env.SQLITE_PATH || path.join(process.cwd(), "storage", "db.sqlite");

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: DB_PATH,
  logging: process.env.SQL_LOGGING === "1" ? console.log : false,
});

async function initDb() {
  await sequelize.authenticate();
  console.log("DB connected:", DB_PATH);
  // No sync() here — we'll use migrations going forward.
}

module.exports = { sequelize, initDb };
