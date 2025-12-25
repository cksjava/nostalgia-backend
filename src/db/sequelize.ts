import "reflect-metadata";
import { Sequelize } from "sequelize-typescript";
import path from "path";

import { Album } from "../models/Album";
import { Track } from "../models/Track";
import { Playlist } from "../models/Playlist";
import { PlaylistItem } from "../models/PlaylistItem";
import { Favourite } from "../models/Favourite";

const dbFile = process.env.SQLITE_FILE || path.join(process.cwd(), "data", "player.sqlite");

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: dbFile,
  logging: process.env.SQL_LOG === "1" ? console.log : false,
  models: [Album, Track, Playlist, PlaylistItem, Favourite],
});

export async function initDb() {
  await sequelize.authenticate();
  // For early dev: sync. Later we’ll switch to migrations.
  await sequelize.sync({ alter: true });
}
