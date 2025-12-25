import { Router } from "express";
import { listAlbums, getAlbumBySlug } from "../services/albums.service";

const router = Router();

router.get("/", async (_req, res) => {
  const albums = await listAlbums();
  res.json(albums);
});

router.get("/:slug", async (req, res) => {
  const album = await getAlbumBySlug(req.params.slug);
  if (!album) return res.status(404).json({ error: "ALBUM_NOT_FOUND" });
  res.json(album);
});

export default router;
