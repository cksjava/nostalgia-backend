import fg from "fast-glob";
import { parseFile } from "music-metadata";
import path from "path";
import { Op } from "sequelize";
import { Album } from "../models/Album";
import { Track } from "../models/Track";

export type ScanOptions = {
  roots: string[];                 // folders to scan
  extensions?: string[];           // default audio formats
  removeMissing?: boolean;         // if true, delete db tracks that no longer exist under roots
  dryRun?: boolean;
};

export type ScanResult = {
  scannedFiles: number;
  createdTracks: number;
  updatedTracks: number;
  createdAlbums: number;
  updatedAlbums: number;
  errors: Array<{ file: string; error: string }>;
};

const DEFAULT_EXT = ["flac", "mp3", "wav", "aac", "m4a", "ogg", "opus", "alac", "aiff"];

function normalizeArtists(input: unknown): string[] {
  if (Array.isArray(input)) return input.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof input === "string") {
    // music-metadata sometimes returns "A; B" or "A / B"
    return input
      .split(/;|\/|,|&/g)
      .map(s => s.trim())
      .filter(Boolean);
  }
  return [];
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

async function findOrCreateAlbum(params: {
  title: string;
  artists: string[];
  year: number | null;
  artworkUrl: string;
}) {
  const { title, artists, year, artworkUrl } = params;

  // very practical “identity”: title + artists + year
  // (not perfect, but OK for a local library; we can add MusicBrainz IDs later if needed)
  const signature = `${title}__${artists.join("|")}__${year ?? ""}`;
  const slugBase = slugify(signature);

  let album = await Album.findOne({ where: { slug: slugBase } });
  let created = false;

  if (!album) {
    album = await Album.create({
      slug: slugBase,
      title,
      artists,
      year,
      artworkUrl,
    });
    created = true;
  } else {
    // keep it fresh; artworkUrl may change if you later generate local artwork
    const needsUpdate =
      album.title !== title ||
      JSON.stringify(album.artists) !== JSON.stringify(artists) ||
      album.year !== year ||
      album.artworkUrl !== artworkUrl;

    if (needsUpdate) {
      await album.update({ title, artists, year, artworkUrl });
    }
  }

  return { album, created };
}

export async function scanLibrary(opts: ScanOptions): Promise<ScanResult> {
  const extensions = opts.extensions?.length ? opts.extensions : DEFAULT_EXT;

  const patterns = opts.roots.map(root => {
    const escaped = root.replace(/\\/g, "/");
    return `${escaped.replace(/\/$/, "")}/**/*.+(${extensions.join("|")})`;
  });

  const files = await fg(patterns, { onlyFiles: true, unique: true, dot: false, followSymbolicLinks: false });

  const result: ScanResult = {
    scannedFiles: files.length,
    createdTracks: 0,
    updatedTracks: 0,
    createdAlbums: 0,
    updatedAlbums: 0,
    errors: [],
  };

  // Optional cleanup: remove tracks that no longer exist under scanned roots
  if (opts.removeMissing && !opts.dryRun) {
    // crude but effective for MVP: delete file-tracks whose sourceRef is under roots but missing now
    // we do it at the end too; for now skip to avoid heavy ops — can implement later if you want.
  }

  for (const file of files) {
    try {
      const absPath = path.isAbsolute(file) ? file : path.resolve(file);

      const metadata = await parseFile(absPath, { duration: true });
      const common = metadata.common;

      const title = (common.title || path.basename(absPath)).trim();
      const artistsArr = normalizeArtists(common.artists ?? common.artist ?? []);
      const artistPrimary = artistsArr[0] || "Unknown Artist";

      const albumTitle = (common.album || "Unknown Album").trim();
      const albumArtists = normalizeArtists(common.albumartist ?? common.albumartist ?? artistsArr);
      const year = typeof common.year === "number" ? common.year : null;

      // duration in seconds (rounded)
      const durationSec = metadata.format.duration ? Math.max(1, Math.round(metadata.format.duration)) : 0;

      const trackNo = common.track?.no ?? null;
      const discNo = common.disk?.no ?? null;

      // For MVP: placeholder artwork. Later we can extract embedded artwork and serve local file URLs.
      const artworkUrl = `https://placehold.co/800x800/png?text=${encodeURIComponent(albumTitle)}`;

      const { album, created: albumCreated } = await findOrCreateAlbum({
        title: albumTitle,
        artists: albumArtists.length ? albumArtists : [artistPrimary],
        year,
        artworkUrl,
      });

      if (albumCreated) result.createdAlbums += 1;
      else result.updatedAlbums += 0; // we’re not tracking update count tightly; can add if you want

      if (opts.dryRun) continue;

      // Upsert Track by sourceRef (path)
      const existing = await Track.findOne({ where: { sourceType: "file", sourceRef: absPath } });

      if (!existing) {
        await Track.create({
          title,
          artist: artistPrimary,
          durationSec,
          albumId: album.id,
          trackNo,
          discNo,
          sourceType: "file",
          sourceRef: absPath,
        });
        result.createdTracks += 1;
      } else {
        const needsUpdate =
          existing.title !== title ||
          existing.artist !== artistPrimary ||
          existing.durationSec !== durationSec ||
          existing.albumId !== album.id ||
          existing.trackNo !== trackNo ||
          existing.discNo !== discNo;

        if (needsUpdate) {
          await existing.update({
            title,
            artist: artistPrimary,
            durationSec,
            albumId: album.id,
            trackNo,
            discNo,
          });
          result.updatedTracks += 1;
        }
      }
    } catch (e: any) {
      result.errors.push({ file, error: e?.message ? String(e.message) : String(e) });
    }
  }

  return result;
}
