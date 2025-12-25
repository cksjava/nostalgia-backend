import { sequelize } from "../db/sequelize";
import { Playlist } from "../models/Playlist";
import { PlaylistItem } from "../models/PlaylistItem";
import { Track } from "../models/Track";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function listPlaylists() {
  const playlists = await Playlist.findAll({ order: [["createdAt", "DESC"]] });

  const withCounts = await Promise.all(
    playlists.map(async (p) => {
      const count = await PlaylistItem.count({ where: { playlistId: p.id } });
      return { ...p.toJSON(), trackCount: count };
    })
  );

  return withCounts;
}

export async function createPlaylist(name: string) {
  const base = slugify(name) || "playlist";
  // ensure unique slug
  let slug = base;
  for (let i = 1; i < 9999; i++) {
    const exists = await Playlist.findOne({ where: { slug } });
    if (!exists) break;
    slug = `${base}-${i}`;
  }

  const pl = await Playlist.create({ name, slug });
  return pl.toJSON();
}

export async function getPlaylist(slug: string) {
  const playlist = await Playlist.findOne({ where: { slug } });
  if (!playlist) return null;

  const items = await PlaylistItem.findAll({
    where: { playlistId: playlist.id },
    include: [{ model: Track }],
    order: [["sortOrder", "ASC"]],
  });

  return {
    ...playlist.toJSON(),
    trackCount: items.length,
    items: items.map(it => ({
      id: it.id,
      sortOrder: it.sortOrder,
      track: (it as any).track?.toJSON?.() ?? null,
    })),
  };
}

export async function addTrackToPlaylist(playlistSlug: string, trackId: string) {
  const playlist = await Playlist.findOne({ where: { slug: playlistSlug } });
  if (!playlist) throw new Error("PLAYLIST_NOT_FOUND");

  const track = await Track.findByPk(trackId);
  if (!track) throw new Error("TRACK_NOT_FOUND");

  return sequelize.transaction(async (t) => {
    const max = await PlaylistItem.max("sortOrder", { where: { playlistId: playlist.id }, transaction: t });
    const sortOrder = (typeof max === "number" ? max : 0) + 1;

    const item = await PlaylistItem.create(
      { playlistId: playlist.id, trackId, sortOrder },
      { transaction: t }
    );

    return item.toJSON();
  });
}

export async function removePlaylistItem(itemId: string) {
  const deleted = await PlaylistItem.destroy({ where: { id: itemId } });
  return { deleted };
}

export async function renamePlaylist(slug: string, name: string) {
  const playlist = await Playlist.findOne({ where: { slug } });
  if (!playlist) throw new Error("PLAYLIST_NOT_FOUND");
  await playlist.update({ name });
  return playlist.toJSON();
}

export async function deletePlaylist(slug: string) {
  const playlist = await Playlist.findOne({ where: { slug } });
  if (!playlist) return { deleted: 0 };

  return sequelize.transaction(async (t) => {
    await PlaylistItem.destroy({ where: { playlistId: playlist.id }, transaction: t });
    const deleted = await Playlist.destroy({ where: { id: playlist.id }, transaction: t });
    return { deleted };
  });
}
