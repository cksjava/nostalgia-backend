// src/routes/playerRoutes.js

const express = require("express");
const { pause, seek, setVolume } = require("../controllers/player.controller");

const router = express.Router();

/**
 * POST /api/player/pause
 * body: { toggle: true } OR { paused: true|false }
 */
router.post("/pause", pause);

/**
 * POST /api/player/seek
 * body: { positionSec: number } OR { deltaSec: number }
 */
router.post("/seek", seek);

/**
 * POST /api/player/volume
 * body: { volume: number }  // clamped to 0..100
 */
router.post("/volume", setVolume);

module.exports = router;
