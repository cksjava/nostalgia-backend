const express = require("express");

const settingsRouter = require("./settings.routes");
const albumsRouter = require("./albums.routes");
const tracksRouter = require("./tracks.routes");
const playlistsRouter = require("./playlists.routes");
const libraryRouter = require("./library.routes");

const apiRouter = express.Router();

apiRouter.use("/settings", settingsRouter);
apiRouter.use("/albums", albumsRouter);
apiRouter.use("/tracks", tracksRouter);
apiRouter.use("/playlists", playlistsRouter);
apiRouter.use("/library", libraryRouter);

module.exports = { apiRouter };
