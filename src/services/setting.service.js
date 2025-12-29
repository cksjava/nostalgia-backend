"use strict";

const { Setting, sequelize } = require("../models");
const {
  csvToArray,
  arrayToCsv,
  uniqInsensitive,
  normalizeCsvValue,
  normalizeExtension,
} = require("../utils/normalize");

class SettingService {
  // ---- CRUD ----
  static async getAll() {
    return Setting.findAll({ order: [["name", "ASC"]] });
  }

  static async getByName(name) {
    return Setting.findOne({ where: { name } });
  }

  static async getValue(name, defaultValue = null) {
    const row = await Setting.findOne({ where: { name } });
    return row ? row.value : defaultValue;
  }

  static async upsert(name, value) {
    const v = value == null ? null : String(value);
    return sequelize.transaction(async (t) => {
      const existing = await Setting.findOne({ where: { name }, transaction: t });
      if (existing) {
        existing.value = v;
        await existing.save({ transaction: t });
        return existing;
      }
      return Setting.create({ name, value: v }, { transaction: t });
    });
  }

  static async update(name, value) {
    const row = await Setting.findOne({ where: { name } });
    if (!row) return null;
    row.value = value == null ? null : String(value);
    await row.save();
    return row;
  }

  static async delete(name) {
    return Setting.destroy({ where: { name } });
  }

  // ---- CSV helpers ----
  static async getCsv(name) {
    const value = await this.getValue(name, "");
    return csvToArray(value);
  }

  static async setCsv(name, values) {
    const cleaned = uniqInsensitive(values.map((s) => String(s).trim()).filter(Boolean));
    return this.upsert(name, arrayToCsv(cleaned));
  }

  // ---- Domain actions for music settings ----
  static async addMusicFolder(folderPath) {
    const folder = String(folderPath || "").trim();
    if (!folder) return await this.getByName("music.folders");

    return sequelize.transaction(async (t) => {
      const row =
        (await Setting.findOne({ where: { name: "music.folders" }, transaction: t })) ||
        (await Setting.create(
          { name: "music.folders", value: "" },
          { transaction: t }
        ));

      const arr = uniqInsensitive([...csvToArray(row.value), folder]);
      row.value = normalizeCsvValue(arrayToCsv(arr));
      await row.save({ transaction: t });
      return row;
    });
  }

  static async removeMusicFolder(folderPath) {
    const folder = String(folderPath || "").trim();
    return sequelize.transaction(async (t) => {
      const row = await Setting.findOne({ where: { name: "music.folders" }, transaction: t });
      if (!row) return null;
      const arr = csvToArray(row.value).filter((p) => p.toLowerCase() !== folder.toLowerCase());
      row.value = normalizeCsvValue(arrayToCsv(arr));
      await row.save({ transaction: t });
      return row;
    });
  }

  static async addMusicExtension(ext) {
    const e = normalizeExtension(ext);
    if (!e) return await this.getByName("music.extensions");

    return sequelize.transaction(async (t) => {
      const row =
        (await Setting.findOne({ where: { name: "music.extensions" }, transaction: t })) ||
        (await Setting.create(
          { name: "music.extensions", value: "" },
          { transaction: t }
        ));

      const arr = uniqInsensitive([...csvToArray(row.value).map(normalizeExtension), e]);
      row.value = normalizeCsvValue(arrayToCsv(arr));
      await row.save({ transaction: t });
      return row;
    });
  }

  static async removeMusicExtension(ext) {
    const e = normalizeExtension(ext);
    return sequelize.transaction(async (t) => {
      const row = await Setting.findOne({ where: { name: "music.extensions" }, transaction: t });
      if (!row) return null;
      const arr = csvToArray(row.value)
        .map(normalizeExtension)
        .filter((x) => x !== e);
      row.value = normalizeCsvValue(arrayToCsv(arr));
      await row.save({ transaction: t });
      return row;
    });
  }
}

module.exports = { SettingService };
