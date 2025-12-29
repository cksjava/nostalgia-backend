"use strict";

/**
 * DANGER: Wipes DB tables and deletes extracted cover cache files.
 *
 * Usage:
 *   node src/scripts/reset-db.js
 *   node src/scripts/reset-db.js --keep-settings
 */

const path = require("path");
const fs = require("fs/promises");

const COVER_DIR_ABS = path.join(process.cwd(), "storage", "covers");

async function rmDirContents(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    await Promise.all(
      entries.map(async (e) => {
        const p = path.join(dir, e.name);
        await fs.rm(p, { recursive: true, force: true });
      })
    );
  } catch {
    // ignore if folder doesn't exist
  }
}

async function main() {
  const keepSettings = process.argv.includes("--keep-settings");

  const models = require("../models");
  const { sequelize, Album, Track, Playlist, PlaylistTrack, Setting } = models;

  if (!sequelize) throw new Error("sequelize not found in ../models export");

  console.log("⚠️  Resetting database...");
  console.log("   keepSettings:", keepSettings);

  try {
    await sequelize.authenticate();

    // Ensure FK enforcement
    await sequelize.query("PRAGMA foreign_keys = ON;");

    await sequelize.transaction(async (t) => {
      // Clear in safe order
      if (PlaylistTrack) {
        await PlaylistTrack.destroy({ where: {}, truncate: false, transaction: t });
        console.log("✅ Cleared PlaylistTracks");
      }

      if (Playlist) {
        await Playlist.destroy({ where: {}, truncate: false, transaction: t });
        console.log("✅ Cleared Playlists");
      }

      if (Track) {
        await Track.destroy({ where: {}, truncate: false, transaction: t });
        console.log("✅ Cleared Tracks");
      }

      if (Album) {
        await Album.destroy({ where: {}, truncate: false, transaction: t });
        console.log("✅ Cleared Albums");
      }

      if (!keepSettings && Setting) {
        await Setting.destroy({ where: {}, truncate: false, transaction: t });
        console.log("✅ Cleared Settings");
      }
    });

    await rmDirContents(COVER_DIR_ABS);
    console.log("🧹 Cleared cover cache:", COVER_DIR_ABS);

    console.log("🎉 DB reset completed.");
    console.log(keepSettings ? "ℹ️ Settings preserved." : "ℹ️ Settings cleared.");
  } catch (err) {
    console.error("❌ DB reset failed:", err);
    process.exitCode = 1;
  } finally {
    try {
      await sequelize.close();
    } catch {
      // ignore
    }
  }
}

main();
