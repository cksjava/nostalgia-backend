const express = require("express");
const { AlbumsController } = require("../controllers/albums.controller");

const router = express.Router();

router.get("/", AlbumsController.listOrSearch);
router.get("/:id", AlbumsController.getById);
router.post("/", AlbumsController.create);
router.put("/:id", AlbumsController.update);
router.delete("/:id", AlbumsController.remove);

module.exports = router;
