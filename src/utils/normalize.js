"use strict";

function normalizeCsvValue(input) {
  if (input == null) return "";
  return String(input)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(",");
}

function csvToArray(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function arrayToCsv(arr) {
  return arr.map((s) => String(s).trim()).filter(Boolean).join(",");
}

function uniqInsensitive(arr) {
  const seen = new Set();
  const out = [];
  for (const v of arr) {
    const key = String(v).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function normalizeExtension(ext) {
  // Accept ".flac" or "flac" and normalize to "flac"
  const s = String(ext || "").trim().toLowerCase();
  if (!s) return "";
  return s.startsWith(".") ? s.slice(1) : s;
}

module.exports = {
  normalizeCsvValue,
  csvToArray,
  arrayToCsv,
  uniqInsensitive,
  normalizeExtension,
};
