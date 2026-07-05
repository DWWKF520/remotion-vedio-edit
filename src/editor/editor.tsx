import React, { useEffect } from "react";
import { ComponentLibrary } from "./component-library";
import { Preview } from "./preview";
import { Timeline } from "./timeline";
import { PropertiesPanel } from "./properties";
import { computeMaxEnd, useEditorStore } from "./store";
import { useExportStore } from "./export-store";
import { getComponentDef } from "./registry";

/**
 * 编辑器主布局（剪映风格）：
 *
 * ┌───────────────────────────────────────────────────┐
 * │  顶部工具栏 (Logo + Export + 任务指示器)            │
 * ├──────────┬──────────────────────────┬─────────────┤
 * │ Library  │       Preview            │ Properties  │
 * ├──────────┴──────────────────────────┴─────────────┤
 * │ ▶ ⏮ ⏭ 时间显示 | 缩放                              │
 * │ Timeline (multi-track)                            │
 * └───────────────────────────────────────────────────┘
 *
 * - 播放控件移到底部时间线上方，类似剪映
 * - 预览由 @remotion/player 渲染
 * - 导出是异步的
 */

export const EditorApp: React.FC = () => {
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const removeClip = useEditorStore((s) => s.removeClip);
  const currentFrame = useEditorStore((s) => s.currentFrame);
  const totalDuration = useEditorStore((s) => s.totalDuration);
  const togglePlay = useEditorStore((s) => s.togglePlay);
  const setCurrentFrame = useEditorStore((s) => s.setCurrentFrame);

  // 导出 SRT 字幕文件
  const exportSRT = () => {
    const state = useEditorStore.getState();
    const { tracks, clips, fps } = state;

    // 收集所有 subtitle 类型的 clip
    const subtitleClips: { text: string; startFrame: number; endFrame: number }[] = [];
    for (const track of tracks) {
      for (const cid of track.clipIds) {
        const clip = clips[cid];
        if (!clip) continue;
        const def = getComponentDef(clip.componentKey);
        if (def?.key !== "subtitle") continue;
        const text = String(clip.props.text ?? "").trim();
        if (!text) continue;
        subtitleClips.push({
          text,
          startFrame: clip.start,
          endFrame: clip.start + clip.duration,
        });
      }
    }

    if (subtitleClips.length === 0) {
      alert("时间线上没有字幕片段，请先添加字幕");
      return;
    }

    // 按起始帧排序
    subtitleClips.sort((a, b) => a.startFrame - b.startFrame);

    // 生成 SRT 内容
    const srt = subtitleClips
      .map((item, i) => {
        const start = framesToSRTTime(item.startFrame, fps);
        const end = framesToSRTTime(item.endFrame, fps);
        return `${i + 1}\n${start} --> ${end}\n${item.text}`;
      })
      .join("\n\n");

    // 下载文件
    const blob = new Blob(["\uFEFF" + srt], { type: "text/srt;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subtitles.srt";
    a.click();
    URL.revokeObjectURL(url);
  };

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
          totalDuration: realDuration,
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

      useExportStore.getState().removeJob(tempJobId);
      useExportStore.getState().addJob({
        jobId,
        status: "rendering",
        progress: 0,
        startedAt: Date.now(),
        label,
      });

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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "#0e0e10",
        overflow: "hidden",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      {/* 顶部工具栏 - 精简版 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "6px 16px",
          background: "#161618",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          color: "#eee",
          fontSize: 13,
          height: 42,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontWeight: 700,
            letterSpacing: 0.5,
            background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: 14,
          }}
        >
          Video Editor
        </span>
        <span style={{ color: "rgba(255,255,255,0.1)" }}>|</span>

        {/* 导出任务指示器 */}
        {activeJobs.length > 0 && (
          <button
            onClick={() => setDialogOpen(true)}
            style={{
              ...topbarBtn,
              background: "rgba(59,130,246,0.15)",
              borderColor: "rgba(59,130,246,0.3)",
              color: "#93c5fd",
            }}
            title="Exporting in background..."
          >
            <span style={{ fontSize: 12 }}>⏳</span>
            <span>导出中 {Math.round(totalProgress * 100)}%</span>
          </button>
        )}
        {activeJobs.length === 0 && doneJobs.length > 0 && (
          <button
            onClick={() => setDialogOpen(true)}
            style={{
              ...topbarBtn,
              background: "rgba(34,197,94,0.15)",
              borderColor: "rgba(34,197,94,0.3)",
              color: "#86efac",
            }}
            title="Downloads ready"
          >
            <span style={{ fontSize: 12 }}>✓</span>
            <span>{doneJobs.length} 个已完成</span>
          </button>
        )}
        {activeJobs.length === 0 && errorJobs.length > 0 && doneJobs.length === 0 && (
          <button
            onClick={() => setDialogOpen(true)}
            style={{
              ...topbarBtn,
              background: "rgba(239,68,68,0.15)",
              borderColor: "rgba(239,68,68,0.3)",
              color: "#fca5a5",
            }}
            title="Export failed"
          >
            <span style={{ fontSize: 12 }}>⚠</span>
            <span>导出失败</span>
          </button>
        )}

        <span style={{ flex: 1 }} />

        {/* Export SRT 按钮 */}
        <button
          onClick={exportSRT}
          style={{
            background: "transparent",
            border: "1px solid rgba(236,72,153,0.4)",
            borderRadius: 8,
            padding: "6px 14px",
            fontWeight: 600,
            color: "#f9a8d4",
            cursor: "pointer",
            fontSize: 12,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(236,72,153,0.1)";
            e.currentTarget.style.borderColor = "rgba(236,72,153,0.6)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(236,72,153,0.4)";
          }}
          title="导出 SRT 字幕文件，可导入剪映"
        >
          导出字幕
        </button>

        {/* Export 按钮 */}
        <button
          onClick={startExport}
          style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            border: "none",
            borderRadius: 8,
            padding: "6px 18px",
            fontWeight: 600,
            color: "#fff",
            cursor: "pointer",
            fontSize: 12,
            transition: "all 0.2s",
            boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(99,102,241,0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(99,102,241,0.3)";
          }}
          title="Render current timeline to MP4"
        >
          导出 MP4
        </button>
      </div>

      {/* 中间区：预览 + 侧栏 */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <ComponentLibrary />
        <Preview />
        <PropertiesPanel />
      </div>

      {/* 底部：播放控件 + 时间线 */}
      <Timeline />

      {/* 导出对话框 */}
      {dialogOpen && <ExportDialog />}
    </div>
  );
};

const topbarBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "transparent",
  border: "1px solid transparent",
  borderRadius: 6,
  padding: "4px 10px",
  cursor: "pointer",
  fontSize: 12,
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
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
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
          background: "#1a1a1e",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          padding: 24,
          minWidth: 400,
          maxWidth: 520,
          maxHeight: "80vh",
          overflowY: "auto",
          color: "#eee",
          boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
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
          <span style={{ fontWeight: 700, fontSize: 16 }}>导出任务</span>
          <div style={{ display: "flex", gap: 8 }}>
            {!hasActive && jobs.length > 0 && (
              <button onClick={clearFinished} style={dialogBtn}>
                清除已完成
              </button>
            )}
            <button onClick={() => setDialogOpen(false)} style={dialogBtn}>
              {hasActive ? "隐藏" : "关闭"}
            </button>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div style={{ color: "#555", padding: "20px 0", textAlign: "center" }}>
            暂无导出任务，点击"导出 MP4"开始
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {jobs.map((job) => (
              <div
                key={job.jobId}
                style={{
                  background: "#121215",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
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
                        ...dialogBtn,
                        padding: "2px 8px",
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
                        height: 4,
                        background: "#262626",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.round(job.progress * 100)}%`,
                          height: "100%",
                          background:
                            "linear-gradient(90deg,#6366f1,#8b5cf6)",
                          borderRadius: 2,
                          transition: "width 0.3s",
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
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        border: "none",
                        borderRadius: 6,
                        color: "#fff",
                        textDecoration: "none",
                        textAlign: "center",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      下载 MP4
                    </a>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "6px 10px",
                        background: "#262626",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 6,
                        color: "#aaa",
                        textDecoration: "none",
                        fontSize: 12,
                      }}
                    >
                      打开
                    </a>
                  </div>
                )}

                {job.status === "error" && (
                  <pre
                    style={{
                      margin: 0,
                      background: "rgba(239,68,68,0.08)",
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

        <div style={{ marginTop: 16, fontSize: 10, color: "#444", textAlign: "center" }}>
          {hasActive
            ? "关闭对话框不会取消后台导出任务"
            : ""}
        </div>
      </div>
    </div>
  );
};

const dialogBtn: React.CSSProperties = {
  background: "#262626",
  color: "#ccc",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6,
  padding: "4px 10px",
  fontSize: 11,
  cursor: "pointer",
};

/** 将帧数转换为 SRT 时间格式 HH:MM:SS,mmm */
function framesToSRTTime(frame: number, fps: number): string {
  const totalMs = Math.round((frame / fps) * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60) % 60;
  const hr = Math.floor(totalSec / 3600);
  return `${hr.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}
