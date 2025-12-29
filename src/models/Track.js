"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Track = sequelize.define(
    "Track",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },

      albumId: { type: DataTypes.UUID, allowNull: true },

      title: { type: DataTypes.STRING, allowNull: false },

      trackArtist: { type: DataTypes.STRING, allowNull: true },
      trackArtists: { type: DataTypes.TEXT, allowNull: true }, // JSON string or comma-separated

      albumArtist: { type: DataTypes.STRING, allowNull: true },

      trackNo: { type: DataTypes.INTEGER, allowNull: true },
      trackTotal: { type: DataTypes.INTEGER, allowNull: true },
      discNo: { type: DataTypes.INTEGER, allowNull: true },
      discTotal: { type: DataTypes.INTEGER, allowNull: true },

      year: { type: DataTypes.INTEGER, allowNull: true },
      genre: { type: DataTypes.STRING, allowNull: true },

      durationSec: { type: DataTypes.INTEGER, allowNull: true },
      sampleRate: { type: DataTypes.INTEGER, allowNull: true },
      bitDepth: { type: DataTypes.INTEGER, allowNull: true },
      channels: { type: DataTypes.INTEGER, allowNull: true },
      bitrateKbps: { type: DataTypes.INTEGER, allowNull: true },

      filePath: { type: DataTypes.TEXT, allowNull: false, unique: true },
      fileSizeBytes: { type: DataTypes.BIGINT, allowNull: true },
      fileMtimeMs: { type: DataTypes.BIGINT, allowNull: true },

      isFavourite: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      tableName: "Tracks",
      indexes: [
        { fields: ["albumId"] },
        { fields: ["title"] },
        { fields: ["trackArtist"] },
        { fields: ["albumArtist"] },
        { fields: ["isFavourite"] },
      ],
    }
  );

  Track.associate = (models) => {
    Track.belongsTo(models.Album, { foreignKey: "albumId", as: "album" });

    Track.belongsToMany(models.Playlist, {
      through: models.PlaylistTrack,
      foreignKey: "trackId",
      otherKey: "playlistId",
      as: "playlists",
    });
  };

  return Track;
};
