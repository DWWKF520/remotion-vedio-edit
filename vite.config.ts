import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";

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

              jobs.set(jobId, {
                progress: 1,
                done: true,
                url: `/exports/${jobId}.mp4`,
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
