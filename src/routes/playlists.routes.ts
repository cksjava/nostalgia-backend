import { Router } from "express";
import { z } from "zod";
import {
  addTrackToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylist,
  listPlaylists,
  removePlaylistItem,
  renamePlaylist,
} from "../services/playlists.service";

const router = Router();

router.get("/", async (_req, res) => {
  res.json(await listPlaylists());
});

router.post("/", async (req, res) => {
  const schema = z.object({ name: z.string().min(1).max(300) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_BODY" });

  res.json(await createPlaylist(parsed.data.name));
});

router.get("/:slug", async (req, res) => {
  const pl = await getPlaylist(req.params.slug);
  if (!pl) return res.status(404).json({ error: "PLAYLIST_NOT_FOUND" });
  res.json(pl);
});

router.patch("/:slug", async (req, res) => {
  const schema = z.object({ name: z.string().min(1).max(300) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_BODY" });

  try {
    res.json(await renamePlaylist(req.params.slug, parsed.data.name));
  } catch (e: any) {
    if (String(e?.message) === "PLAYLIST_NOT_FOUND") return res.status(404).json({ error: "PLAYLIST_NOT_FOUND" });
    throw e;
  }
});

router.delete("/:slug", async (req, res) => {
  res.json(await deletePlaylist(req.params.slug));
});

router.post("/:slug/tracks", async (req, res) => {
  const schema = z.object({ trackId: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_BODY" });

  try {
    res.json(await addTrackToPlaylist(req.params.slug, parsed.data.trackId));
  } catch (e: any) {
    const msg = String(e?.message);
    if (msg === "PLAYLIST_NOT_FOUND") return res.status(404).json({ error: "PLAYLIST_NOT_FOUND" });
    if (msg === "TRACK_NOT_FOUND") return res.status(404).json({ error: "TRACK_NOT_FOUND" });
    throw e;
  }
});

router.delete("/items/:itemId", async (req, res) => {
  res.json(await removePlaylistItem(req.params.itemId));
});

export default router;
