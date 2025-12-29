"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Playlist = sequelize.define(
    "Playlist",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: "Playlists",
      indexes: [{ fields: ["name"] }],
    }
  );

  Playlist.associate = (models) => {
    Playlist.belongsToMany(models.Track, {
      through: models.PlaylistTrack,
      foreignKey: "playlistId",
      otherKey: "trackId",
      as: "tracks",
    });
  };

  return Playlist;
};
