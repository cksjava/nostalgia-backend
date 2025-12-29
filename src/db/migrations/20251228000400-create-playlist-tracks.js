"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("PlaylistTracks", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4,
      },

      playlistId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "Playlists", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      trackId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "Tracks", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      // Optional ordering inside playlist
      position: { type: Sequelize.INTEGER, allowNull: true },

      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // Prevent duplicate track entries per playlist (unless you WANT duplicates)
    await queryInterface.addConstraint("PlaylistTracks", {
      fields: ["playlistId", "trackId"],
      type: "unique",
      name: "uniq_playlist_track",
    });

    await queryInterface.addIndex("PlaylistTracks", ["playlistId"]);
    await queryInterface.addIndex("PlaylistTracks", ["trackId"]);
    await queryInterface.addIndex("PlaylistTracks", ["playlistId", "position"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("PlaylistTracks");
  },
};
