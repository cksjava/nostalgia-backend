const express = require("express");
const { LibraryController } = require("../controllers/library.controller");

const router = express.Router();

router.post("/scan", LibraryController.scan);

module.exports = router;
