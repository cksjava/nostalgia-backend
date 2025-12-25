import { Album } from "../models/Album";
import { Track } from "../models/Track";
import { shuffleInPlace } from "../utils/shuffle";

export type PlayAlbumMode = "sequential" | "shuffle";

export async function getAlbumPlayOrder(slug: string, mode: PlayAlbumMode) {
  const album = await Album.findOne({ where: { slug } });
  if (!album) return null;

  const tracks = await Track.findAll({
    where: { albumId: album.id },
    order: [
      ["discNo", "ASC"],
      ["trackNo", "ASC"],
      ["title", "ASC"],
    ],
  });

  const list = tracks.map(t => t.toJSON());

  if (mode === "shuffle") shuffleInPlace(list);

  // Returning the concrete play order (each item includes sourceType/sourceRef)
  return {
    album: album.toJSON(),
    mode,
    items: list,
  };
}
