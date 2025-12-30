// routes/audioDevice.routes.js
const express = require("express");
const { AudioDeviceController } = require("../controllers/audioDevice.controller");

const router = express.Router();

// List ALSA devices (or dummy if not available)
router.get("/devices", AudioDeviceController.listDevices);

// Read / update mpvopts.json (ao + audioDevice)
router.get("/mpvopts", AudioDeviceController.getMpvOpts);
router.put("/mpvopts", AudioDeviceController.updateMpvOpts);

module.exports = router; // default export style (CommonJS)
