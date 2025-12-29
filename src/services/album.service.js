"use strict";

const { Album, Track, sequelize } = require("../models");
const { Op } = require("sequelize");

function trackCountLiteral() {
  // Track table name (Sequelize-safe)
  const trTable = Track.getTableName();
  const trackTable = typeof trTable === "string" ? trTable : trTable.tableName;

  // Album model alias in queries is typically "Album"
  return sequelize.literal(
    `(SELECT COUNT(*) FROM "${trackTable}" AS t WHERE t.albumId = "Album"."id")`
  );
}

class AlbumService {
  static async create(data) {
    return Album.create(data);
  }

  static async getById(id, { withTracks = false } = {}) {
    if (!withTracks) {
      return Album.findByPk(id, {
        attributes: {
          include: [[trackCountLiteral(), "trackCount"]],
        },
      });
    }

    return Album.findByPk(id, {
      attributes: {
        include: [[trackCountLiteral(), "trackCount"]],
      },
      include: [{ model: Track, as: "tracks" }],
      // Optional: stable ordering for tracks if you want
      order: [[{ model: Track, as: "tracks" }, "discNo", "ASC"], [{ model: Track, as: "tracks" }, "trackNo", "ASC"]],
    });
  }

  static async update(id, patch) {
    const album = await Album.findByPk(id);
    if (!album) return null;
    Object.assign(album, patch);
    await album.save();
    return album;
  }

  static async delete(id) {
    return sequelize.transaction(async (t) => {
      // Tracks remain, but their albumId becomes null (per FK onDelete SET NULL)
      await Album.destroy({ where: { id }, transaction: t });
      return true;
    });
  }

  static async search(keyword, { limit = 50, offset = 0 } = {}) {
    const q = String(keyword || "").trim();

    if (!q) {
      return Album.findAll({
        limit,
        offset,
        attributes: {
          include: [[trackCountLiteral(), "trackCount"]],
        },
        order: [["updatedAt", "DESC"]],
      });
    }

    const like = `%${q}%`;
    return Album.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: like } },
          { albumArtist: { [Op.like]: like } },
          // NOTE: albumArtists is JSON text; LIKE works fine for basic search
          { albumArtists: { [Op.like]: like } },
        ],
      },
      limit,
      offset,
      attributes: {
        include: [[trackCountLiteral(), "trackCount"]],
      },
      order: [["title", "ASC"]],
    });
  }
}

module.exports = { AlbumService };
