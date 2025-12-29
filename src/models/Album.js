"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Album = sequelize.define(
    "Album",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },

      title: { type: DataTypes.STRING, allowNull: false },
      albumArtist: { type: DataTypes.STRING, allowNull: true },
      albumArtists: { type: DataTypes.TEXT, allowNull: true }, // JSON string or comma-separated

      year: { type: DataTypes.INTEGER, allowNull: true },
      genre: { type: DataTypes.STRING, allowNull: true },

      sourcePath: { type: DataTypes.TEXT, allowNull: true },
      coverArtPath: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: "Albums",
      indexes: [
        { fields: ["title"] },
        { fields: ["albumArtist"] },
        { fields: ["year"] },
      ],
    }
  );

  Album.associate = (models) => {
    Album.hasMany(models.Track, { foreignKey: "albumId", as: "tracks" });
  };

  return Album;
};
