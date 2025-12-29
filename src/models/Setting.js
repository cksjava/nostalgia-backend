"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Setting = sequelize.define(
    "Setting",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING, allowNull: false, unique: true },
      value: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: "Settings",
      indexes: [{ fields: ["name"] }],
    }
  );

  return Setting;
};
