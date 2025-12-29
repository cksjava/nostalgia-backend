const path = require("path");

module.exports = {
  development: {
    dialect: "sqlite",
    storage: process.env.SQLITE_PATH
      ? path.resolve(process.env.SQLITE_PATH)
      : path.resolve("storage/db.sqlite"),
    logging: false,
  },
  production: {
    dialect: "sqlite",
    storage: process.env.SQLITE_PATH
      ? path.resolve(process.env.SQLITE_PATH)
      : path.resolve("storage/db.sqlite"),
    logging: false,
  },
};
