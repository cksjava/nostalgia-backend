const express = require("express");
const { PlaylistsController } = require("../controllers/playlists.controller");

const router = express.Router();

router.get("/", PlaylistsController.list);
router.get("/:id", PlaylistsController.getById);
router.post("/", PlaylistsController.create);
router.put("/:id", PlaylistsController.update);
router.delete("/:id", PlaylistsController.remove);

// batch track operations
router.post("/:id/tracks/add", PlaylistsController.addTracks);
router.post("/:id/tracks/remove", PlaylistsController.removeTracks);

module.exports = router;
