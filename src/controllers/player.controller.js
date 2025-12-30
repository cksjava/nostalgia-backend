function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function isFiniteNumber(x) {
  return typeof x === "number" && Number.isFinite(x);
}

async function ensureConnected(req, res) {
  const mpv = req.app.locals.mpv;
  if (!mpv?.connected) {
    res.status(503).json({ error: "mpv not connected" });
    return null;
  }
  return mpv;
}

/**
 * Helper: get a property safely (returns null on failure)
 */
async function getProp(mpv, name) {
  try {
    const r = await mpv.sendCommand(["get_property", name], { timeoutMs: 800 });
    return r?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * POST /api/player/pause
 * body: { paused?: boolean, toggle?: boolean }
 */
async function pause(req, res, next) {
  try {
    const mpv = await ensureConnected(req, res);
    if (!mpv) return;

    const pausedRaw = req.body?.paused;
    const toggle = !!req.body?.toggle;

    if (toggle) {
      await mpv.sendCommand(["cycle", "pause"]);
      const paused = await getProp(mpv, "pause");
      return res.json({ ok: true, mode: "toggle", paused });
    }

    if (typeof pausedRaw !== "boolean") {
      return res
        .status(400)
        .json({ error: "Provide either {toggle:true} or {paused:true|false}" });
    }

    await mpv.sendCommand(["set_property", "pause", pausedRaw]);
    const paused = await getProp(mpv, "pause");
    return res.json({ ok: true, paused: paused ?? pausedRaw });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/player/resume
 * Resumes playback if something is already loaded.
 * If nothing is loaded, returns 409 so frontend can call /tracks/:id/play instead.
 */
async function resume(req, res, next) {
  try {
    const mpv = await ensureConnected(req, res);
    if (!mpv) return;

    // If mpv has no file loaded, "pause=false" won't help.
    // We detect by checking "path" (null means nothing loaded).
    const path = await getProp(mpv, "path");
    if (!path) {
      return res.status(409).json({
        error: "Nothing loaded in mpv. Start playback with /tracks/:id/play first.",
      });
    }

    await mpv.sendCommand(["set_property", "pause", false]);
    const paused = await getProp(mpv, "pause");
    const positionSec = await getProp(mpv, "time-pos");

    return res.json({
      ok: true,
      paused: paused ?? false,
      positionSec: typeof positionSec === "number" ? positionSec : null,
      path,
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/player/state
 * Useful for frontend sync after reload/navigation.
 */
async function getState(req, res, next) {
  try {
    const mpv = await ensureConnected(req, res);
    if (!mpv) return;

    const [paused, positionSec, durationSec, volume, path] = await Promise.all([
      getProp(mpv, "pause"),
      getProp(mpv, "time-pos"),
      getProp(mpv, "duration"),
      getProp(mpv, "volume"),
      getProp(mpv, "path"),
    ]);

    return res.json({
      ok: true,
      paused: typeof paused === "boolean" ? paused : null,
      positionSec: typeof positionSec === "number" ? positionSec : null,
      durationSec: typeof durationSec === "number" ? durationSec : null,
      volume: typeof volume === "number" ? volume : null,
      path: path ? String(path) : null,
    });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/player/seek
 * body: { positionSec?: number } OR { deltaSec?: number }
 */
async function seek(req, res, next) {
  try {
    const mpv = await ensureConnected(req, res);
    if (!mpv) return;

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
      await mpv.sendCommand(["set_property", "time-pos", positionSec]);
      return res.json({ ok: true, positionSec });
    }

    await mpv.sendCommand(["seek", deltaSec, "relative"]);
    return res.json({ ok: true, deltaSec });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/player/set-volume
 * body: { volume: number } // clamped to 0..100
 */
async function setVolume(req, res, next) {
  try {
    const mpv = await ensureConnected(req, res);
    if (!mpv) return;

    const vol = Number(req.body?.volume);
    if (!Number.isFinite(vol)) {
      return res.status(400).json({ error: "volume must be a number" });
    }

    const volume = clamp(vol, 0, 100);
    await mpv.sendCommand(["set_property", "volume", volume]);

    // return actual mpv volume (it might differ if mpv clamps/rounds)
    const actual = await getProp(mpv, "volume");

    return res.json({ ok: true, volume: typeof actual === "number" ? actual : volume });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  pause,
  resume,
  getState,
  seek,
  setVolume,
};
