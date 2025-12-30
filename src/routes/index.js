const express = require("express");

const settingsRouter = require("./settings.routes");
const albumsRouter = require("./albums.routes");
const tracksRouter = require("./tracks.routes");
const playlistsRouter = require("./playlists.routes");
const libraryRouter = require("./library.routes");
const playerRouter = require("./player.routes");
const audioRoutes = require("./audioDevice.routes");
const mpvAdminRoutes = require("./mpvAdmin.routes");

const apiRouter = express.Router();

apiRouter.use("/settings", settingsRouter);
apiRouter.use("/albums", albumsRouter);
apiRouter.use("/tracks", tracksRouter);
apiRouter.use("/playlists", playlistsRouter);
apiRouter.use("/library", libraryRouter);
apiRouter.use("/player", playerRouter);
apiRouter.use("/audio", audioRoutes);
apiRouter.use("/mpv", mpvAdminRoutes);

module.exports = { apiRouter };
