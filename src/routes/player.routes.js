const express = require("express");
const {
  pause,
  resume,
  getState,
  seek,
  setVolume,
} = require("../controllers/player.controller");

const router = express.Router();

/**
 * GET /api/player/state
 */
router.get("/state", getState);

/**
 * POST /api/player/pause
 * body: { toggle: true } OR { paused: true|false }
 */
router.post("/pause", pause);

/**
 * POST /api/player/resume
 * resumes if something already loaded; else 409
 */
router.post("/resume", resume);

/**
 * POST /api/player/seek
 * body: { positionSec: number } OR { deltaSec: number }
 */
router.post("/seek", seek);

/**
 * POST /api/player/set-volume
 * body: { volume: number }  // clamped to 0..100
 */
router.post("/set-volume", setVolume);

module.exports = router;
