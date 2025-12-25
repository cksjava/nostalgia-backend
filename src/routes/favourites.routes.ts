import { Router } from "express";
import { z } from "zod";
import { addFavourite, listFavourites, removeFavourite } from "../services/favourites.service";

const router = Router();

router.get("/", async (_req, res) => {
  const favs = await listFavourites();
  res.json(favs);
});

router.post("/", async (req, res) => {
  const schema = z.object({ trackId: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_BODY" });

  try {
    const fav = await addFavourite(parsed.data.trackId);
    res.json(fav);
  } catch (e: any) {
    if (String(e?.message) === "TRACK_NOT_FOUND") return res.status(404).json({ error: "TRACK_NOT_FOUND" });
    throw e;
  }
});

router.delete("/:trackId", async (req, res) => {
  const out = await removeFavourite(req.params.trackId);
  res.json(out);
});

export default router;
