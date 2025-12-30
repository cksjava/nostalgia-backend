// services/audioDevice.service.js
const { execFile } = require("child_process");
const fs = require("fs/promises");
const path = require("path");

function execFileAsync(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { ...opts, encoding: "utf8" }, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        return reject(err);
      }
      resolve({ stdout, stderr });
    });
  });
}

function hasValue(v) {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Parse `aplay -L` output into MPV-ish device names.
 * We'll keep it simple and return entries like:
 *  - alsa/default
 *  - alsa/sysdefault:CARD=...
 *  - alsa/plughw:CARD=...,DEV=0 (if present)
 *
 * `aplay -L` usually lists PCM names (default, sysdefault:CARD=..., plughw:CARD=..., etc.)
 */
function parseAplayL(text) {
  const lines = String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // In `aplay -L`, top-level PCM names are non-indented lines.
  // Indented lines are descriptions.
  const pcmNames = [];
  for (const line of lines) {
    // aplay -L typically prints "name" on a line, then "  description" next lines.
    if (!line.startsWith("#") && !line.startsWith(";")) {
      // If it contains spaces, it's likely a description line; ignore.
      if (!/\s/.test(line)) pcmNames.push(line);
      else if (/^[A-Za-z0-9_.:-]+$/.test(line)) pcmNames.push(line);
    }
  }

  const uniq = Array.from(new Set(pcmNames));

  // Convert to mpv audio-device entries: "alsa/<pcm>"
  // mpv expects e.g. "alsa/plughw:CARD=IQaudIODAC,DEV=0"
  const devices = uniq.map((pcm) => ({
    id: `alsa/${pcm}`,
    backend: "alsa",
    label: pcm,
    raw: pcm,
  }));

  return devices;
}

/**
 * Parse `aplay -l` output (card/device list) to synthesize plughw IDs.
 * Example lines:
 * card 1: IQaudIODAC [IQaudIODAC], device 0: IQaudIODAC HiFi [...]
 */
function parseAplayLittleL(text) {
  const lines = String(text || "").split("\n");
  const devices = [];

  for (const line of lines) {
    const m = line.match(/card\s+(\d+):\s*([^\s]+)\s*\[([^\]]+)\],\s*device\s+(\d+):\s*([^\[]+)/i);
    if (m) {
      const cardNum = Number(m[1]);
      const cardId = m[2];
      const cardName = m[3];
      const devNum = Number(m[4]);
      const devName = m[5].trim();

      // Provide both numeric and CARD= forms; mpv commonly likes CARD=...
      devices.push({
        id: `alsa/plughw:CARD=${cardId},DEV=${devNum}`,
        backend: "alsa",
        label: `${cardName} - ${devName} (CARD=${cardId},DEV=${devNum})`,
        raw: { cardNum, cardId, cardName, devNum, devName },
      });

      devices.push({
        id: `alsa/plughw:${cardNum},${devNum}`,
        backend: "alsa",
        label: `${cardName} - ${devName} (plughw:${cardNum},${devNum})`,
        raw: { cardNum, devNum },
      });
    }
  }

  // De-dupe by id
  const map = new Map();
  for (const d of devices) map.set(d.id, d);
  return Array.from(map.values());
}

class AudioDeviceService {
  static mpvOptsPath() {
    // nostalgia-backend/mpvopts.json (same level as app.js typically)
    return path.join(process.cwd(), "mpvopts.json");
  }

  static dummyDevices() {
    return [
      { id: "alsa/default", backend: "alsa", label: "Default (dummy)", raw: "default" },
      { id: "alsa/plughw:CARD=IQaudIODAC,DEV=0", backend: "alsa", label: "IQaudIODAC (dummy)", raw: "plughw:CARD=IQaudIODAC,DEV=0" },
      { id: "alsa/plughw:CARD=Generic,DEV=0", backend: "alsa", label: "Generic USB DAC (dummy)", raw: "plughw:CARD=Generic,DEV=0" },
    ];
  }

  static async getAudioDevices() {
    // Prefer `aplay -L` (gives named PCMs), fall back to `aplay -l` (cards/devices)
    try {
      const { stdout } = await execFileAsync("aplay", ["-L"]);
      const parsed = parseAplayL(stdout);
      if (parsed.length) return { source: "aplay -L", devices: parsed };
    } catch (e) {
      // ignore and try -l
    }

    try {
      const { stdout } = await execFileAsync("aplay", ["-l"]);
      const parsed = parseAplayLittleL(stdout);
      if (parsed.length) return { source: "aplay -l", devices: parsed };
    } catch (e) {
      // ALSA tools missing (mac) or not installed
      return { source: "dummy", devices: this.dummyDevices() };
    }

    // If somehow both worked but parsed empty, still give dummy
    return { source: "dummy", devices: this.dummyDevices() };
  }

  static async readMpvOpts() {
    const p = this.mpvOptsPath();
    try {
      const raw = await fs.readFile(p, "utf8");
      const json = JSON.parse(raw);
      return {
        ao: hasValue(json.ao) ? String(json.ao) : "alsa",
        audioDevice: hasValue(json.audioDevice)
          ? String(json.audioDevice)
          : "alsa/default",
        // allow extra keys but we only care about these two
        _raw: json,
        path: p,
      };
    } catch (e) {
      // file missing or invalid JSON -> return defaults
      return { ao: "alsa", audioDevice: "alsa/default", _raw: {}, path: p };
    }
  }

  static async writeMpvOpts(partial) {
    const p = this.mpvOptsPath();

    const current = await this.readMpvOpts();
    const next = {
      ...(current._raw || {}),
      ao: hasValue(partial.ao) ? String(partial.ao) : current.ao,
      audioDevice: hasValue(partial.audioDevice)
        ? String(partial.audioDevice)
        : current.audioDevice,
    };

    // Atomic-ish write: write temp then rename
    const tmp = `${p}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
    await fs.rename(tmp, p);

    return { ao: next.ao, audioDevice: next.audioDevice, _raw: next, path: p };
  }
}

module.exports = { AudioDeviceService };
