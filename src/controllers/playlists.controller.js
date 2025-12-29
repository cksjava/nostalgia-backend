const { PlaylistService } = require("../services/playlist.service");

function requireArray(body, key) {
  const v = body && body[key];
  if (!Array.isArray(v)) {
    const err = new Error(`'${key}' is required and must be an array`);
    err.status = 400;
    throw err;
  }
  return v;
}

class PlaylistsController {
  static async list(req, res, next) {
    try {
      const rows = await PlaylistService.list();
      res.json(rows);
    } catch (e) {
      next(e);
    }
  }

  static async getById(req, res, next) {
    try {
      const withTracks = String(req.query.withTracks || "0") === "1";
      const row = await PlaylistService.getById(req.params.id, { withTracks });
      if (!row) return res.status(404).json({ error: "Playlist not found" });
      res.json(row);
    } catch (e) {
      next(e);
    }
  }

  static async create(req, res, next) {
    try {
      if (!req.body || !req.body.name) {
        return res.status(400).json({ error: "'name' is required" });
      }
      const created = await PlaylistService.create(req.body);
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  }

  static async update(req, res, next) {
    try {
      const updated = await PlaylistService.update(req.params.id, req.body || {});
      if (!updated) return res.status(404).json({ error: "Playlist not found" });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  }

  static async remove(req, res, next) {
    try {
      await PlaylistService.delete(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }

  static async addTracks(req, res, next) {
    try {
      const trackIds = requireArray(req.body, "trackIds").map(String);
      const startPosition =
        req.body && req.body.startPosition != null ? Number(req.body.startPosition) : null;

      await PlaylistService.addTracks(req.params.id, trackIds, {
        startPosition: Number.isFinite(startPosition) ? startPosition : null,
      });

      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }

  static async removeTracks(req, res, next) {
    try {
      const trackIds = requireArray(req.body, "trackIds").map(String);
      const deleted = await PlaylistService.removeTracks(req.params.id, trackIds);
      res.json({ deleted });
    } catch (e) {
      next(e);
    }
  }
}

module.exports = { PlaylistsController };
