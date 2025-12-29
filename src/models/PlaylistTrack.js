"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PlaylistTrack = sequelize.define(
    "PlaylistTrack",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      playlistId: { type: DataTypes.UUID, allowNull: false },
      trackId: { type: DataTypes.UUID, allowNull: false },
      position: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: "PlaylistTracks",
      indexes: [
        { fields: ["playlistId"] },
        { fields: ["trackId"] },
        { fields: ["playlistId", "position"] },
      ],
    }
  );

  return PlaylistTrack;
};
