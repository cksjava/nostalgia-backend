import { Router } from "express";
import libraryRoutes from "./library.routes";
import albumsRoutes from "./albums.routes";
import playRoutes from "./play.routes";
import favouritesRoutes from "./favourites.routes";
import playlistsRoutes from "./playlists.routes";

const router = Router();

router.use("/library", libraryRoutes);
router.use("/albums", albumsRoutes);
router.use("/play", playRoutes);
router.use("/favourites", favouritesRoutes);
router.use("/playlists", playlistsRoutes);

export default router;
