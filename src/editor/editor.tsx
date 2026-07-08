import React, { useEffect } from "react";
import { ComponentLibrary } from "./component-library";
import { Preview } from "./preview";
import { Timeline } from "./timeline";
import { PropertiesPanel } from "./properties";
import { computeMaxEnd, useEditorStore } from "./store";
import { useExportStore } from "./export-store";
import { getComponentDef } from "./registry";
import { parseSubtitlesText } from "../components/SubtitleTrack";
import { useThemeStore } from "./theme-store";

/**
 * 编辑器主布局（剪映 PC 风格）：
 *
 * ┌──────────────────────────────────────────────────────┐
 * │  顶部导航栏 (Logo + 任务指示器 + 主题切换 + 导出)        │
 * ├───────────┬─────────────────────────┬─────────────────┤
 * │ 素材面板   │       预览播放器          │   属性控制面板   │
 * ├───────────┴─────────────────────────┴─────────────────┤
 * │ 播放控件 + 多层时间轴轨道（底部固定高度可滚动）            │
 * └──────────────────────────────────────────────────────┘
 *
 * - 主题：Tailwind dark 类全局明暗切换，无卡顿
 * - 预览区占据最大视觉面积，时间轴底部固定可滚动
 * - 左右侧边栏支持收起展开
 * - 苹果液态玻璃质感
 */

export const EditorApp: React.FC = () => {
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const removeClip = useEditorStore((s) => s.removeClip);
  const currentFrame = useEditorStore((s) => s.currentFrame);
  const totalDuration = useEditorStore((s) => s.totalDuration);
  const togglePlay = useEditorStore((s) => s.togglePlay);
  const setCurrentFrame = useEditorStore((s) => s.setCurrentFrame);

  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const leftCollapsed = useThemeStore((s) => s.leftCollapsed);
  const rightCollapsed = useThemeStore((s) => s.rightCollapsed);
  const toggleLeft = useThemeStore((s) => s.toggleLeft);
  const toggleRight = useThemeStore((s) => s.toggleRight);

  // 导出 SRT 字幕文件
  const exportSRT = () => {
    const state = useEditorStore.getState();
    const { tracks, clips, fps } = state;

    const subtitleClips: { text: string; startFrame: number; endFrame: number }[] = [];
    for (const track of tracks) {
      for (const cid of track.clipIds) {
        const clip = clips[cid];
        if (!clip) continue;
        const def = getComponentDef(clip.componentKey);
        if (!def) continue;

        if (def.key === "subtitle") {
          const text = String(clip.props.text ?? "").trim();
          if (!text) continue;
          subtitleClips.push({
            text,
            startFrame: clip.start,
            endFrame: clip.start + clip.duration,
          });
        } else if (def.key === "subtitleTrack") {
          const subtitlesText = String(clip.props.subtitlesText ?? "");
          const entries = parseSubtitlesText(subtitlesText);
          for (const entry of entries) {
            subtitleClips.push({
              text: entry.text,
              startFrame: clip.start + Math.round(entry.start * fps),
              endFrame: clip.start + Math.round(entry.end * fps),
            });
          }
        }
      }
    }

    if (subtitleClips.length === 0) {
      alert("时间线上没有字幕片段，请先添加字幕");
      return;
    }

    subtitleClips.sort((a, b) => a.startFrame - b.startFrame);

    const srt = subtitleClips
      .map((item, i) => {
        const start = framesToSRTTime(item.startFrame, fps);
        const end = framesToSRTTime(item.endFrame, fps);
        return `${i + 1}\n${start} --> ${end}\n${item.text}`;
      })
      .join("\n\n");

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

  const activeJobs = jobs.filter((j) => j.status === "rendering");
  const doneJobs = jobs.filter((j) => j.status === "done");
  const errorJobs = jobs.filter((j) => j.status === "error");
  const totalProgress =
    activeJobs.length > 0
      ? activeJobs.reduce((sum, j) => sum + j.progress, 0) / activeJobs.length
      : 0;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-100 font-sans text-slate-800 dark:bg-[#0a0a0c] dark:text-gray-200">
      {/* ===== 顶部导航栏 ===== */}
      <header className="glass flex h-11 flex-shrink-0 items-center gap-2 border-b border-black/5 bg-white/70 px-3 dark:border-white/8 dark:bg-[#161618]/70">
        {/* Logo / 品牌 */}
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-sm font-bold tracking-wide text-transparent">
            Video Editor
          </span>
        </div>

        <div className="mx-1 h-4 w-px bg-black/10 dark:bg-white/10" />

        {/* 侧栏折叠按钮 */}
        <button
          onClick={toggleLeft}
          title={leftCollapsed ? "展开素材面板" : "收起素材面板"}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/5"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18" />
          </svg>
        </button>
        <button
          onClick={toggleRight}
          title={rightCollapsed ? "展开属性面板" : "收起属性面板"}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/5"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M15 3v18" />
          </svg>
        </button>

        {/* 导出任务指示器 */}
        {activeJobs.length > 0 && (
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-blue-300/50 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-500/20 dark:border-blue-500/30 dark:text-blue-300"
            title="Exporting in background..."
          >
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
            </svg>
            <span>导出中 {Math.round(totalProgress * 100)}%</span>
          </button>
        )}
        {activeJobs.length === 0 && doneJobs.length > 0 && (
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-emerald-300/50 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:border-emerald-500/30 dark:text-emerald-300"
            title="Downloads ready"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span>{doneJobs.length} 个已完成</span>
          </button>
        )}
        {activeJobs.length === 0 && errorJobs.length > 0 && doneJobs.length === 0 && (
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-red-300/50 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/20 dark:border-red-500/30 dark:text-red-300"
            title="Export failed"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span>导出失败</span>
          </button>
        )}

        <span className="flex-1" />

        {/* 导出字幕 - 次级按钮 */}
        <button
          onClick={exportSRT}
          className="rounded-lg border border-pink-300/60 bg-transparent px-3 py-1 text-xs font-semibold text-pink-500 transition-all hover:-translate-y-px hover:bg-pink-500/10 hover:shadow-sm dark:border-pink-500/40 dark:text-pink-300"
          title="导出 SRT 字幕文件，可导入剪映"
        >
          导出字幕
        </button>

        {/* 导出 MP4 - 主操作按钮 */}
        <button
          onClick={startExport}
          className="rounded-lg border-none bg-gradient-to-br from-indigo-500 to-violet-500 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-indigo-500/40 active:translate-y-0"
          title="Render current timeline to MP4"
        >
          导出 MP4
        </button>

        <div className="mx-1 h-4 w-px bg-black/10 dark:bg-white/10" />

        {/* 主题切换按钮 - 右上角 */}
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-black/5 hover:text-amber-500 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-amber-300"
          title={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
          aria-label="切换主题"
        >
          {theme === "dark" ? (
            // 月亮图标（当前深色）
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          ) : (
            // 太阳图标（当前浅色）
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          )}
        </button>
      </header>

      {/* ===== 中间区：左侧素材 + 中间预览 + 右侧属性 ===== */}
      <div className="flex min-h-0 flex-1">
        <ComponentLibrary collapsed={leftCollapsed} />
        <Preview />
        <PropertiesPanel collapsed={rightCollapsed} />
      </div>

      {/* ===== 底部：播放控件 + 时间轴 ===== */}
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) setDialogOpen(false);
      }}
    >
      <div className="glass max-h-[80vh] min-w-[400px] max-w-[520px] overflow-y-auto rounded-2xl border border-black/5 bg-white/80 p-6 text-slate-800 shadow-2xl dark:border-white/10 dark:bg-[#1a1a1e]/80 dark:text-gray-200">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-base font-bold">导出任务</span>
          <div className="flex gap-2">
            {!hasActive && jobs.length > 0 && (
              <button
                onClick={clearFinished}
                className="rounded-md border border-black/10 bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600 transition-colors hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
              >
                清除已完成
              </button>
            )}
            <button
              onClick={() => setDialogOpen(false)}
              className="rounded-md border border-black/10 bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600 transition-colors hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
            >
              {hasActive ? "隐藏" : "关闭"}
            </button>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="py-5 text-center text-sm text-slate-400 dark:text-gray-500">
            暂无导出任务，点击“导出 MP4”开始
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {jobs.map((job) => (
              <div
                key={job.jobId}
                className="rounded-lg border border-black/5 bg-white/60 p-3 dark:border-white/5 dark:bg-white/5"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-gray-400">
                    {job.label}
                  </span>
                  {job.status !== "rendering" && (
                    <button
                      onClick={() => removeJob(job.jobId)}
                      className="rounded px-2 py-0.5 text-[10px] text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-500 dark:text-gray-500"
                      title="Remove from list"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {job.status === "rendering" && (
                  <div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-300"
                        style={{ width: `${Math.round(job.progress * 100)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-right text-[10px] text-slate-400 dark:text-gray-500">
                      {Math.round(job.progress * 100)}%
                    </div>
                  </div>
                )}

                {job.status === "done" && job.url && (
                  <div className="flex gap-2">
                    <a
                      href={job.url}
                      download
                      className="flex-1 rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 px-2.5 py-1.5 text-center text-xs font-semibold text-white transition-transform hover:-translate-y-px"
                    >
                      下载 MP4
                    </a>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-black/10 bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                    >
                      打开
                    </a>
                  </div>
                )}

                {job.status === "error" && (
                  <pre className="max-h-30 overflow-auto whitespace-pre-wrap break-words rounded bg-red-500/10 p-2 text-[11px] text-red-500 dark:text-red-300">
                    {job.message}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 text-center text-[10px] text-slate-400 dark:text-gray-600">
          {hasActive ? "关闭对话框不会取消后台导出任务" : ""}
        </div>
      </div>
    </div>
  );
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
