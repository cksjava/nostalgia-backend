import { Router } from "express";
import { z } from "zod";
import { scanLibrary } from "../services/libraryScan.service";

const router = Router();

router.post("/scan", async (req, res) => {
  const schema = z.object({
    roots: z.array(z.string().min(1)).min(1),
    removeMissing: z.boolean().optional(),
    dryRun: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_BODY", details: parsed.error.flatten() });

  const result = await scanLibrary(parsed.data);
  res.json(result);
});

export default router;
