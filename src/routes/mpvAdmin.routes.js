// routes/mpvAdmin.routes.js
const express = require("express");
const { MpvAdminController } = require("../controllers/mpvAdmin.controller");

const router = express.Router();

router.post("/restart", MpvAdminController.restart);
router.post("/test-tone", MpvAdminController.testTone);

module.exports = router;
