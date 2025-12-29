const os = require("os");
const path = require("path");
const fs = require("fs");
const net = require("net");
const { spawn } = require("child_process");

const DEFAULT_SOCKET_PATH = path.join(os.tmpdir(), "nostalgia-mpv.sock");

function safeUnlinkSocket(sockPath) {
  try {
    if (fs.existsSync(sockPath)) fs.unlinkSync(sockPath);
  } catch {
    // ignore
  }
}

/**
 * MPV IPC wrapper with optional audio output selection.
 *
 * Usage:
 *   const mpv = createMpvIpc({
 *     audioDevice: "alsa/plughw:CARD=IQaudIODAC,DEV=0",
 *     ao: "alsa",
 *     // extraArgs: ["--volume=70"],
 *   });
 *   mpv.start();
 *
 * To list devices on the host:
 *   mpv --audio-device=help
 */
function createMpvIpc(opts = {}) {
  const socketPath = opts.socketPath || DEFAULT_SOCKET_PATH;
  const mpvBinary = opts.mpvBinary || "mpv";

  // If true, publishes instance on global.__mpv (so TrackService can access it)
  const exposeGlobal = opts.exposeGlobal !== false; // default true

  // NEW: force mpv audio output driver (e.g. "alsa", "pulse", "pipewire")
  const ao = typeof opts.ao === "string" && opts.ao.trim() ? opts.ao.trim() : null;

  // NEW: mpv audio device string (e.g. "alsa/plughw:CARD=IQaudIODAC,DEV=0")
  const audioDevice =
    typeof opts.audioDevice === "string" && opts.audioDevice.trim()
      ? opts.audioDevice.trim()
      : null;

  // NEW: allow passing extra mpv args if needed
  const extraArgs = Array.isArray(opts.extraArgs) ? opts.extraArgs.filter(Boolean) : [];

  let mpvProc = null;
  let client = null;
  let connected = false;

  let buffer = "";
  let lastMessage = null;

  // request_id -> { resolve, reject, timer }
  const pending = new Map();

  function cleanupPending(err) {
    for (const [, p] of pending) {
      try {
        clearTimeout(p.timer);
        p.reject(err);
      } catch {}
    }
    pending.clear();
  }

  function buildArgs() {
    const args = [
      "--idle=yes",
      "--no-video",
      "--force-window=no",
      "--really-quiet",
      "--input-ipc-server=" + socketPath,
      "--audio-display=no",
      "--keep-open=no",
      "--terminal=no",
    ];

    // NEW: lock down audio path for predictable kiosk playback
    if (ao) args.push("--ao=" + ao);
    if (audioDevice) args.push("--audio-device=" + audioDevice);

    // Optional extra args (volume, cache, etc.)
    if (extraArgs.length) args.push(...extraArgs);

    return args;
  }

  function start() {
    if (mpvProc) return;

    safeUnlinkSocket(socketPath);

    const args = buildArgs();

    // Helpful log once at start (won't spam)
    console.log("[mpv] starting:", mpvBinary, args.join(" "));

    mpvProc = spawn(mpvBinary, args, { stdio: ["ignore", "pipe", "pipe"] });

    mpvProc.on("spawn", () => {
      console.log("[mpv] spawned; socket:", socketPath);
      connectWithRetry();
    });

    mpvProc.stderr.on("data", (d) => {
      const msg = String(d).trim();
      if (msg) console.log("[mpv stderr]", msg);
    });

    mpvProc.on("exit", (code, signal) => {
      console.log("[mpv] exited", { code, signal });
      mpvProc = null;
      connected = false;

      try {
        if (client) client.destroy();
      } catch {}
      client = null;

      cleanupPending(new Error("mpv exited"));

      safeUnlinkSocket(socketPath);
    });
  }

  function connectWithRetry() {
    const maxAttempts = 25;
    let attempt = 0;

    const tryConnect = () => {
      attempt += 1;

      client = net.createConnection(socketPath);

      client.on("connect", () => {
        connected = true;
        console.log("[mpv] IPC connected");

        // expose globally for services (optional)
        if (exposeGlobal) {
          global.__mpv = api; // <-- IMPORTANT for your TrackService.playTrackById()
        }
      });

      client.on("data", (chunk) => {
        buffer += chunk.toString("utf8");

        let idx;
        while ((idx = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);

          if (!line) continue;

          try {
            const msg = JSON.parse(line);
            lastMessage = msg;

            // mpv replies include {request_id, error, data}
            const rid = msg?.request_id;
            if (rid != null && pending.has(rid)) {
              const p = pending.get(rid);
              pending.delete(rid);
              clearTimeout(p.timer);

              if (msg.error && msg.error !== "success") {
                const e = new Error(`mpv error: ${msg.error}`);
                e.mpv = msg;
                p.reject(e);
              } else {
                p.resolve(msg);
              }
            }
          } catch {
            // ignore non-json
          }
        }
      });

      client.on("error", (err) => {
        connected = false;

        if (attempt < maxAttempts) {
          const waitMs = Math.min(200 + attempt * 100, 1500);
          setTimeout(tryConnect, waitMs);
          return;
        }

        console.error("[mpv] failed to connect:", err?.message || err);
      });

      client.on("close", () => {
        connected = false;
        cleanupPending(new Error("mpv IPC disconnected"));

        if (mpvProc) {
          console.log("[mpv] IPC disconnected, reconnecting...");
          setTimeout(() => connectWithRetry(), 400);
        }
      });
    };

    tryConnect();
  }

  function sendToMpv(payload) {
    if (!connected || !client) throw new Error("mpv IPC not connected yet.");
    client.write(JSON.stringify(payload) + "\n");
  }

  function sendCommand(commandArray, opts2 = {}) {
    const request_id =
      opts2.request_id != null
        ? opts2.request_id
        : Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`); // avoid collisions

    const timeoutMs = opts2.timeoutMs ?? 2500;

    return new Promise((resolve, reject) => {
      if (!connected || !client) {
        reject(new Error("mpv IPC not connected yet."));
        return;
      }

      const timer = setTimeout(() => {
        pending.delete(request_id);
        reject(new Error(`mpv command timeout (request_id=${request_id})`));
      }, timeoutMs);

      pending.set(request_id, { resolve, reject, timer });

      try {
        sendToMpv({ command: commandArray, request_id });
      } catch (e) {
        clearTimeout(timer);
        pending.delete(request_id);
        reject(e);
      }
    });
  }

  function waitUntilConnected(timeoutMs = 5000) {
    if (connected) return Promise.resolve(true);

    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const tick = () => {
        if (connected) return resolve(true);
        if (Date.now() - startedAt > timeoutMs)
          return reject(new Error("mpv did not connect in time"));
        setTimeout(tick, 100);
      };
      tick();
    });
  }

  function stop() {
    try {
      if (connected && client) {
        client.write(
          JSON.stringify({ command: ["quit"], request_id: Date.now() }) + "\n"
        );
      }
    } catch {}

    try {
      if (mpvProc) mpvProc.kill("SIGTERM");
    } catch {}

    try {
      if (client) client.destroy();
    } catch {}

    client = null;
    mpvProc = null;
    connected = false;

    cleanupPending(new Error("mpv stopped"));

    safeUnlinkSocket(socketPath);
  }

  function getState() {
    return {
      socketPath,
      connected,
      lastMessage,
      pid: mpvProc?.pid ?? null,
      ao,
      audioDevice,
      extraArgs,
    };
  }

  const api = {
    start,
    stop,
    sendToMpv,
    sendCommand,
    waitUntilConnected,
    getState,
    get socketPath() {
      return socketPath;
    },
    get connected() {
      return connected;
    },
    get lastMessage() {
      return lastMessage;
    },
  };

  return api;
}

module.exports = { createMpvIpc };
