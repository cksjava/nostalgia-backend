import { Router } from "express";
import { z } from "zod";
import { getAlbumPlayOrder } from "../services/play.service";

const router = Router();

router.get("/album/:slug", async (req, res) => {
  const schema = z.object({
    mode: z.enum(["sequential", "shuffle"]).optional(),
  });

  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_QUERY" });

  const mode = parsed.data.mode ?? "sequential";

  const plan = await getAlbumPlayOrder(req.params.slug, mode);
  if (!plan) return res.status(404).json({ error: "ALBUM_NOT_FOUND" });

  res.json(plan);
});

export default router;
