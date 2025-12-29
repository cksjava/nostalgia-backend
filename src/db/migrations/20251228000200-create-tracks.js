"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Tracks", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4,
      },

      albumId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "Albums", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      // Core metadata
      title: { type: Sequelize.STRING, allowNull: false },

      // Track-level artist(s)
      trackArtist: { type: Sequelize.STRING, allowNull: true },
      trackArtists: { type: Sequelize.TEXT, allowNull: true }, // JSON string or comma-separated

      // Some files have both album artist and track artist;
      // storing on Track makes filtering easier without joining Album.
      albumArtist: { type: Sequelize.STRING, allowNull: true },

      // Positioning
      trackNo: { type: Sequelize.INTEGER, allowNull: true },
      trackTotal: { type: Sequelize.INTEGER, allowNull: true },
      discNo: { type: Sequelize.INTEGER, allowNull: true },
      discTotal: { type: Sequelize.INTEGER, allowNull: true },

      year: { type: Sequelize.INTEGER, allowNull: true },
      genre: { type: Sequelize.STRING, allowNull: true },

      // Playback / file details
      durationSec: { type: Sequelize.INTEGER, allowNull: true }, // parsed from FLAC stream info
      sampleRate: { type: Sequelize.INTEGER, allowNull: true },
      bitDepth: { type: Sequelize.INTEGER, allowNull: true },
      channels: { type: Sequelize.INTEGER, allowNull: true },
      bitrateKbps: { type: Sequelize.INTEGER, allowNull: true },

      // File identity
      filePath: { type: Sequelize.TEXT, allowNull: false, unique: true },
      fileSizeBytes: { type: Sequelize.BIGINT, allowNull: true },
      fileMtimeMs: { type: Sequelize.BIGINT, allowNull: true }, // for quick "changed?" checks

      // Favorites
      isFavourite: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },

      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("Tracks", ["albumId"]);
    await queryInterface.addIndex("Tracks", ["title"]);
    await queryInterface.addIndex("Tracks", ["trackArtist"]);
    await queryInterface.addIndex("Tracks", ["albumArtist"]);
    await queryInterface.addIndex("Tracks", ["isFavourite"]);
    // "filePath" is already unique; the DB will enforce it.
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Tracks");
  },
};
