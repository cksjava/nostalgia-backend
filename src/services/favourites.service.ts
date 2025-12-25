import { Favourite } from "../models/Favourite";
import { Track } from "../models/Track";

export async function listFavourites() {
  const favs = await Favourite.findAll({
    include: [{ model: Track }],
    order: [["createdAt", "DESC"]],
  });

  return favs.map(f => ({
    id: f.id,
    trackId: f.trackId,
    favouritedAt: f.favouritedAt,
    track: (f as any).track?.toJSON?.() ?? null,
  }));
}

export async function addFavourite(trackId: string) {
  // idempotent
  const existing = await Favourite.findOne({ where: { trackId } });
  if (existing) return existing;

  // validate track exists
  const t = await Track.findByPk(trackId);
  if (!t) throw new Error("TRACK_NOT_FOUND");

  return Favourite.create({ trackId });
}

export async function removeFavourite(trackId: string) {
  const deleted = await Favourite.destroy({ where: { trackId } });
  return { deleted };
}
