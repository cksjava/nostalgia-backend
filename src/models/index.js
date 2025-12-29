"use strict";

const fs = require("fs");
const path = require("path");
const { sequelize } = require("../db");

const basename = path.basename(__filename);
const models = {};

fs.readdirSync(__dirname)
  .filter((file) => file !== basename && file.endsWith(".js"))
  .forEach((file) => {
    const defineModel = require(path.join(__dirname, file));
    const model = defineModel(sequelize);
    models[model.name] = model;
  });

Object.values(models).forEach((model) => {
  if (typeof model.associate === "function") {
    model.associate(models);
  }
});

module.exports = { ...models, sequelize };
