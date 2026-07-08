import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/postcss";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { execFile } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

// 获取 ffmpeg 可执行文件路径
// 全局安装的 @ffmpeg-installer/ffmpeg 路径
const FFMPEG_PATH = "D:/nodejs/node_global/node_modules/@ffmpeg-installer/ffmpeg/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe";

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

// bundle 缓存：第一次导出时 bundle（10-30s），后续复用
let bundlePromise: Promise<string> | null = null;
async function getBundle(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = bundle({
      entryPoint: path.resolve(__dirname, "src/index.ts"),
      // 用 webpack override 避免某些 Remotion 内部依赖问题
      onProgress: () => {},
    });
  }
  return bundlePromise;
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

            const jobId = Math.random().toString(36).slice(2, 10);
            jobs.set(jobId, { progress: 0, done: false });
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ jobId }));

            // 异步渲染
            try {
              const serveUrl = await getBundle();
              const composition = await selectComposition({
                serveUrl,
                id: "EditorExport",
                inputProps: {
                  tracks: payload.tracks,
                  clips: payload.clips,
                },
              });

              // 覆盖时长（Composition 默认 600，按实际 totalDuration）
              const total = Math.max(
                1,
                Math.round(payload.totalDuration || 600),
              );
              composition.durationInFrames = total;
              if (payload.fps) composition.fps = payload.fps;
              if (payload.width) composition.width = payload.width;
              if (payload.height) composition.height = payload.height;

              const outDir = ensureExportDir();
              const outputPath = path.join(outDir, `${jobId}.mp4`);

              await renderMedia({
                composition,
                serveUrl,
                codec: "h264",
                outputLocation: outputPath,
                inputProps: {
                  tracks: payload.tracks,
                  clips: payload.clips,
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

              let finalUrl = `/exports/${jobId}.mp4`;

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
                  console.log(`[export] subtitles muxed into ${jobId}.mp4`);
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
