// services/mpvManager.service.js
const { createMpvIpc } = require("./mpvIpc");
const { AudioDeviceService } = require("./audioDevice.service");

class MpvManagerService {
  static _mpv = null;
  static _restarting = null;

  static get() {
    return this._mpv;
  }

  static async startFromConfig() {
    const opts = await AudioDeviceService.readMpvOpts();

    // create + start
    const mpv = createMpvIpc({
      ao: opts.ao || "alsa",
      audioDevice: opts.audioDevice || "alsa/default",
    });

    mpv.start();

    // optional wait until connected (best effort)
    try {
      await mpv.waitUntilConnected();
    } catch (e) {
      // don’t crash startup if IPC is a bit slow
      console.error(e?.message || e);
    }

    this._mpv = mpv;
    return mpv;
  }

  static async stop() {
    if (!this._mpv) return;
    try {
      await this._mpv.stop();
    } catch (e) {
      // ignore shutdown errors
    } finally {
      this._mpv = null;
    }
  }

  static async restart() {
    // ensure only one restart at a time
    if (this._restarting) return this._restarting;

    this._restarting = (async () => {
      const prev = this._mpv;

      // stop previous
      if (prev) {
        try {
          await prev.stop();
        } catch {}
      }

      // start new from updated mpvopts.json
      const next = await this.startFromConfig();

      return next;
    })();

    try {
      return await this._restarting;
    } finally {
      this._restarting = null;
    }
  }

  /**
   * Plays a short sine tone via lavfi. Works on Pi MPV builds with FFmpeg/lavfi.
   * If lavfi isn't available, it will throw and controller returns 500.
   */
  static async playTestTone({ freq = 440, seconds = 2, volume = 90 } = {}) {
    const mpv = this._mpv;
    if (!mpv) throw new Error("MPV_NOT_RUNNING");

    // Most mpv IPC wrappers expose a 'command' method.
    // If yours differs, adjust here in ONE place.
    const cmd = mpv.command?.bind(mpv);
    if (!cmd) throw new Error("MPV_IPC_COMMAND_NOT_SUPPORTED");

    // set volume (best effort)
    try {
      await cmd(["set_property", "volume", Number(volume)]);
    } catch {}

    // load lavfi sine as audio-only
    const url = `lavfi://sine=frequency=${Number(freq)}:duration=${Number(seconds)}`;
    await cmd(["loadfile", url, "replace"]);

    // ensure no video
    try {
      await cmd(["set_property", "vid", "no"]);
    } catch {}

    return { ok: true, freq: Number(freq), seconds: Number(seconds), volume: Number(volume) };
  }
}

module.exports = { MpvManagerService };
