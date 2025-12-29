"use strict";

const { Playlist, Track, PlaylistTrack, sequelize } = require("../models");

function trackCountLiteral() {
  // Resolve actual join table name from the model
  const joinTable = PlaylistTrack.getTableName();
  // getTableName() can return string or object (with schema). Normalize to string.
  const tableName = typeof joinTable === "string" ? joinTable : joinTable.tableName;

  // Playlist table alias is usually "Playlist" when using findAll/findByPk on Playlist model.
  // This correlated subquery returns #rows in join table for each playlist.
  return sequelize.literal(
    `(SELECT COUNT(*) FROM "${tableName}" AS pt WHERE pt.playlistId = "Playlist"."id")`
  );
}

class PlaylistService {
  static async create(data) {
    return Playlist.create(data);
  }

  static async getById(id, { withTracks = false } = {}) {
    if (!withTracks) {
      return Playlist.findByPk(id, {
        attributes: {
          include: [[trackCountLiteral(), "trackCount"]],
        },
      });
    }

    // withTracks: include tracks, and also include trackCount
    return Playlist.findByPk(id, {
      attributes: {
        include: [[trackCountLiteral(), "trackCount"]],
      },
      include: [{ model: Track, as: "tracks", through: { attributes: ["position"] } }],
      order: [[{ model: Track, as: "tracks" }, PlaylistTrack, "position", "ASC"]],
    });
  }

  static async list() {
    return Playlist.findAll({
      attributes: {
        include: [[trackCountLiteral(), "trackCount"]],
      },
      order: [["updatedAt", "DESC"]],
    });
  }

  static async update(id, patch) {
    const playlist = await Playlist.findByPk(id);
    if (!playlist) return null;
    Object.assign(playlist, patch);
    await playlist.save();
    return playlist;
  }

  static async delete(id) {
    return sequelize.transaction(async (t) => {
      await PlaylistTrack.destroy({ where: { playlistId: id }, transaction: t });
      await Playlist.destroy({ where: { id }, transaction: t });
      return true;
    });
  }

  static async addTracks(playlistId, trackIds, { startPosition = null } = {}) {
    const ids = Array.from(new Set((trackIds || []).map(String))).filter(Boolean);

    return sequelize.transaction(async (t) => {
      const playlist = await Playlist.findByPk(playlistId, { transaction: t });
      if (!playlist) throw new Error("Playlist not found");

      let pos = startPosition;

      // If no startPosition provided, append after max existing position
      if (pos == null) {
        const max = await PlaylistTrack.max("position", { where: { playlistId }, transaction: t });
        pos = Number.isFinite(max) ? max + 1 : 1;
      }

      for (const trackId of ids) {
        const existing = await PlaylistTrack.findOne({
          where: { playlistId, trackId },
          transaction: t,
        });
        if (existing) continue;

        await PlaylistTrack.create(
          { playlistId, trackId, position: pos },
          { transaction: t }
        );
        pos += 1;
      }

      return true;
    });
  }

  static async removeTracks(playlistId, trackIds) {
    const ids = Array.from(new Set((trackIds || []).map(String))).filter(Boolean);
    if (!ids.length) return 0;
    return PlaylistTrack.destroy({ where: { playlistId, trackId: ids } });
  }
}

module.exports = { PlaylistService };
