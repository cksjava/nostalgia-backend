// controllers/audioDevice.controller.js
const { AudioDeviceService } = require("../services/audioDevice.service");

class AudioDeviceController {
  static async listDevices(req, res, next) {
    try {
      const out = await AudioDeviceService.getAudioDevices();
      res.json(out);
    } catch (e) {
      next(e);
    }
  }

  static async getMpvOpts(req, res, next) {
    try {
      const opts = await AudioDeviceService.readMpvOpts();
      res.json(opts);
    } catch (e) {
      next(e);
    }
  }

  static async updateMpvOpts(req, res, next) {
    try {
      const { ao, audioDevice } = req.body || {};

      // Soft validation: if ALSA is present and devices were discovered,
      // ensure selected audioDevice is one of them. If ALSA missing (dummy),
      // don't block local dev.
      const { source, devices } = await AudioDeviceService.getAudioDevices();
      const discoveredIds = new Set((devices || []).map((d) => d.id));

      if (source !== "dummy" && audioDevice && !discoveredIds.has(String(audioDevice))) {
        return res.status(400).json({
          error: "INVALID_AUDIO_DEVICE",
          message: "audioDevice is not in the discovered ALSA device list",
          provided: audioDevice,
        });
      }

      const saved = await AudioDeviceService.writeMpvOpts({ ao, audioDevice });

      // Note: mpv instance is already started; changing mpvopts.json affects next restart/init.
      res.json({
        ok: true,
        saved: { ao: saved.ao, audioDevice: saved.audioDevice },
        path: saved.path,
      });
    } catch (e) {
      next(e);
    }
  }
}

module.exports = { AudioDeviceController };
