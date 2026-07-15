import React, { useEffect, useRef } from "react";
import { ComponentLibrary } from "./component-library";
import { Preview } from "./preview";
import { Timeline } from "./timeline";
import { PropertiesPanel } from "./properties";
import { computeMaxEnd, useEditorStore } from "./store";
import { useExportStore } from "./export-store";
import { getComponentDef } from "./registry";
import { parseSubtitlesText } from "../components/clips/SubtitleTrack";
import { useThemeStore } from "./theme-store";
import { gsap, useGSAP } from "./gsap-setup";

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
  const splitClip = useEditorStore((s) => s.splitClip);
  const trimClipStart = useEditorStore((s) => s.trimClipStart);
  const trimClipEnd = useEditorStore((s) => s.trimClipEnd);
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
      } else if (
        (e.key === "s" || e.key === "S") &&
        selectedClipId
      ) {
        // 分割：在播放头位置切成两段
        const clip = useEditorStore.getState().clips[selectedClipId];
        if (
          clip &&
          currentFrame > clip.start &&
          currentFrame < clip.start + clip.duration
        ) {
          e.preventDefault();
          splitClip(selectedClipId, currentFrame);
        }
      } else if (e.key === "[" && selectedClipId) {
        // 向前裁剪：删除播放头之前的部分
        const clip = useEditorStore.getState().clips[selectedClipId];
        if (
          clip &&
          currentFrame > clip.start &&
          currentFrame < clip.start + clip.duration
        ) {
          e.preventDefault();
          trimClipStart(selectedClipId, currentFrame);
        }
      } else if (e.key === "]" && selectedClipId) {
        // 向后裁剪：删除播放头之后的部分
        const clip = useEditorStore.getState().clips[selectedClipId];
        if (
          clip &&
          currentFrame > clip.start &&
          currentFrame < clip.start + clip.duration
        ) {
          e.preventDefault();
          trimClipEnd(selectedClipId, currentFrame);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    currentFrame,
    totalDuration,
    selectedClipId,
    removeClip,
    splitClip,
    trimClipStart,
    trimClipEnd,
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
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#f2f2f7] font-sans text-[#1d1d1f] dark:bg-black dark:text-[#f5f5f7]">
      {/* ===== 顶部导航栏 ===== */}
      <header className="glass flex h-11 flex-shrink-0 items-center gap-2 border-b border-[var(--separator)] bg-[var(--surface-overlay)] px-3 dark:border-[var(--separator)] dark:bg-[#1c1c1e]/72">
        {/* Logo / 品牌 */}
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#007aff] shadow-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight text-[#007aff]">
            Video Editor
          </span>
        </div>

        <div className="mx-1 h-4 w-px bg-[var(--separator-opaque)] dark:bg-[var(--separator-opaque)]" />

        {/* 侧栏折叠按钮 */}
        <button
          onClick={toggleLeft}
          title={leftCollapsed ? "展开素材面板" : "收起素材面板"}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#8e8e93] transition-colors hover:bg-[var(--separator)] dark:text-[#8e8e93] dark:hover:bg-[var(--separator)]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18" />
          </svg>
        </button>
        <button
          onClick={toggleRight}
          title={rightCollapsed ? "展开属性面板" : "收起属性面板"}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#8e8e93] transition-colors hover:bg-[var(--separator)] dark:text-[#8e8e93] dark:hover:bg-[var(--separator)]"
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
            className="flex items-center gap-1.5 rounded-md border border-[#007aff]/25 bg-[#007aff]/10 px-2.5 py-1 text-xs font-medium text-[#007aff] transition-colors hover:bg-[#007aff]/15 dark:border-[#0a84ff]/30 dark:text-[#4da2ff]"
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
            className="flex items-center gap-1.5 rounded-md border border-[#34c759]/25 bg-[#34c759]/10 px-2.5 py-1 text-xs font-medium text-[#34c759] transition-colors hover:bg-[#34c759]/15 dark:border-[#30d158]/30 dark:text-[#30d158]"
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
            className="flex items-center gap-1.5 rounded-md border border-[#ff3b30]/25 bg-[#ff3b30]/10 px-2.5 py-1 text-xs font-medium text-[#ff3b30] transition-colors hover:bg-[#ff3b30]/15 dark:border-[#ff453a]/30 dark:text-[#ff453a]"
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
          className="rounded-full border border-[var(--separator-opaque)] bg-transparent px-3 py-1 text-xs font-semibold text-[#007aff] transition-all hover:bg-[#007aff]/8 dark:border-[var(--separator-opaque)] dark:text-[#4da2ff]"
          title="导出 SRT 字幕文件，可导入剪映"
        >
          导出字幕
        </button>

        {/* 导出 MP4 - 主操作按钮 */}
        <button
          onClick={startExport}
          className="rounded-full border-none bg-[#007aff] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#0071e3] active:scale-95"
          title="Render current timeline to MP4"
        >
          导出 MP4
        </button>

        <div className="mx-1 h-4 w-px bg-[var(--separator-opaque)] dark:bg-[var(--separator-opaque)]" />

        {/* 主题切换按钮 - 右上角 */}
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8e8e93] transition-all hover:bg-[var(--separator)] hover:text-[#ff9500] dark:text-[#8e8e93] dark:hover:bg-[var(--separator)] dark:hover:text-[#ffb340]"
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

  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // GSAP 入场动画：背景渐显 + 面板弹性缩放（替代原 animate-fade-in）
  useGSAP(
    () => {
      const tl = gsap.timeline();
      tl.from(overlayRef.current, { opacity: 0, duration: 0.2 }).from(
        panelRef.current,
        { opacity: 0, scale: 0.96, y: 12, duration: 0.3, ease: "back.out(1.4)" },
        "-=0.1",
      );
    },
    { scope: overlayRef },
  );

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) setDialogOpen(false);
      }}
    >
      <div
        ref={panelRef}
        className="glass max-h-[80vh] min-w-[400px] max-w-[520px] overflow-y-auto rounded-2xl border border-[var(--separator)] bg-[var(--surface-overlay)] p-6 text-[#1d1d1f] shadow-2xl dark:border-[var(--separator-opaque)] dark:bg-[#2c2c2e]/80 dark:text-[#f5f5f7]"
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-base font-bold">导出任务</span>
          <div className="flex gap-2">
            {!hasActive && jobs.length > 0 && (
              <button
                onClick={clearFinished}
                className="rounded-md border border-[var(--separator-opaque)] bg-[#f2f2f7] px-2.5 py-1 text-[11px] text-[#48484a] transition-colors hover:bg-[#e5e5ea] dark:border-[var(--separator-opaque)] dark:bg-[var(--separator)] dark:text-[#aeaeb2] dark:hover:bg-[var(--separator-opaque)]"
              >
                清除已完成
              </button>
            )}
            <button
              onClick={() => setDialogOpen(false)}
              className="rounded-md border border-[var(--separator-opaque)] bg-[#f2f2f7] px-2.5 py-1 text-[11px] text-[#48484a] transition-colors hover:bg-[#e5e5ea] dark:border-[var(--separator-opaque)] dark:bg-[var(--separator)] dark:text-[#aeaeb2] dark:hover:bg-[var(--separator-opaque)]"
            >
              {hasActive ? "隐藏" : "关闭"}
            </button>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="py-5 text-center text-sm text-[#8e8e93] dark:text-[#8e8e93]">
            暂无导出任务，点击“导出 MP4”开始
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {jobs.map((job) => (
              <div
                key={job.jobId}
                className="rounded-lg border border-[var(--separator)] bg-[var(--surface-overlay)] p-3 dark:border-[var(--separator)] dark:bg-[var(--separator)]"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-[#8e8e93] dark:text-[#8e8e93]">
                    {job.label}
                  </span>
                  {job.status !== "rendering" && (
                    <button
                      onClick={() => removeJob(job.jobId)}
                      className="rounded px-2 py-0.5 text-[10px] text-[#8e8e93] transition-colors hover:bg-[#ff3b30]/10 hover:text-[#ff3b30] dark:text-[#8e8e93]"
                      title="Remove from list"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {job.status === "rendering" && (
                  <div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-[#e5e5ea] dark:bg-[var(--separator-opaque)]">
                      <div
                        className="h-full rounded-full bg-[#007aff] transition-[width] duration-300"
                        style={{ width: `${Math.round(job.progress * 100)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-right text-[10px] text-[#8e8e93] dark:text-[#8e8e93]">
                      {Math.round(job.progress * 100)}%
                    </div>
                  </div>
                )}

                {job.status === "done" && job.url && (
                  <div className="flex gap-2">
                    <a
                      href={job.url}
                      download
                      className="flex-1 rounded-md bg-[#007aff] px-2.5 py-1.5 text-center text-xs font-semibold text-white transition-transform hover:-translate-y-px"
                    >
                      下载 MP4
                    </a>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-[var(--separator-opaque)] bg-[#f2f2f7] px-2.5 py-1.5 text-xs text-[#48484a] transition-colors hover:bg-[#e5e5ea] dark:border-[var(--separator-opaque)] dark:bg-[var(--separator)] dark:text-[#aeaeb2] dark:hover:bg-[var(--separator-opaque)]"
                    >
                      打开
                    </a>
                  </div>
                )}

                {job.status === "error" && (
                  <pre className="max-h-30 overflow-auto whitespace-pre-wrap break-words rounded bg-[#ff3b30]/10 p-2 text-[11px] text-[#ff3b30] dark:text-[#ff453a]">
                    {job.message}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 text-center text-[10px] text-[#8e8e93] dark:text-[#48484a]">
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
