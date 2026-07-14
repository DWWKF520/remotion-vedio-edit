import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/postcss";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, ensureBrowser } from "@remotion/renderer";
import { execFile, spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

// 获取 ffmpeg 可执行文件路径
// 全局安装的 @ffmpeg-installer/ffmpeg 路径
const FFMPEG_PATH = "D:/nodejs/node_global/node_modules/@ffmpeg-installer/ffmpeg/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe";

// 上传目录：public/uploads/
function ensureUploadsDir(): string {
  const dir = path.resolve(__dirname, "public/uploads");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const META_FILE = "_meta.json";
interface MediaMeta {
  type: "video" | "image";
  originalName: string;
  fileName: string;
  size: number;
  duration?: number;
  width?: number;
  height?: number;
  createdAt: number;
}

function readMeta(): Record<string, MediaMeta> {
  try {
    const dir = ensureUploadsDir();
    const p = path.join(dir, META_FILE);
    if (!fs.existsSync(p)) return {};
    return JSON.parse(fs.readFileSync(p, "utf-8")) as Record<string, MediaMeta>;
  } catch {
    return {};
  }
}

function writeMeta(meta: Record<string, MediaMeta>): void {
  try {
    const dir = ensureUploadsDir();
    const p = path.join(dir, META_FILE);
    fs.writeFileSync(p, JSON.stringify(meta, null, 2), "utf-8");
  } catch {
    // 忽略
  }
}

/**
 * 用 ffmpeg 探测视频时长和分辨率（ffmpeg -i 从 stderr 解析）
 * 因为 @ffmpeg-installer/win32-x64 只带了 ffmpeg.exe，没有 ffprobe.exe
 */
function probeVideo(filePath: string): Promise<{
  duration: number;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_PATH, ["-i", filePath]);
    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    proc.stdout.on("data", () => {});
    proc.on("close", () => {
      // ffmpeg -i 没有输出文件的话会返回非 0，但 stderr 里有元数据
      // Duration: 00:00:05.13, start: 0.000000, bitrate: 7777 kb/s
      const durMatch = stderr.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
      // Stream #0:0(und): Video: h264 ..., 1920x1080 ...
      const resMatch = stderr.match(/Stream.*Video.*?(\d{2,5})x(\d{2,5})/);

      let duration = 0;
      let width = 0;
      let height = 0;

      if (durMatch) {
        const h = parseInt(durMatch[1], 10);
        const m = parseInt(durMatch[2], 10);
        const s = parseFloat(durMatch[3]);
        duration = h * 3600 + m * 60 + s;
      }
      if (resMatch) {
        width = parseInt(resMatch[1], 10);
        height = parseInt(resMatch[2], 10);
      }

      if (duration > 0 || width > 0) {
        resolve({ duration, width, height });
      } else {
        reject(new Error("Could not parse video metadata: " + stderr.slice(0, 200)));
      }
    });
    proc.on("error", reject);
  });
}

/**
 * 根据文件名推断媒体类型
 */
function detectType(fileName: string): "video" | "image" {
  const ext = path.extname(fileName).toLowerCase();
  const videoExts = [".mp4", ".webm", ".mov", ".m4v", ".avi", ".mkv"];
  if (videoExts.includes(ext)) return "video";
  return "image";
}

// Vite 配置：用 @remotion/player 在普通浏览器环境运行编辑器，
// 完全脱离 Remotion Studio。
//
// 同时通过 configureServer middleware 提供 /api/export 导出 API：
// 1. POST /api/export/start  → 接收 inputProps，启动渲染任务，返回 jobId
// 2. GET  /api/export/status → 返回 { progress, done, url?, error? }
// 渲染结果输出到 public/exports/<jobId>.mp4，浏览器直接下载。

interface ExportJob {
  progress: number;
  done: boolean;
  url?: string;
  error?: string;
}
const jobs = new Map<string, ExportJob>();

// 中文文件名 → ASCII 文件名的映射表（每次 bundle 时重建）
const mediaFileNameMap: Record<string, string> = {};

// bundle 缓存：第一次导出时 bundle（10-30s），后续复用
let bundlePromise: Promise<string> | null = null;
async function getBundle(): Promise<string> {
  if (!bundlePromise) {
    const publicDir = path.resolve(__dirname, "public");
    // 固定 bundle 输出到 E 盘，避免使用 C 盘临时目录
    const bundleOutputDir = path.resolve(__dirname, ".tmp/remotion-bundle");
    bundlePromise = bundle({
      entryPoint: path.resolve(__dirname, "src/index.ts"),
      // Remotion v4 默认不复制 public 目录，渲染时 /uploads/ 等资源会 404
      publicDir,
      outputDir: bundleOutputDir,
      onProgress: () => {},
    }).then((serveUrl) => {
      // 手动复制 uploads/ 到 serve 目录，同时将中文文件名重命名为纯 ASCII
      // 避免 Remotion 内部 HTTP 服务器无法正确处理 URL 编码的中文路径
      const srcUploads = path.join(publicDir, "uploads");
      const dstUploads = path.join(serveUrl, "uploads");
      if (fs.existsSync(srcUploads)) {
        fs.mkdirSync(dstUploads, { recursive: true });
        // 清空旧映射
        Object.keys(mediaFileNameMap).forEach((k) => delete mediaFileNameMap[k]);
        for (const file of fs.readdirSync(srcUploads)) {
          const srcFile = path.join(srcUploads, file);
          if (!fs.statSync(srcFile).isFile()) continue;
          let dstName = file;
          if (/[^\x00-\x7F]/.test(file)) { // eslint-disable-line no-control-regex
            const ext = path.extname(file);
            const hash = Buffer.from(file, "utf-8").toString("base64url").slice(0, 24);
            dstName = `m_${hash}${ext}`;
            mediaFileNameMap[file] = dstName;
          }
          const dstFile = path.join(dstUploads, dstName);
          fs.copyFileSync(srcFile, dstFile);
        }
      }
      return serveUrl;
    });
  }
  return bundlePromise;
}

/**
 * 根据 mediaFileNameMap 替换 payload 中 clips 的 src 路径。
 * 保持 /uploads/xxx 相对路径（OffthreadVideo 通过 serve URL 解析为 HTTP URL）。
 */
function applyFileNameMap(payload: {
  tracks: unknown;
  clips: unknown;
  totalDuration: number;
  fps?: number;
  width?: number;
  height?: number;
}) {
  if (Object.keys(mediaFileNameMap).length === 0) return payload;
  const cloned = JSON.parse(JSON.stringify(payload)) as typeof payload;
  const clips = cloned.clips as Record<string, { props: Record<string, unknown> }>;
  for (const clip of Object.values(clips || {})) {
    const src = clip.props?.src;
    if (typeof src === "string") {
      let resolved = src;
      for (const [orig, ascii] of Object.entries(mediaFileNameMap)) {
        if (resolved.includes(orig)) {
          resolved = resolved.replace(orig, ascii);
          break;
        }
      }
      clip.props.src = resolved;
    }
  }
  return cloned;
}

// 确保输出目录存在
function ensureExportDir(): string {
  const dir = path.resolve(__dirname, "public/exports");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** 帧数转 SRT 时间格式 HH:MM:SS,mmm */
function framesToSRTTime(frame: number, fps: number): string {
  const totalMs = Math.round((frame / fps) * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60) % 60;
  const hr = Math.floor(totalSec / 3600);
  return `${hr.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}

/** 解析字幕轨道文本（每行：`起始秒-结束秒: 文本`） */
function parseSubtitlesText(text: string): { start: number; end: number; text: string }[] {
  const lines = text.split("\n");
  const entries: { start: number; end: number; text: string }[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^([\d.]+)\s*-\s*([\d.]+)\s*[:：]?\s*(.*)$/);
    if (!match) continue;
    const start = parseFloat(match[1]);
    const end = parseFloat(match[2]);
    const subtitleText = match[3].trim();
    if (!subtitleText) continue;
    entries.push({ start, end, text: subtitleText });
  }
  return entries;
}

/** 从 clips 中提取字幕，生成 SRT 内容 */
function generateSRT(
  tracks: Array<{ clipIds: string[] }>,
  clips: Record<string, { componentKey: string; props: Record<string, unknown>; start: number; duration: number }>,
  fps: number,
): string | null {
  const subtitles: { text: string; startFrame: number; endFrame: number }[] = [];
  for (const track of tracks) {
    for (const cid of track.clipIds) {
      const clip = clips[cid];
      if (!clip) continue;

      if (clip.componentKey === "subtitle") {
        // 单条字幕
        const text = String(clip.props.text ?? "").trim();
        if (!text) continue;
        subtitles.push({
          text,
          startFrame: clip.start,
          endFrame: clip.start + clip.duration,
        });
      } else if (clip.componentKey === "subtitleTrack") {
        // 字幕轨道：解析多行字幕文本
        const subtitlesText = String(clip.props.subtitlesText ?? "");
        const entries = parseSubtitlesText(subtitlesText);
        for (const entry of entries) {
          subtitles.push({
            text: entry.text,
            startFrame: clip.start + Math.round(entry.start * fps),
            endFrame: clip.start + Math.round(entry.end * fps),
          });
        }
      }
    }
  }
  if (subtitles.length === 0) return null;
  subtitles.sort((a, b) => a.startFrame - b.startFrame);
  return subtitles
    .map((item, i) => {
      const start = framesToSRTTime(item.startFrame, fps);
      const end = framesToSRTTime(item.endFrame, fps);
      return `${i + 1}\n${start} --> ${end}\n${item.text}`;
    })
    .join("\n\n");
}

/** 用 ffmpeg 将 SRT 字幕嵌入 MP4（作为软字幕轨道） */
function muxSubtitles(
  mp4Path: string,
  srtPath: string,
  outputPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      FFMPEG_PATH,
      ["-i", mp4Path, "-i", srtPath, "-c", "copy", "-c:s", "mov_text", "-y", outputPath],
      (error, _stdout, stderr) => {
        if (error) {
          console.error("ffmpeg mux error:", stderr || error.message);
          reject(error);
        } else {
          resolve();
        }
      },
    );
  });
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "remotion-export-api",
      configureServer(server) {
        // POST /api/upload/media
        // 上传媒体（视频/图片）到 public/uploads/，返回媒体元信息
        server.middlewares.use("/api/upload/media", async (req, res) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("Method Not Allowed");
            return;
          }
          try {
            const chunks: Buffer[] = [];
            for await (const chunk of req) chunks.push(chunk as Buffer);
            const buffer = Buffer.concat(chunks);

            const contentType = req.headers["content-type"] || "";
            const boundaryMatch = contentType.match(/boundary=([^;]+)/);
            if (!boundaryMatch) {
              res.statusCode = 400;
              res.end("Bad content-type, need multipart/form-data");
              return;
            }
            const boundaryStr = "--" + boundaryMatch[1];
            const boundary = Buffer.from(boundaryStr);

            // 找到所有 boundary 的位置
            const boundaryPositions: number[] = [];
            let searchFrom = 0;
            while (true) {
              const idx = buffer.indexOf(boundary, searchFrom);
              if (idx < 0) break;
              boundaryPositions.push(idx);
              searchFrom = idx + boundary.length;
            }

            let fileBuffer: Buffer | null = null;
            let fileName = "uploaded.bin";
            let mimeType = "";

            // 遍历每一段，找带 filename 的部分
            for (let i = 0; i < boundaryPositions.length - 1; i++) {
              const partStart = boundaryPositions[i] + boundary.length;
              const partEnd = boundaryPositions[i + 1];
              // 每段开头是 --boundary\r\n 然后是 headers，然后是 \r\n\r\n 分隔，然后是 body
              // 找 \r\n\r\n
              const headerEndMarker = Buffer.from("\r\n\r\n");
              const headerEndIdx = buffer.indexOf(headerEndMarker, partStart);
              if (headerEndIdx < 0 || headerEndIdx >= partEnd) continue;

              // header 部分用 UTF-8 解码（中文文件名在这里）
              const headerBuf = buffer.subarray(partStart, headerEndIdx);
              const headerStr = headerBuf.toString("utf-8");

              if (!headerStr.includes("filename=")) continue;

              // 提取 filename
              const fnMatch = headerStr.match(/filename="([^"]*)"/);
              if (fnMatch) fileName = fnMatch[1];

              // 提取 Content-Type
              const ctMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);
              if (ctMatch) mimeType = ctMatch[1].trim();

              // 文件内容：从 header 结束 +4 到段尾
              // 注意：段尾是 \r\n--boundary--\r\n 或 \r\n--boundary\r\n
              // body 末尾的 \r\n 要去掉
              const bodyStart = headerEndIdx + 4;
              let bodyEnd = partEnd;
              // 去掉尾部的 \r\n
              if (bodyEnd - bodyStart >= 2 &&
                  buffer[bodyEnd - 2] === 0x0d &&
                  buffer[bodyEnd - 1] === 0x0a) {
                bodyEnd -= 2;
              }
              // 如果是最后一段，还要去掉 --
              if (bodyEnd - bodyStart >= 2 &&
                  buffer[bodyEnd - 2] === 0x2d &&
                  buffer[bodyEnd - 1] === 0x2d) {
                bodyEnd -= 2;
                // 再去掉前面的 \r\n
                if (bodyEnd - bodyStart >= 2 &&
                    buffer[bodyEnd - 2] === 0x0d &&
                    buffer[bodyEnd - 1] === 0x0a) {
                  bodyEnd -= 2;
                }
              }

              fileBuffer = buffer.subarray(bodyStart, bodyEnd);
              break;
            }

            if (!fileBuffer || fileBuffer.length === 0) {
              res.statusCode = 400;
              res.end("No file found");
              return;
            }

            // 判断类型
            const ext = path.extname(fileName).toLowerCase();
            const videoExts = [".mp4", ".webm", ".mov", ".m4v", ".avi", ".mkv"];
            const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"];
            const isVideo =
              mimeType.startsWith("video/") || videoExts.includes(ext);
            const isImage =
              mimeType.startsWith("image/") || imageExts.includes(ext);
            if (!isVideo && !isImage) {
              res.statusCode = 400;
              res.end("Unsupported file type");
              return;
            }
            const type: "video" | "image" = isVideo ? "video" : "image";

            const uploadDir = ensureUploadsDir();
            const ts = Date.now().toString().slice(-8);
            const baseName = path.basename(fileName, ext);
            const cleanBase = baseName
              .replace(/[\\/:*?"<>|\x00-\x1F]/g, "_") // eslint-disable-line no-control-regex
              .trim()
              .slice(0, 40);
            const safeName = `${ts}_${cleanBase || "media"}${ext}`;
            const filePath = path.join(uploadDir, safeName);
            fs.writeFileSync(filePath, fileBuffer);

            // 探测元数据
            let duration: number | undefined;
            let width: number | undefined;
            let height: number | undefined;

            if (type === "video") {
              try {
                const probe = await probeVideo(filePath);
                if (probe.duration > 0) duration = probe.duration;
                if (probe.width > 0) width = probe.width;
                if (probe.height > 0) height = probe.height;
              } catch {
                // ffprobe 失败，使用默认值
              }
            } else {
              // 图片：用 sharp 或直接 probe，这里简单省略尺寸（前端可以自己读）
            }

            // 写入元数据
            const meta = readMeta();
            meta[safeName] = {
              type,
              originalName: fileName,
              fileName: safeName,
              size: fileBuffer.length,
              duration,
              width,
              height,
              createdAt: Date.now(),
            };
            writeMeta(meta);

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                url: `/uploads/${safeName}`,
                name: fileName,
                type,
                size: fileBuffer.length,
                duration,
                width,
                height,
              }),
            );
          } catch (e) {
            res.statusCode = 500;
            res.end(e instanceof Error ? e.message : String(e));
          }
        });

        // GET /api/upload/list
        // 列出 public/uploads/ 下所有媒体（视频 + 图片）
        server.middlewares.use("/api/upload/list", async (_req, res) => {
          try {
            const uploadDir = ensureUploadsDir();
            const meta = readMeta();
            const files = fs
              .readdirSync(uploadDir)
              .filter((f) => f !== META_FILE)
              .map((f) => {
                const stat = fs.statSync(path.join(uploadDir, f));
                const m = meta[f];
                return {
                  name: m?.originalName || f,
                  fileName: f,
                  url: `/uploads/${f}`,
                  type: m?.type || detectType(f),
                  size: stat.size,
                  mtime: stat.mtimeMs,
                  duration: m?.duration,
                  width: m?.width,
                  height: m?.height,
                };
              })
              .sort((a, b) => b.mtime - a.mtime);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ files }));
          } catch (e) {
            res.statusCode = 500;
            res.end(e instanceof Error ? e.message : String(e));
          }
        });

        // POST /api/upload/delete
        // 删除上传的媒体
        server.middlewares.use("/api/upload/delete", async (req, res) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("Method Not Allowed");
            return;
          }
          try {
            const body = await readBody(req);
            const { url } = JSON.parse(body) as { url: string };
            if (!url || !url.startsWith("/uploads/")) {
              res.statusCode = 400;
              res.end("Invalid url");
              return;
            }
            const uploadDir = ensureUploadsDir();
            const fileName = url.replace("/uploads/", "");
            const filePath = path.join(uploadDir, fileName);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
            // 清理元数据
            const meta = readMeta();
            delete meta[fileName];
            writeMeta(meta);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true }));
          } catch (e) {
            res.statusCode = 500;
            res.end(e instanceof Error ? e.message : String(e));
          }
        });

        // POST /api/export/start
        // body: { tracks, clips, totalDuration, fps, width, height }
        server.middlewares.use("/api/export/start", async (req, res) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("Method Not Allowed");
            return;
          }
          try {
            const body = await readBody(req);
            const payload = JSON.parse(body) as {
              tracks: unknown;
              clips: unknown;
              totalDuration: number;
              fps?: number;
              width?: number;
              height?: number;
            };

            // 这里是 dev server 端 API 调用，不在 Remotion 渲染上下文中，无需确定性
            const jobId = Math.random().toString(36).slice(2, 10); // eslint-disable-line @remotion/deterministic-randomness
            jobs.set(jobId, { progress: 0, done: false });
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ jobId }));

            // 异步渲染
            try {
              // 确保 Remotion Chrome 已安装
              await ensureBrowser();

              const serveUrl = await getBundle();

              // 将中文文件名替换为 ASCII 文件名（避免渲染时 HTTP 404）
              const renderPayload = applyFileNameMap(payload);

              const composition = await selectComposition({
                serveUrl,
                id: "EditorExport",
                inputProps: {
                  tracks: renderPayload.tracks,
                  clips: renderPayload.clips,
                },
              });

              // 覆盖时长（Composition 默认 600，按实际 totalDuration）
              const total = Math.max(
                1,
                Math.round(renderPayload.totalDuration || 600),
              );
              composition.durationInFrames = total;
              if (renderPayload.fps) composition.fps = renderPayload.fps;
              if (renderPayload.width) composition.width = renderPayload.width;
              if (renderPayload.height) composition.height = renderPayload.height;

              const outDir = ensureExportDir();
              const outputPath = path.join(outDir, `${jobId}.mp4`);

              await renderMedia({
                composition,
                serveUrl,
                codec: "h264",
                outputLocation: outputPath,
                concurrency: 1,
                inputProps: {
                  tracks: renderPayload.tracks,
                  clips: renderPayload.clips,
                },
                onBrowserLog: (log) => {
                  if (log.type === "error") {
                    console.warn(`[export:${jobId}][browser] ${log.type}: ${log.text}`);
                  }
                },
                onProgress: ({ progress }) => {
                  const job = jobs.get(jobId);
                  if (job) job.progress = progress;
                },
              });

              // 尝试将字幕嵌入 MP4
              const fps = payload.fps || 30;
              const srtContent = generateSRT(
                payload.tracks as Array<{ clipIds: string[] }>,
                payload.clips as Record<string, { componentKey: string; props: Record<string, unknown>; start: number; duration: number }>,
                fps,
              );

              const finalUrl = `/exports/${jobId}.mp4`;

              if (srtContent) {
                try {
                  const srtPath = path.join(outDir, `${jobId}.srt`);
                  const muxedPath = path.join(outDir, `${jobId}_muxed.mp4`);
                  fs.writeFileSync(srtPath, "\uFEFF" + srtContent, "utf-8");
                  await muxSubtitles(outputPath, srtPath, muxedPath);
                  // 替换原文件
                  fs.unlinkSync(outputPath);
                  fs.renameSync(muxedPath, outputPath);
                  // 清理 SRT
                  fs.unlinkSync(srtPath);
                } catch (muxErr) {
                  // ffmpeg 不可用或嵌入失败，降级为无字幕 MP4
                  console.warn("[export] subtitle mux failed, serving MP4 without subtitles:", muxErr instanceof Error ? muxErr.message : muxErr);
                }
              }

              jobs.set(jobId, {
                progress: 1,
                done: true,
                url: finalUrl,
              });
            } catch (e) {
              jobs.set(jobId, {
                progress: 0,
                done: true,
                error: e instanceof Error ? e.message : String(e),
              });
            }
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: e instanceof Error ? e.message : String(e),
              }),
            );
          }
        });

        // GET /api/export/status?jobId=xxx
        server.middlewares.use("/api/export/status", (req, res) => {
          const url = new URL(req.url ?? "", "http://localhost");
          const jobId = url.searchParams.get("jobId");
          if (!jobId) {
            res.statusCode = 400;
            res.end("missing jobId");
            return;
          }
          const job = jobs.get(jobId);
          if (!job) {
            res.statusCode = 404;
            res.end("job not found");
            return;
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(job));
        });
      },
    },
  ],
  server: {
    port: 5173,
  },
  css: {
    postcss: {
      plugins: [
        // 使用 base 选项显式指定项目根目录，修复 Vite 虚拟路径 /src/index.css
        // 导致 Tailwind v4 误认为 CSS 在 E:\src\ 下而无法解析 @import "tailwindcss"
        tailwindcss({ base: path.resolve(__dirname) }),
      ],
    },
  },
});

function readBody(req: import("http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}
