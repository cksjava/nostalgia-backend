// controllers/mpvAdmin.controller.js
const { MpvManagerService } = require("../services/mpvManager.service");

class MpvAdminController {
  static async restart(req, res, next) {
    try {
      const mpv = await MpvManagerService.restart();
      res.json({ ok: true, state: mpv?.getState?.() ?? null });
    } catch (e) {
      next(e);
    }
  }

  static async testTone(req, res, next) {
    try {
      const freq = req.body?.freq ?? 440;
      const seconds = req.body?.seconds ?? 2;
      const volume = req.body?.volume ?? 90;

      const out = await MpvManagerService.playTestTone({ freq, seconds, volume });
      res.json(out);
    } catch (e) {
      next(e);
    }
  }
}

module.exports = { MpvAdminController };
