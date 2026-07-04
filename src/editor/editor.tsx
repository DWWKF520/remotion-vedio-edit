import React, { useEffect } from "react";
import { ComponentLibrary } from "./component-library";
import { Preview } from "./preview";
import { Timeline } from "./timeline";
import { PropertiesPanel } from "./properties";
import { computeMaxEnd, useEditorStore } from "./store";
import { useExportStore } from "./export-store";

/**
 * 编辑器主布局（普通 React 应用，由 Vite 提供开发服务器）：
 *
 * ┌───────────────────────────────────────────────────┐
 * │ Topbar (播放控件 + Export 按钮 + 后台任务指示器)    │
 * ├──────────┬──────────────────────────┬─────────────┤
 * │ Library  │       Preview            │ Properties  │
 * ├──────────┴──────────────────────────┴─────────────┤
 * │ Timeline (multi-track)                            │
 * └───────────────────────────────────────────────────┘
 *
 * - 预览由 @remotion/player 渲染，不依赖 Remotion Studio
 * - 导出是异步的：关闭对话框不取消任务，可继续编辑
 * - 导出时长 = 所有 clip 中 max(start + duration)，不再固定 20s
 */

export const EditorApp: React.FC = () => {
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const removeClip = useEditorStore((s) => s.removeClip);
  const currentFrame = useEditorStore((s) => s.currentFrame);
  const totalDuration = useEditorStore((s) => s.totalDuration);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const fps = useEditorStore((s) => s.fps);
  const togglePlay = useEditorStore((s) => s.togglePlay);
  const setCurrentFrame = useEditorStore((s) => s.setCurrentFrame);

  const jobs = useExportStore((s) => s.jobs);
  const dialogOpen = useExportStore((s) => s.dialogOpen);
  const setDialogOpen = useExportStore((s) => s.setDialogOpen);

  // 快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;

      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentFrame(currentFrame - (e.shiftKey ? 10 : 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentFrame(currentFrame + (e.shiftKey ? 10 : 1));
      } else if (e.key === "Home") {
        e.preventDefault();
        setCurrentFrame(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setCurrentFrame(totalDuration - 1);
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedClipId
      ) {
        e.preventDefault();
        removeClip(selectedClipId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    currentFrame,
    totalDuration,
    selectedClipId,
    removeClip,
    togglePlay,
    setCurrentFrame,
  ]);

  const startExport = async () => {
    const state = useEditorStore.getState();
    // 计算真实导出时长：所有 clip 的 max(start + duration)
    const realDuration = computeMaxEnd(state.tracks, state.clips);
    if (realDuration <= 0) {
      useExportStore.getState().addJob({
        jobId: `error-${Date.now()}`,
        status: "error",
        progress: 0,
        message: "Timeline is empty. Add clips before exporting.",
        startedAt: Date.now(),
        label: "Empty export",
      });
      return;
    }

    const clipCount = Object.keys(state.clips).length;
    const label = `${clipCount} clips · ${(realDuration / state.fps).toFixed(2)}s`;

    // 临时占位 job（在拿到服务端 jobId 之前）
    const tempJobId = `pending-${Date.now()}`;
    useExportStore.getState().addJob({
      jobId: tempJobId,
      status: "rendering",
      progress: 0,
      startedAt: Date.now(),
      label: "Bundling...",
    });

    try {
      const res = await fetch("/api/export/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracks: state.tracks,
          clips: state.clips,
          totalDuration: realDuration, // 真实时长，不是预览的 totalDuration
          fps: state.fps,
          width: state.width,
          height: state.height,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        useExportStore.getState().updateJob(tempJobId, {
          status: "error",
          message: txt,
          label,
          finishedAt: Date.now(),
        });
        return;
      }
      const { jobId } = (await res.json()) as { jobId: string };

      // 用真实 jobId 替换 tempJobId
      useExportStore.getState().removeJob(tempJobId);
      useExportStore.getState().addJob({
        jobId,
        status: "rendering",
        progress: 0,
        startedAt: Date.now(),
        label,
      });

      // 轮询进度
      const poll = async () => {
        try {
          const r = await fetch(`/api/export/status?jobId=${jobId}`);
          if (!r.ok) {
            const txt = await r.text();
            useExportStore.getState().updateJob(jobId, {
              status: "error",
              message: txt,
              finishedAt: Date.now(),
            });
            return;
          }
          const job = (await r.json()) as {
            progress: number;
            done: boolean;
            url?: string;
            error?: string;
          };
          if (job.error) {
            useExportStore.getState().updateJob(jobId, {
              status: "error",
              message: job.error,
              finishedAt: Date.now(),
            });
            return;
          }
          if (job.done && job.url) {
            useExportStore.getState().updateJob(jobId, {
              status: "done",
              progress: 1,
              url: job.url,
              finishedAt: Date.now(),
            });
            return;
          }
          useExportStore.getState().updateJob(jobId, { progress: job.progress });
          setTimeout(poll, 500);
        } catch (e) {
          useExportStore.getState().updateJob(jobId, {
            status: "error",
            message: e instanceof Error ? e.message : String(e),
            finishedAt: Date.now(),
          });
        }
      };
      setTimeout(poll, 500);
    } catch (e) {
      useExportStore.getState().updateJob(tempJobId, {
        status: "error",
        message: e instanceof Error ? e.message : String(e),
        label,
        finishedAt: Date.now(),
      });
    }
  };

  // 任务统计
  const activeJobs = jobs.filter((j) => j.status === "rendering");
  const doneJobs = jobs.filter((j) => j.status === "done");
  const errorJobs = jobs.filter((j) => j.status === "error");
  const totalProgress =
    activeJobs.length > 0
      ? activeJobs.reduce((sum, j) => sum + j.progress, 0) / activeJobs.length
      : 0;

  const seconds = (currentFrame / fps).toFixed(2);
  const totalSeconds = (totalDuration / fps).toFixed(2);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "#0a0a0a",
        overflow: "hidden",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      {/* 顶部 + 播放控件 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 16px",
          background: "#0d0d0d",
          borderBottom: "1px solid #222",
          color: "#eee",
          fontSize: 13,
        }}
      >
        <span style={{ fontWeight: 700, letterSpacing: 0.5 }}>
          Remotion Multi-Track Editor
        </span>
        <span style={{ color: "#555" }}>|</span>

        {/* 播放控件组 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => setCurrentFrame(0)} title="Home" style={iconBtn}>
            ⏮
          </button>
          <button
            onClick={() => setCurrentFrame(currentFrame - 1)}
            title="← (1 frame)"
            style={iconBtn}
          >
            ◀
          </button>
          <button
            onClick={togglePlay}
            title="Space"
            style={{ ...iconBtn, width: 36, fontWeight: 700 }}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button
            onClick={() => setCurrentFrame(currentFrame + 1)}
            title="→ (1 frame)"
            style={iconBtn}
          >
            ▶
          </button>
          <button
            onClick={() => setCurrentFrame(totalDuration - 1)}
            title="End"
            style={iconBtn}
          >
            ⏭
          </button>
        </div>

        <span style={{ color: "#aaa", fontVariantNumeric: "tabular-nums" }}>
          {currentFrame.toString().padStart(3, "0")} / {totalDuration}{" "}
          <span style={{ color: "#666" }}>
            ({seconds}s / {totalSeconds}s)
          </span>
        </span>

        <span style={{ flex: 1 }} />

        {/* 导出任务指示器 */}
        {activeJobs.length > 0 && (
          <button
            onClick={() => setDialogOpen(true)}
            style={{
              ...iconBtn,
              background: "#1e3a8a",
              borderColor: "#3b82f6",
              padding: "4px 10px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            title="Exporting in background..."
          >
            <span>⏳ Exporting{activeJobs.length > 1 ? ` ×${activeJobs.length}` : ""}</span>
            <span style={{ fontSize: 10, color: "#bfdbfe" }}>
              {Math.round(totalProgress * 100)}%
            </span>
          </button>
        )}
        {activeJobs.length === 0 && doneJobs.length > 0 && (
          <button
            onClick={() => setDialogOpen(true)}
            style={{
              ...iconBtn,
              background: "#15803d",
              borderColor: "#22c55e",
              padding: "4px 10px",
            }}
            title="Downloads ready"
          >
            ⬇ {doneJobs.length} download{doneJobs.length > 1 ? "s" : ""} ready
          </button>
        )}
        {activeJobs.length === 0 && errorJobs.length > 0 && doneJobs.length === 0 && (
          <button
            onClick={() => setDialogOpen(true)}
            style={{
              ...iconBtn,
              background: "#7f1d1d",
              borderColor: "#ef4444",
              padding: "4px 10px",
            }}
            title="Export failed"
          >
            ⚠ Export failed
          </button>
        )}

        {/* Export 按钮 */}
        <button
          onClick={startExport}
          style={{
            ...iconBtn,
            background: "#1e40af",
            borderColor: "#3b82f6",
            padding: "4px 14px",
            fontWeight: 600,
          }}
          title="Render current timeline to MP4"
        >
          ⬇ Export MP4
        </button>
      </div>

      {/* 中间区 */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <ComponentLibrary />
        <Preview />
        <PropertiesPanel />
      </div>

      {/* 时间线 */}
      <Timeline />

      {/* 导出对话框 */}
      {dialogOpen && <ExportDialog />}
    </div>
  );
};

const ExportDialog: React.FC = () => {
  const jobs = useExportStore((s) => s.jobs);
  const removeJob = useExportStore((s) => s.removeJob);
  const clearFinished = useExportStore((s) => s.clearFinished);
  const setDialogOpen = useExportStore((s) => s.setDialogOpen);

  const hasActive = jobs.some((j) => j.status === "rendering");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setDialogOpen(false);
      }}
    >
      <div
        style={{
          background: "#161616",
          border: "1px solid #333",
          borderRadius: 8,
          padding: 24,
          minWidth: 400,
          maxWidth: 520,
          maxHeight: "80vh",
          overflowY: "auto",
          color: "#eee",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 16 }}>Export Jobs</span>
          <div style={{ display: "flex", gap: 8 }}>
            {!hasActive && jobs.length > 0 && (
              <button onClick={clearFinished} style={smallBtn}>
                Clear finished
              </button>
            )}
            <button onClick={() => setDialogOpen(false)} style={smallBtn}>
              {hasActive ? "Hide" : "Close"}
            </button>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div style={{ color: "#666", padding: "20px 0", textAlign: "center" }}>
            No export jobs. Click "Export MP4" to start.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {jobs.map((job) => (
              <div
                key={job.jobId}
                style={{
                  background: "#0a0a0a",
                  border: "1px solid #222",
                  borderRadius: 6,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 12, color: "#aaa" }}>
                    {job.label}
                  </span>
                  {job.status !== "rendering" && (
                    <button
                      onClick={() => removeJob(job.jobId)}
                      style={{
                        ...smallBtn,
                        padding: "2px 6px",
                        fontSize: 10,
                      }}
                      title="Remove from list"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {job.status === "rendering" && (
                  <div>
                    <div
                      style={{
                        width: "100%",
                        height: 6,
                        background: "#161616",
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.round(job.progress * 100)}%`,
                          height: "100%",
                          background:
                            "linear-gradient(90deg,#3b82f6,#60a5fa)",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 10,
                        color: "#666",
                        textAlign: "right",
                      }}
                    >
                      {Math.round(job.progress * 100)}%
                    </div>
                  </div>
                )}

                {job.status === "done" && job.url && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <a
                      href={job.url}
                      download
                      style={{
                        flex: 1,
                        display: "block",
                        padding: "6px 10px",
                        background: "#1e40af",
                        border: "1px solid #3b82f6",
                        borderRadius: 4,
                        color: "#fff",
                        textDecoration: "none",
                        textAlign: "center",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Download MP4
                    </a>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "6px 10px",
                        background: "#262626",
                        border: "1px solid #333",
                        borderRadius: 4,
                        color: "#aaa",
                        textDecoration: "none",
                        fontSize: 12,
                      }}
                    >
                      Open
                    </a>
                  </div>
                )}

                {job.status === "error" && (
                  <pre
                    style={{
                      margin: 0,
                      background: "#1a0a0a",
                      padding: 8,
                      borderRadius: 4,
                      fontSize: 11,
                      color: "#fca5a5",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      maxHeight: 120,
                      overflow: "auto",
                    }}
                  >
                    {job.message}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 16, fontSize: 10, color: "#555", textAlign: "center" }}>
          {hasActive
            ? "Closing this dialog won't cancel background jobs."
            : ""}
        </div>
      </div>
    </div>
  );
};

const iconBtn: React.CSSProperties = {
  background: "#262626",
  color: "#ddd",
  border: "1px solid #333",
  borderRadius: 4,
  padding: "4px 8px",
  fontSize: 12,
  cursor: "pointer",
  lineHeight: 1,
  minWidth: 28,
};

const smallBtn: React.CSSProperties = {
  background: "#262626",
  color: "#ddd",
  border: "1px solid #333",
  borderRadius: 4,
  padding: "4px 8px",
  fontSize: 11,
  cursor: "pointer",
};
