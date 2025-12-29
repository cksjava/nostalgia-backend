"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Albums", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4,
      },

      // Core metadata
      title: { type: Sequelize.STRING, allowNull: false },
      albumArtist: { type: Sequelize.STRING, allowNull: true }, // e.g. "A. R. Rahman"
      // Optional multi-artist support without an Artist table:
      // Store JSON string like ["Artist 1","Artist 2"] or a comma-separated string.
      albumArtists: { type: Sequelize.TEXT, allowNull: true },

      year: { type: Sequelize.INTEGER, allowNull: true },
      genre: { type: Sequelize.STRING, allowNull: true },

      // Source/scan helpers
      // Example: folder path for album, or a representative FLAC file path
      sourcePath: { type: Sequelize.TEXT, allowNull: true },

      // Cover art (store extracted file path, or a hash/key if you store blobs elsewhere)
      coverArtPath: { type: Sequelize.TEXT, allowNull: true },

      // Audit fields
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("Albums", ["title"]);
    await queryInterface.addIndex("Albums", ["albumArtist"]);
    await queryInterface.addIndex("Albums", ["year"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Albums");
  },
};
