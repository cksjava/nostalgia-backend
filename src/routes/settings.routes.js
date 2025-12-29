const express = require("express");
const { SettingsController } = require("../controllers/settings.controller");

const router = express.Router();

// NOTE: keep these BEFORE "/:name" routes to avoid path conflicts
router.post("/music/folders/add", SettingsController.addMusicFolder);
router.post("/music/folders/remove", SettingsController.removeMusicFolder);
router.post("/music/extensions/add", SettingsController.addMusicExtension);
router.post("/music/extensions/remove", SettingsController.removeMusicExtension);

// CRUD
router.get("/", SettingsController.getAll);
router.get("/:name", SettingsController.getByName);
router.put("/:name", SettingsController.upsertByName);
router.delete("/:name", SettingsController.deleteByName);

module.exports = router;
