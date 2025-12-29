const { SettingService } = require("../services/setting.service");

function requireString(body, key) {
  const v = body && body[key];
  if (typeof v !== "string" || !v.trim()) {
    const err = new Error(`'${key}' is required and must be a non-empty string`);
    err.status = 400;
    throw err;
  }
  return v.trim();
}

class SettingsController {
  static async getAll(req, res, next) {
    try {
      const rows = await SettingService.getAll();
      res.json(rows);
    } catch (e) {
      next(e);
    }
  }

  static async getByName(req, res, next) {
    try {
      const row = await SettingService.getByName(req.params.name);
      if (!row) return res.status(404).json({ error: "Setting not found" });
      res.json(row);
    } catch (e) {
      next(e);
    }
  }

  static async upsertByName(req, res, next) {
    try {
      const name = req.params.name;
      const value = req.body ? req.body.value : null;
      const row = await SettingService.upsert(name, value);
      res.json(row);
    } catch (e) {
      next(e);
    }
  }

  static async deleteByName(req, res, next) {
    try {
      const name = req.params.name;
      const deletedCount = await SettingService.delete(name);
      res.json({ deleted: deletedCount });
    } catch (e) {
      next(e);
    }
  }

  static async addMusicFolder(req, res, next) {
    try {
      const folder = requireString(req.body, "folder");
      const row = await SettingService.addMusicFolder(folder);
      res.json(row);
    } catch (e) {
      next(e);
    }
  }

  static async removeMusicFolder(req, res, next) {
    try {
      const folder = requireString(req.body, "folder");
      const row = await SettingService.removeMusicFolder(folder);
      if (!row) return res.status(404).json({ error: "Setting music.folders not found" });
      res.json(row);
    } catch (e) {
      next(e);
    }
  }

  static async addMusicExtension(req, res, next) {
    try {
      const extension = requireString(req.body, "extension");
      const row = await SettingService.addMusicExtension(extension);
      res.json(row);
    } catch (e) {
      next(e);
    }
  }

  static async removeMusicExtension(req, res, next) {
    try {
      const extension = requireString(req.body, "extension");
      const row = await SettingService.removeMusicExtension(extension);
      if (!row) return res.status(404).json({ error: "Setting music.extensions not found" });
      res.json(row);
    } catch (e) {
      next(e);
    }
  }
}

module.exports = { SettingsController };
