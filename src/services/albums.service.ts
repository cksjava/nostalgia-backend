import { Album } from "../models/Album";
import { Track } from "../models/Track";

export async function listAlbums() {
  const albums = await Album.findAll({
    order: [["title", "ASC"]],
  });

  // trackCount is derived (don’t store)
  const withCounts = await Promise.all(
    albums.map(async (a) => {
      const count = await Track.count({ where: { albumId: a.id } });
      return { ...a.toJSON(), trackCount: count };
    })
  );

  return withCounts;
}

export async function getAlbumBySlug(slug: string) {
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

  return { ...album.toJSON(), tracks: tracks.map(t => t.toJSON()) };
}
