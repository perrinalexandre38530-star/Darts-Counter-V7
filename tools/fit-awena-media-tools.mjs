import fssync from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

function cliArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || "").trim() : "";
}

function commandExists(candidate) {
  if (!candidate) return false;
  try {
    const result = spawnSync(candidate, ["-version"], { stdio: "ignore", windowsHide: true });
    return result.status === 0;
  } catch {
    return false;
  }
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean)));
}

function binaryName(kind) {
  return process.platform === "win32" ? `${kind}.exe` : kind;
}

function winGetLink(kind) {
  const local = process.env.LOCALAPPDATA;
  return local ? path.join(local, "Microsoft", "WinGet", "Links", `${kind}.exe`) : "";
}

function sibling(ffmpegPath, kind) {
  if (!ffmpegPath) return "";
  try {
    return path.join(path.dirname(ffmpegPath), binaryName(kind));
  } catch {
    return "";
  }
}

function localStaticFfmpeg() {
  const names = process.platform === "win32"
    ? [
        path.resolve("node_modules/ffmpeg-static/ffmpeg.exe"),
        path.resolve("node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe"),
      ]
    : [
        path.resolve("node_modules/ffmpeg-static/ffmpeg"),
      ];
  return names;
}

function commonWindowsCandidates(kind) {
  if (process.platform !== "win32") return [];
  const exe = `${kind}.exe`;
  const home = os.homedir();
  const programData = process.env.ProgramData || "C:\\ProgramData";
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const localAppData = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
  return [
    winGetLink(kind),
    path.join(home, "scoop", "apps", "ffmpeg", "current", "bin", exe),
    path.join(home, "scoop", "apps", "ffmpeg-essentials", "current", "bin", exe),
    path.join(programData, "chocolatey", "bin", exe),
    path.join(programFiles, "ffmpeg", "bin", exe),
    path.join("C:\\ffmpeg\\bin", exe),
    path.join(localAppData, "ffmpeg", "bin", exe),
  ];
}

function fromWhere(kind) {
  const command = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(command, [kind], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) return [];
  return String(result.stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

let ffmpegCache = null;
let ffprobeCache = null;

export function resolveFfmpeg() {
  if (ffmpegCache && commandExists(ffmpegCache)) return ffmpegCache;
  const candidates = unique([
    cliArg("--ffmpeg"),
    process.env.FFMPEG_PATH,
    ...fromWhere("ffmpeg"),
    ...localStaticFfmpeg(),
    ...commonWindowsCandidates("ffmpeg"),
    "ffmpeg",
  ]);
  ffmpegCache = candidates.find(commandExists) || "";
  return ffmpegCache;
}

export function resolveFfprobe() {
  if (ffprobeCache && commandExists(ffprobeCache)) return ffprobeCache;
  const ffmpeg = resolveFfmpeg();
  const candidates = unique([
    cliArg("--ffprobe"),
    process.env.FFPROBE_PATH,
    sibling(ffmpeg, "ffprobe"),
    ...fromWhere("ffprobe"),
    ...commonWindowsCandidates("ffprobe"),
    "ffprobe",
  ]);
  ffprobeCache = candidates.find(commandExists) || "";
  return ffprobeCache;
}

export function mediaToolsStatus() {
  const ffmpeg = resolveFfmpeg();
  const ffprobe = resolveFfprobe();
  return {
    platform: process.platform,
    ffmpeg: ffmpeg || null,
    ffprobe: ffprobe || null,
    ffmpegOk: Boolean(ffmpeg),
    ffprobeOk: Boolean(ffprobe),
  };
}

export function ffmpegInstallHint() {
  if (process.platform === "win32") {
    return [
      "FFmpeg n'est pas accessible depuis Node.js.",
      "Installe-le une fois avec :",
      "  winget install --id Gyan.FFmpeg --exact --accept-package-agreements --accept-source-agreements",
      "Puis ferme/réouvre le terminal VS Code, ou relance npm run fit:awena:doctor.",
      "Alternative : définis FFMPEG_PATH et FFPROBE_PATH vers ffmpeg.exe / ffprobe.exe.",
    ].join("\n");
  }
  return "FFmpeg/ffprobe introuvables. Installe ffmpeg avec le gestionnaire de paquets de ton système, ou définis FFMPEG_PATH et FFPROBE_PATH.";
}

export function requireMediaTools({ needProbe = false } = {}) {
  const status = mediaToolsStatus();
  if (!status.ffmpegOk || (needProbe && !status.ffprobeOk)) {
    const missing = [!status.ffmpegOk ? "ffmpeg" : "", needProbe && !status.ffprobeOk ? "ffprobe" : ""].filter(Boolean).join(" + ");
    const error = new Error(`Dépendance média absente : ${missing}.\n${ffmpegInstallHint()}`);
    error.code = "FIT_AWENA_MEDIA_TOOL_MISSING";
    throw error;
  }
  return status;
}

export function runFfmpeg(args, label = "FFmpeg") {
  const ffmpeg = requireMediaTools().ffmpeg;
  const result = spawnSync(ffmpeg, ["-y", "-loglevel", "error", ...args], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error) throw new Error(`${label} échoué: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || "").trim();
    throw new Error(`${label} échoué (code ${result.status})${detail ? `: ${detail}` : ""}`);
  }
  return result;
}

export function runFfprobe(args, { encoding = "utf8" } = {}) {
  const ffprobe = requireMediaTools({ needProbe: true }).ffprobe;
  return spawnSync(ffprobe, args, { encoding, windowsHide: true });
}

export function installFfmpegWithWinget() {
  if (process.platform !== "win32") {
    return { ok: false, reason: "WINDOWS_ONLY" };
  }
  const winget = spawnSync("winget", ["--version"], { stdio: "ignore", windowsHide: true });
  if (winget.status !== 0) return { ok: false, reason: "WINGET_NOT_FOUND" };
  const result = spawnSync("winget", [
    "install",
    "--id", "Gyan.FFmpeg",
    "--exact",
    "--accept-package-agreements",
    "--accept-source-agreements",
  ], { stdio: "inherit", windowsHide: false });
  ffmpegCache = null;
  ffprobeCache = null;
  return { ok: result.status === 0, status: result.status };
}
