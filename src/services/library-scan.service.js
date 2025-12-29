"use strict";

const path = require("path");
const fs = require("fs/promises");
const fg = require("fast-glob");
const mm = require("music-metadata");
const { Op } = require("sequelize");
const crypto = require("crypto");

const { Album, Track, sequelize } = require("../models");
const { SettingService } = require("./setting.service");
const { csvToArray, normalizeExtension } = require("../utils/normalize");

const COVER_DIR_ABS = path.join(process.cwd(), "storage", "covers"); // backend project root/storage/covers
const COVER_DIR_REL = path.join("covers"); // stored in DB as "covers/<file>"

function normalizeBaseUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  return s.replace(/\/+$/, ""); // strip trailing slashes
}

function safeStr(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function toJsonText(arr) {
  if (!arr || !arr.length) return null;
  try {
    return JSON.stringify(arr.map((x) => String(x).trim()).filter(Boolean));
  } catch {
    return null;
  }
}

function safeJsonArray(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    if (Array.isArray(parsed)) return parsed.map((x) => String(x).trim()).filter(Boolean);
    return [];
  } catch {
    return [];
  }
}

function uniqInsensitive(arr) {
  const seen = new Set();
  const out = [];
  for (const v of arr) {
    const s = String(v || "").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function pickYear(common) {
  const y = common && (common.year || common.date);
  if (!y) return null;
  const m = String(y).match(/\d{4}/);
  return m ? Number(m[0]) : null;
}

async function statFile(filePath) {
  const st = await fs.stat(filePath);
  return {
    size: st.size,
    mtimeMs: Math.floor(st.mtimeMs),
  };
}

async function ensureCoverDir() {
  await fs.mkdir(COVER_DIR_ABS, { recursive: true });
}

function pickEmbeddedPicture(metadata) {
  // music-metadata standard place
  const pics = metadata && metadata.common && Array.isArray(metadata.common.picture)
    ? metadata.common.picture
    : [];
  if (pics.length) return pics[0];

  // fallback: sometimes pictures are in native tags; keep it simple for now
  return null;
}

function extFromMime(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  return "jpg"; // default
}

function sha1(input) {
  return crypto.createHash("sha1").update(String(input)).digest("hex");
}

async function writeCoverIfNeeded({ album, picture, dryRun, transaction, publicBaseUrl }) {
  if (!album || album.coverArtPath) return false;
  if (!picture || !picture.data || !picture.data.length) return false;

  const mime = picture.format || picture.type || picture.mime;
  const ext = extFromMime(mime);
  const bytes = picture.data; // Buffer
  const bytesHash = sha1(bytes);
  const filename = `${album.id}-${bytesHash}.${ext}`;

  const absPath = path.join(COVER_DIR_ABS, filename);

  if (!dryRun) {
    await ensureCoverDir();

    try {
      await fs.access(absPath);
    } catch {
      await fs.writeFile(absPath, bytes);
    }

    // Store full URL so frontend can render directly
    const base = normalizeBaseUrl(publicBaseUrl || process.env.PUBLIC_BASE_URL);
    const fullUrl = base ? `${base}/covers/${encodeURIComponent(filename)}` : `/covers/${filename}`;

    await album.update({ coverArtPath: fullUrl }, { transaction });
  }

  return true;
}

async function findOrCreateAlbum({
  t,
  dryRun,
  albumTitle,
  year,
  genre,
  albumArtist,
  albumArtistsArr,
  sourcePath,
  report,
}) {
  const wherePrimary = {
    title: albumTitle,
    year: year || null,
    sourcePath: sourcePath || null,
  };

  let album = await Album.findOne({ where: wherePrimary, transaction: t });

  if (!album) {
    const whereFallback = { title: albumTitle, year: year || null };
    album = await Album.findOne({ where: whereFallback, transaction: t });
  }

  if (!album) {
    if (!dryRun) {
      album = await Album.create(
        {
          title: albumTitle,
          albumArtist: albumArtist,
          albumArtists: toJsonText(albumArtistsArr),
          year,
          genre,
          sourcePath,
          coverArtPath: null,
        },
        { transaction: t }
      );
    }
    report.createdAlbums += 1;
    return album || null;
  }

  const patch = {};
  if (!album.sourcePath && sourcePath) patch.sourcePath = sourcePath;
  if ((album.year == null || album.year === 0) && year) patch.year = year;
  if (!album.genre && genre) patch.genre = genre;
  if (!album.albumArtist && albumArtist) patch.albumArtist = albumArtist;

  const existingArtists = safeJsonArray(album.albumArtists);
  const incomingArtists = Array.isArray(albumArtistsArr)
    ? albumArtistsArr.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const merged = uniqInsensitive([...existingArtists, ...incomingArtists, albumArtist].filter(Boolean));
  const mergedJson = merged.length ? JSON.stringify(merged) : null;

  if (!album.albumArtists && mergedJson) patch.albumArtists = mergedJson;
  else if (album.albumArtists && mergedJson && mergedJson !== album.albumArtists) patch.albumArtists = mergedJson;

  if (Object.keys(patch).length) {
    if (!dryRun) await album.update(patch, { transaction: t });
    report.updatedAlbums += 1;
  }

  return album;
}

class LibraryScanService {
  static async scan({ removeMissing = false, dryRun = false } = {}) {
    const folderCsv = await SettingService.getValue("music.folders", "");
    const extCsv = await SettingService.getValue("music.extensions", "flac");
    const publicBaseUrl = normalizeBaseUrl(
      process.env.PUBLIC_BASE_URL || (await SettingService.getValue("public.baseUrl", ""))
    );

    const folders = csvToArray(folderCsv);
    const exts = csvToArray(extCsv).map(normalizeExtension).filter(Boolean);

    const report = {
      folders,
      extensions: exts,
      foundFiles: 0,
      createdTracks: 0,
      updatedTracks: 0,
      skippedUnchanged: 0,
      createdAlbums: 0,
      updatedAlbums: 0,
      removedTracks: 0,
      extractedCovers: 0,
      errors: [],
    };

    if (!folders.length) return report;

    const patterns = folders.map((dir) => {
      const brace = exts.length ? `{${exts.join(",")}}` : "*";
      return path.join(dir, `**/*.${brace}`);
    });

    const files = await fg(patterns, {
      onlyFiles: true,
      unique: true,
      suppressErrors: true,
      followSymbolicLinks: true,
    });

    report.foundFiles = files.length;
    const scannedSet = new Set(files);

    return sequelize.transaction(async (t) => {
      for (const filePath of files) {
        try {
          const { size, mtimeMs } = await statFile(filePath);
          const existing = await Track.findOne({ where: { filePath }, transaction: t });

          // Quick skip if unchanged
          if (existing && existing.fileSizeBytes === size && existing.fileMtimeMs === mtimeMs) {
            report.skippedUnchanged += 1;
            continue;
          }

          const metadata = await mm.parseFile(filePath, { duration: true });
          const common = metadata.common || {};
          const format = metadata.format || {};

          const albumTitle = safeStr(common.album);
          const albumArtist = safeStr(common.albumartist) || safeStr(common.artist);
          const albumArtistsArr = Array.isArray(common.albumartists) ? common.albumartists : null;

          const trackTitle = safeStr(common.title) || path.basename(filePath);
          const trackArtist = safeStr(common.artist);
          const trackArtistsArr = Array.isArray(common.artists) ? common.artists : null;

          const year = pickYear(common);
          const genre = Array.isArray(common.genre) ? safeStr(common.genre[0]) : safeStr(common.genre);

          const trackNo = common.track && common.track.no ? Number(common.track.no) : null;
          const trackTotal = common.track && common.track.of ? Number(common.track.of) : null;
          const discNo = common.disk && common.disk.no ? Number(common.disk.no) : null;
          const discTotal = common.disk && common.disk.of ? Number(common.disk.of) : null;

          let albumId = null;

          if (albumTitle) {
            const sourcePath = path.dirname(filePath);

            const album = await findOrCreateAlbum({
              t,
              dryRun,
              albumTitle,
              year,
              genre,
              albumArtist,
              albumArtistsArr,
              sourcePath,
              report,
            });

            albumId = album ? album.id : null;

            // Try to extract cover only if album exists in DB (not dry-run)
            if (album && !dryRun) {
              const pic = pickEmbeddedPicture(metadata);
              const wrote = await writeCoverIfNeeded({
                album,
                picture: pic,
                dryRun,
                transaction: t,
                publicBaseUrl,
              });
              if (wrote) report.extractedCovers += 1;
            }
          }

          const patchTrack = {
            albumId,
            title: trackTitle,
            trackArtist,
            trackArtists: toJsonText(trackArtistsArr),
            albumArtist,

            trackNo,
            trackTotal,
            discNo,
            discTotal,
            year,
            genre,

            durationSec: format.duration ? Math.round(format.duration) : null,
            sampleRate: format.sampleRate ? Number(format.sampleRate) : null,
            bitDepth: format.bitsPerSample ? Number(format.bitsPerSample) : null,
            channels: format.numberOfChannels ? Number(format.numberOfChannels) : null,
            bitrateKbps: format.bitrate ? Math.round(Number(format.bitrate) / 1000) : null,

            filePath,
            fileSizeBytes: size,
            fileMtimeMs: mtimeMs,
          };

          if (!existing) {
            if (!dryRun) await Track.create(patchTrack, { transaction: t });
            report.createdTracks += 1;
          } else {
            if (!dryRun) await existing.update(patchTrack, { transaction: t });
            report.updatedTracks += 1;
          }
        } catch (err) {
          report.errors.push({
            file: filePath,
            error: String(err && err.message ? err.message : err),
          });
        }
      }

      if (removeMissing) {
        const allTracks = await Track.findAll({ attributes: ["id", "filePath"], transaction: t });
        const missingIds = allTracks
          .filter((tr) => tr.filePath && !scannedSet.has(tr.filePath))
          .map((tr) => tr.id);

        if (missingIds.length) {
          if (!dryRun) {
            await Track.destroy({ where: { id: { [Op.in]: missingIds } }, transaction: t });
          }
          report.removedTracks = missingIds.length;
        }
      }

      return report;
    });
  }
}

module.exports = { LibraryScanService };
