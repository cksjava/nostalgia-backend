const { TrackService } = require("../services/track.service");

function requireBoolean(body, key) {
  const v = body && body[key];
  if (typeof v !== "boolean") {
    const err = new Error(`'${key}' is required and must be boolean`);
    err.status = 400;
    throw err;
  }
  return v;
}

class TracksController {
  static async listOrSearch(req, res, next) {
    try {
      const search = req.query.search || "";
      const limit = req.query.limit ? Number(req.query.limit) : 100;
      const offset = req.query.offset ? Number(req.query.offset) : 0;

      // NEW:
      const favourite = req.query.favourite != null ? Number(req.query.favourite) : null; // 1/0 or null
      const withAlbum = req.query.withAlbum ? Number(req.query.withAlbum) === 1 : false;

      const rows = await TrackService.search(search, {
        limit,
        offset,
        favourite,
        withAlbum,
      });

      res.json(rows);
    } catch (e) {
      next(e);
    }
  }

  static async getById(req, res, next) {
    try {
      const withAlbum = String(req.query.withAlbum || "0") === "1";
      const withPlaylists = String(req.query.withPlaylists || "0") === "1";

      const row = await TrackService.getById(req.params.id, { withAlbum, withPlaylists });
      if (!row) return res.status(404).json({ error: "Track not found" });
      res.json(row);
    } catch (e) {
      next(e);
    }
  }

  static async create(req, res, next) {
    try {
      if (!req.body || !req.body.title || !req.body.filePath) {
        return res.status(400).json({ error: "'title' and 'filePath' are required" });
      }
      const created = await TrackService.create(req.body);
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  }

  static async update(req, res, next) {
    try {
      const updated = await TrackService.update(req.params.id, req.body || {});
      if (!updated) return res.status(404).json({ error: "Track not found" });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  }

  static async remove(req, res, next) {
    try {
      await TrackService.delete(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }

  static async setFavourite(req, res, next) {
    try {
      const isFavourite = requireBoolean(req.body, "isFavourite");
      const updated = await TrackService.setFavourite(req.params.id, isFavourite);
      if (!updated) return res.status(404).json({ error: "Track not found" });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  }

  static async addToPlaylist(req, res, next) {
    try {
      const position =
        req.body && req.body.position != null ? Number(req.body.position) : null;

      const row = await TrackService.addToPlaylist(req.params.id, req.params.playlistId, {
        position: Number.isFinite(position) ? position : null,
      });

      res.json(row);
    } catch (e) {
      next(e);
    }
  }

  static async removeFromPlaylist(req, res, next) {
    try {
      const deleted = await TrackService.removeFromPlaylist(req.params.id, req.params.playlistId);
      res.json({ deleted });
    } catch (e) {
      next(e);
    }
  }

  static async play(req, res, next) {
    try {
      const id = String(req.params.id);
      const positionSec = req.body?.positionSec != null ? Number(req.body.positionSec) : 0;

      const result = await TrackService.playTrackById(id, { positionSec });
      res.json(result); // { ok: true }
    } catch (e) {
      next(e);
    }
  }

}

module.exports = { TracksController };
