const express = require("express");
const { TracksController } = require("../controllers/tracks.controller");

const router = express.Router();

router.get("/", TracksController.listOrSearch);
router.get("/:id", TracksController.getById);

router.post("/", TracksController.create);
router.put("/:id", TracksController.update);
router.delete("/:id", TracksController.remove);

// Favourite toggle
router.post("/:id/favourite", TracksController.setFavourite);

// Playlist membership shortcuts
router.post("/:id/playlists/:playlistId/add", TracksController.addToPlaylist);
router.post("/:id/playlists/:playlistId/remove", TracksController.removeFromPlaylist);
router.post("/:id/play", TracksController.play);

module.exports = router;
