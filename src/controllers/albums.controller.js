const { AlbumService } = require("../services/album.service");

class AlbumsController {
  static async listOrSearch(req, res, next) {
    try {
      const search = req.query.search || "";
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const offset = req.query.offset ? Number(req.query.offset) : 0;

      const rows = await AlbumService.search(search, { limit, offset });
      res.json(rows);
    } catch (e) {
      next(e);
    }
  }

  static async getById(req, res, next) {
    try {
      const withTracks = String(req.query.withTracks || "0") === "1";
      const row = await AlbumService.getById(req.params.id, { withTracks });
      if (!row) return res.status(404).json({ error: "Album not found" });
      res.json(row);
    } catch (e) {
      next(e);
    }
  }

  static async create(req, res, next) {
    try {
      // Minimal validation (you’ll mostly create albums via scan anyway)
      if (!req.body || !req.body.title) {
        return res.status(400).json({ error: "'title' is required" });
      }
      const created = await AlbumService.create(req.body);
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  }

  static async update(req, res, next) {
    try {
      const updated = await AlbumService.update(req.params.id, req.body || {});
      if (!updated) return res.status(404).json({ error: "Album not found" });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  }

  static async remove(req, res, next) {
    try {
      await AlbumService.delete(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
}

module.exports = { AlbumsController };
