// src/controllers/playerController.js

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function isFiniteNumber(x) {
  return typeof x === "number" && Number.isFinite(x);
}

async function pause(req, res, next) {
  try {
    const mpv = req.app.locals.mpv;
    if (!mpv?.connected) {
      return res.status(503).json({ error: "mpv not connected" });
    }

    // body: { paused?: boolean, toggle?: boolean }
    const pausedRaw = req.body?.paused;
    const toggle = !!req.body?.toggle;

    if (toggle) {
      // cycle pause
      await mpv.sendCommand(["cycle", "pause"]);
      return res.json({ ok: true, mode: "toggle" });
    }

    if (typeof pausedRaw !== "boolean") {
      return res.status(400).json({ error: "Provide either {toggle:true} or {paused:true|false}" });
    }

    await mpv.sendCommand(["set_property", "pause", pausedRaw]);
    return res.json({ ok: true, paused: pausedRaw });
  } catch (e) {
    next(e);
  }
}

async function seek(req, res, next) {
  try {
    const mpv = req.app.locals.mpv;
    if (!mpv?.connected) {
      return res.status(503).json({ error: "mpv not connected" });
    }

    // body: { positionSec?: number } for absolute
    // OR   { deltaSec?: number } for relative
    const positionSec = req.body?.positionSec;
    const deltaSec = req.body?.deltaSec;

    const hasPos = isFiniteNumber(positionSec);
    const hasDelta = isFiniteNumber(deltaSec);

    if (hasPos === hasDelta) {
      return res.status(400).json({
        error: "Provide exactly one of {positionSec:number} OR {deltaSec:number}",
      });
    }

    if (hasPos) {
      // absolute
      await mpv.sendCommand(["set_property", "time-pos", positionSec]);
      return res.json({ ok: true, positionSec });
    }

    // relative seek: positive/negative seconds
    // mpv command: seek <seconds> relative
    await mpv.sendCommand(["seek", deltaSec, "relative"]);
    return res.json({ ok: true, deltaSec });
  } catch (e) {
    next(e);
  }
}

async function setVolume(req, res, next) {
  try {
    const mpv = req.app.locals.mpv;
    if (!mpv?.connected) {
      return res.status(503).json({ error: "mpv not connected" });
    }

    // body: { volume: number } (0..100 normally, but mpv can accept >100; we clamp to 0..100)
    const vol = Number(req.body?.volume);

    if (!Number.isFinite(vol)) {
      return res.status(400).json({ error: "volume must be a number" });
    }

    const volume = clamp(vol, 0, 100);

    await mpv.sendCommand(["set_property", "volume", volume]);
    return res.json({ ok: true, volume });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  pause,
  seek,
  setVolume,
};
