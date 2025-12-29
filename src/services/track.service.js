"use strict";

const { Track, Album, Playlist, PlaylistTrack, sequelize } = require("../models");
const { Op } = require("sequelize");

class TrackService {
  // ---- CRUD ----
  static async create(data) {
    return Track.create(data);
  }

  static async getById(id, { withAlbum = false, withPlaylists = false } = {}) {
    const include = [];
    if (withAlbum) include.push({ model: Album, as: "album" });
    if (withPlaylists) include.push({ model: Playlist, as: "playlists", through: { attributes: ["position"] } });
    return Track.findByPk(id, include.length ? { include } : undefined);
  }

  static async update(id, patch) {
    const track = await Track.findByPk(id);
    if (!track) return null;
    Object.assign(track, patch);
    await track.save();
    return track;
  }

  static async delete(id) {
    return sequelize.transaction(async (t) => {
      await PlaylistTrack.destroy({ where: { trackId: id }, transaction: t });
      await Track.destroy({ where: { id }, transaction: t });
      return true;
    });
  }

  // ---- Actions ----
  static async setFavourite(trackId, isFavourite) {
    const track = await Track.findByPk(trackId);
    if (!track) return null;
    track.isFavourite = !!isFavourite;
    await track.save();
    return track;
  }

  static async search(keyword, { limit = 100, offset = 0, favourite = null, withAlbum = false } = {}) {
    const q = String(keyword || "").trim();

    const where = {};

    // NEW: favourites filter
    if (favourite === 1) where.isFavourite = true;
    else if (favourite === 0) where.isFavourite = false;

    if (q) {
      const like = `%${q}%`;
      where[Op.or] = [
        { title: { [Op.like]: like } },
        { trackArtist: { [Op.like]: like } },
        { albumArtist: { [Op.like]: like } },
        { filePath: { [Op.like]: like } },
      ];
    }

    return Track.findAll({
      where,
      limit,
      offset,
      include: withAlbum ? [{ model: Album, as: "album" }] : [],
      // If withAlbum, give a stable ordering; otherwise match previous behavior
      order: q ? [["title", "ASC"]] : [["updatedAt", "DESC"]],
    });
  }

  static async addToPlaylist(trackId, playlistId, { position = null } = {}) {
    return sequelize.transaction(async (t) => {
      // Ensure track + playlist exist (optional but helpful)
      const track = await Track.findByPk(trackId, { transaction: t });
      if (!track) throw new Error("Track not found");
      const playlist = await Playlist.findByPk(playlistId, { transaction: t });
      if (!playlist) throw new Error("Playlist not found");

      // Upsert membership (unique constraint on playlistId+trackId)
      const existing = await PlaylistTrack.findOne({
        where: { trackId, playlistId },
        transaction: t,
      });

      if (existing) {
        if (position != null) {
          existing.position = position;
          await existing.save({ transaction: t });
        }
        return existing;
      }

      return PlaylistTrack.create(
        { trackId, playlistId, position },
        { transaction: t }
      );
    });
  }

  static async removeFromPlaylist(trackId, playlistId) {
    return PlaylistTrack.destroy({ where: { trackId, playlistId } });
  }

  static async playTrackById(trackId, opts) {
    // TODO: find track filePath from DB, then send command to mpv
    // For now, just validate existence:
    const t = await Track.findByPk(trackId);
    if (!t) throw new Error("Track not found");

    // placeholder
    return { ok: true };
  }

}

module.exports = { TrackService };
