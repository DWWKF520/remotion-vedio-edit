import React, { useCallback, useMemo, useRef, useState } from "react";
import { useEditorStore } from "./store";
import { getComponentDef } from "./registry";
import type { Clip } from "./types";

const TRACK_HEAD_WIDTH = 140;
const TRACK_HEIGHT = 48;
const RULER_HEIGHT = 24;

function frameToX(frame: number, pxPerFrame: number): number {
  return frame * pxPerFrame;
}

function xToFrame(x: number, pxPerFrame: number): number {
  return Math.round(x / pxPerFrame);
}

function formatTime(frame: number, fps: number): string {
  const totalSec = frame / fps;
  const min = Math.floor(totalSec / 60);
  const sec = Math.floor(totalSec % 60);
  const ms = Math.floor((totalSec % 1) * 100);
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

// SVG 图标组件
const IconPlay: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const IconPause: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const IconSkipBack: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
  </svg>
);

const IconSkipForward: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
  </svg>
);

const IconFrameBack: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
  </svg>
);

const IconFrameForward: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M5.5 18l8.5-6-8.5-6v12zM16 6v12h2V6h-2z" />
  </svg>
);

// 各组件类型片段配色（数据驱动，保留渐变）
const clipColors: Record<string, { bg: string; bgSelected: string; border: string }> = {
  helloworld: {
    bg: "linear-gradient(135deg, rgba(139,92,246,0.6), rgba(109,40,217,0.6))",
    bgSelected: "linear-gradient(135deg, rgba(139,92,246,0.9), rgba(109,40,217,0.9))",
    border: "#8b5cf6",
  },
  // 字幕片段：粉色渐变
  subtitle: {
    bg: "linear-gradient(135deg, rgba(236,72,153,0.6), rgba(190,24,93,0.6))",
    bgSelected: "linear-gradient(135deg, rgba(236,72,153,0.9), rgba(190,24,93,0.9))",
    border: "#ec4899",
  },
  // 字幕轨道组件：橙色片段
  subtitleTrack: {
    bg: "linear-gradient(135deg, rgba(251,146,60,0.6), rgba(234,88,12,0.6))",
    bgSelected: "linear-gradient(135deg, rgba(251,146,60,0.9), rgba(234,88,12,0.9))",
    border: "#fb923c",
  },
  claudeType: {
    bg: "linear-gradient(135deg, rgba(217,119,87,0.6), rgba(184,93,61,0.6))",
    bgSelected: "linear-gradient(135deg, rgba(217,119,87,0.9), rgba(184,93,61,0.9))",
    border: "#D97757",
  },
  wechat2d: {
    bg: "linear-gradient(135deg, rgba(7,193,96,0.6), rgba(6,173,86,0.6))",
    bgSelected: "linear-gradient(135deg, rgba(7,193,96,0.9), rgba(6,173,86,0.9))",
    border: "#07C160",
  },
  logo: {
    bg: "linear-gradient(135deg, rgba(6,182,212,0.6), rgba(14,116,144,0.6))",
    bgSelected: "linear-gradient(135deg, rgba(6,182,212,0.9), rgba(14,116,144,0.9))",
    border: "#06b6d4",
  },
  title: {
    bg: "linear-gradient(135deg, rgba(34,197,94,0.6), rgba(21,128,61,0.6))",
    bgSelected: "linear-gradient(135deg, rgba(34,197,94,0.9), rgba(21,128,61,0.9))",
    border: "#22c55e",
  },
};

const defaultClipColor = {
  bg: "linear-gradient(135deg, rgba(249,115,22,0.6), rgba(154,52,18,0.6))",
  bgSelected: "linear-gradient(135deg, rgba(249,115,22,0.9), rgba(154,52,18,0.9))",
  border: "#f97316",
};

// ---------------------------------------------------------------------------
// Optimization 1: ClipBlock — memoized sub-component for per-clip rendering.
// Prevents ALL clips from re-rendering when any single clip's selection state
// changes, since React.memo does a shallow-equality check on all props.
// ---------------------------------------------------------------------------
interface ClipBlockProps {
  clip: Clip;
  trackId: string;
  isSelected: boolean;
  isLocked: boolean;
  pxPerFrame: number;
  color: { bg: string; bgSelected: string; border: string };
  startClipDrag: (
    e: React.MouseEvent,
    clip: Clip,
    mode: "move" | "resize-r" | "resize-l",
    trackId: string,
  ) => void;
  selectClip: (clipId: string | null) => void;
}

const ClipBlock = React.memo(function ClipBlock({
  clip,
  trackId,
  isSelected,
  isLocked,
  pxPerFrame,
  color,
  startClipDrag,
  selectClip,
}: ClipBlockProps) {
  const left = frameToX(clip.start, pxPerFrame);
  const width = Math.max(8, frameToX(clip.duration, pxPerFrame));

  return (
    <div
      draggable={!isLocked}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", clip.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onMouseDown={(e) =>
        !isLocked && startClipDrag(e, clip, "move", trackId)
      }
      onClick={(e) => {
        e.stopPropagation();
        selectClip(clip.id);
      }}
      className="absolute top-1 overflow-hidden rounded-md border transition-[box-shadow,border-color] duration-150"
      style={{
        left,
        width,
        height: TRACK_HEIGHT - 8,
        background: isSelected ? color.bgSelected : color.bg,
        borderColor: isSelected
          ? color.border
          : "rgba(255,255,255,0.08)",
        cursor: isLocked ? "not-allowed" : "move",
        boxShadow: isSelected
          ? `0 0 0 2px ${color.border}40, 0 2px 8px ${color.border}30`
          : "0 1px 3px rgba(0,0,0,0.2)",
        userSelect: "none",
      }}
      title={`${clip.name}  (${clip.start} → ${clip.start + clip.duration})`}
    >
      {/* 左边缘 resize */}
      <div
        onMouseDown={(e) =>
          !isLocked &&
          startClipDrag(e, clip, "resize-l", trackId)
        }
        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-md transition-colors hover:bg-white/20"
        style={{ cursor: isLocked ? "not-allowed" : "ew-resize" }}
      />
      {/* 片段内容 */}
      <div
        className="overflow-hidden whitespace-nowrap py-0 px-2.5 font-semibold text-white"
        style={{
          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
          fontSize: 10,
          lineHeight: `${TRACK_HEIGHT - 8}px`,
          textOverflow: "ellipsis",
        }}
      >
        {clip.name}
      </div>
      {/* 右边缘 resize */}
      <div
        onMouseDown={(e) =>
          !isLocked &&
          startClipDrag(e, clip, "resize-r", trackId)
        }
        className="absolute right-0 top-0 bottom-0 w-1.5 rounded-r-md transition-colors hover:bg-white/20"
        style={{ cursor: isLocked ? "not-allowed" : "ew-resize" }}
      />
    </div>
  );
});

// ---------------------------------------------------------------------------
// Optimization 2: TrackRow — memoized sub-component for per-track rendering.
// Prevents all tracks from re-rendering when only one track's state changes.
// ---------------------------------------------------------------------------
interface TrackRowProps {
  track: {
    id: string;
    name: string;
    kind: string;
    locked: boolean;
    muted: boolean;
    clipIds: string[];
  };
  clips: Record<string, Clip>;
  timelineWidth: number;
  pxPerFrame: number;
  selectedClipId: string | null;
  onClipDropToTrack: (trackId: string, clipId: string) => void;
  startClipDrag: (
    e: React.MouseEvent,
    clip: Clip,
    mode: "move" | "resize-r" | "resize-l",
    trackId: string,
  ) => void;
  selectClip: (clipId: string | null) => void;
}

const TrackRow = React.memo(function TrackRow({
  track,
  clips,
  timelineWidth,
  pxPerFrame,
  selectedClipId,
  onClipDropToTrack,
  startClipDrag,
  selectClip,
}: TrackRowProps) {
  const locked = track.locked;

  return (
    <div
      className="relative border-b border-black/5 dark:border-white/5"
      style={{
        height: TRACK_HEIGHT,
        width: Math.max(timelineWidth, 800),
        background: track.muted
          ? "repeating-linear-gradient(45deg,transparent,transparent 6px,rgba(100,116,139,0.06) 6px,rgba(100,116,139,0.06) 12px)"
          : undefined,
        opacity: track.muted ? 0.5 : 1,
      }}
      onDragOver={(e) => {
        if (!locked) e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        const clipId = e.dataTransfer.getData("text/plain");
        if (clipId && !locked) {
          onClipDropToTrack(track.id, clipId);
        }
      }}
    >
      {track.clipIds.map((cid) => {
        const clip = clips[cid];
        if (!clip) return null;
        const def = getComponentDef(clip.componentKey);
        const selected = cid === selectedClipId;
        const color = clipColors[def?.key ?? ""] ?? defaultClipColor;

        // Optimization 7: key stability verified — cid is a stable string id
        return (
          <ClipBlock
            key={cid}
            clip={clip}
            trackId={track.id}
            isSelected={selected}
            isLocked={locked}
            pxPerFrame={pxPerFrame}
            color={color}
            startClipDrag={startClipDrag}
            selectClip={selectClip}
          />
        );
      })}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Optimization 3: TrackHeader — memoized sub-component for the track head.
// Prevents all track headers from re-rendering when only one track changes.
// ---------------------------------------------------------------------------
interface TrackHeaderProps {
  track: {
    id: string;
    name: string;
    kind: string;
    locked: boolean;
    muted: boolean;
    clipIds: string[];
  };
  toggleTrackMuted: (trackId: string) => void;
  toggleTrackLocked: (trackId: string) => void;
  removeTrack: (trackId: string) => void;
}

const TrackHeader = React.memo(function TrackHeader({
  track,
  toggleTrackMuted,
  toggleTrackLocked,
  removeTrack,
}: TrackHeaderProps) {
  return (
    <div
      className={`flex flex-col justify-center gap-0.5 border-b border-black/5 px-2 py-1 dark:border-white/5 ${
        track.muted ? "bg-black/[0.02] dark:bg-white/[0.01]" : ""
      }`}
      style={{ height: TRACK_HEIGHT }}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <div
            className="h-3 w-[3px] rounded-sm"
            style={{
              background:
                track.kind === "background"
                  ? "linear-gradient(180deg, #38bdf8, #0284c7)"
                  : "linear-gradient(180deg, #fbbf24, #d97706)",
            }}
          />
          <span
            className={`text-[11px] font-semibold ${
              track.muted
                ? "text-slate-400 dark:text-gray-600"
                : "text-slate-700 dark:text-gray-200"
            }`}
          >
            {track.name}
          </span>
        </div>
        <div className="flex gap-0.5">
          <button
            title={track.muted ? "显示" : "隐藏"}
            onClick={() => toggleTrackMuted(track.id)}
            className="track-icon-btn"
          >
            {track.muted ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <path d="M23 1L1 23" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
          <button
            title={track.locked ? "解锁" : "锁定"}
            onClick={() => toggleTrackLocked(track.id)}
            className="track-icon-btn"
          >
            {track.locked ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 019.9-1" />
              </svg>
            )}
          </button>
          <button
            title="删除轨道"
            onClick={() => removeTrack(track.id)}
            className="track-icon-btn"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <span className="pl-[7px] text-[9px] text-slate-400 dark:text-gray-600">
        {track.clipIds.length} 个片段
      </span>
    </div>
  );
});

export const Timeline: React.FC = () => {
  const tracks = useEditorStore((s) => s.tracks);
  const clips = useEditorStore((s) => s.clips);
  const totalDuration = useEditorStore((s) => s.totalDuration);
  const pxPerFrame = useEditorStore((s) => s.pxPerFrame);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const currentFrame = useEditorStore((s) => s.currentFrame);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const fps = useEditorStore((s) => s.fps);

  const selectClip = useEditorStore((s) => s.selectClip);
  const updateClipTiming = useEditorStore((s) => s.updateClipTiming);
  const moveClipToTrack = useEditorStore((s) => s.moveClipToTrack);
  const removeClip = useEditorStore((s) => s.removeClip);
  const splitClip = useEditorStore((s) => s.splitClip);
  const trimClipStart = useEditorStore((s) => s.trimClipStart);
  const trimClipEnd = useEditorStore((s) => s.trimClipEnd);
  const addTrack = useEditorStore((s) => s.addTrack);
  const removeTrack = useEditorStore((s) => s.removeTrack);
  const toggleTrackLocked = useEditorStore((s) => s.toggleTrackLocked);
  const toggleTrackMuted = useEditorStore((s) => s.toggleTrackMuted);
  const setPxPerFrame = useEditorStore((s) => s.setPxPerFrame);
  const setCurrentFrame = useEditorStore((s) => s.setCurrentFrame);
  const togglePlay = useEditorStore((s) => s.togglePlay);

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    clipId: string;
    mode: "move" | "resize-r" | "resize-l";
    startX: number;
    origStart: number;
    origDuration: number;
    origTrackId: string;
  } | null>(null);
  // 对齐参考线位置（frame），null 时不显示
  const [snapFrame, setSnapFrame] = useState<number | null>(null);

  const timelineWidth = frameToX(totalDuration, pxPerFrame);

  // ---------------------------------------------------------------------------
  // Optimization 4: Memoize ruler tick computation so a new array is not
  // allocated on every render.
  // ---------------------------------------------------------------------------
  const rulerTicks = useMemo(() => {
    return Array.from({ length: Math.ceil(totalDuration / 30) + 1 }).map(
      (_, i) => i * 30,
    );
  }, [totalDuration]);

  const onRulerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0);
      const frame = xToFrame(x, pxPerFrame);
      setCurrentFrame(frame);
    },
    [pxPerFrame, setCurrentFrame],
  );

  const startPlayheadDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      useEditorStore.getState().pause();

      const scrollEl = scrollRef.current;
      const onMove = (ev: MouseEvent) => {
        if (!scrollEl) return;
        const rect = scrollEl.getBoundingClientRect();
        const x = ev.clientX - rect.left + scrollEl.scrollLeft;
        const frame = xToFrame(x, pxPerFrame);
        setCurrentFrame(frame);
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [pxPerFrame, setCurrentFrame],
  );

  // ---------------------------------------------------------------------------
  // Optimization 5 (verification): All callbacks access scrollRef via
  // scrollRef.current at call-time (not captured at creation time), so there
  // are no stale closure bugs. The ref value is always fresh when read.
  // ---------------------------------------------------------------------------

  const startClipDrag = useCallback(
    (
      e: React.MouseEvent,
      clip: Clip,
      mode: "move" | "resize-r" | "resize-l",
      trackId: string,
    ) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      selectClip(clip.id);
      dragState.current = {
        clipId: clip.id,
        mode,
        startX: e.clientX,
        origStart: clip.start,
        origDuration: clip.duration,
        origTrackId: trackId,
      };

      // 拖拽时设置全局光标
      document.body.style.cursor = mode === "move" ? "grabbing" : "ew-resize";

      const scrollEl = scrollRef.current;

      const cleanup = () => {
        dragState.current = null;
        setSnapFrame(null);
        document.body.style.cursor = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        scrollEl?.removeEventListener("mouseleave", onMouseLeave);
      };

      const onMouseLeave = () => {
        // 鼠标移出轨道区域，自动结束拖拽（无需点击释放）
        cleanup();
      };

      const onMove = (ev: MouseEvent) => {
        const ds = dragState.current;
        if (!ds) return;
        const dx = ev.clientX - ds.startX;
        const dFrames = Math.round(dx / pxPerFrame);

        let newStart = ds.origStart;
        let newDuration = ds.origDuration;

        if (ds.mode === "move") {
          newStart = Math.max(0, ds.origStart + dFrames);
        } else if (ds.mode === "resize-r") {
          newDuration = Math.max(1, ds.origDuration + dFrames);
        } else if (ds.mode === "resize-l") {
          newStart = Math.max(0, ds.origStart + dFrames);
          newDuration = Math.max(1, ds.origDuration - dFrames);
        }

        // ---------------------------------------------------------------------------
        // Optimization 6 (snapTargets): We intentionally use
        // useEditorStore.getState().clips here instead of the `clips` variable
        // captured in the enclosing closure. This reads the *latest* store state
        // on every mouse-move tick without re-creating this callback whenever
        // clips change, which is critical for drag performance.
        // ---------------------------------------------------------------------------
        const snapThreshold = Math.max(1, Math.round(6 / pxPerFrame));
        const allClips = Object.values(
          useEditorStore.getState().clips,
        ).filter((c) => c.id !== ds.clipId);
        const snapTargets: number[] = [0, currentFrame];
        for (const c of allClips) {
          snapTargets.push(c.start, c.start + c.duration);
        }

        let snappedFrame: number | null = null;
        const newEnd = newStart + newDuration;

        if (ds.mode === "move" || ds.mode === "resize-l") {
          for (const target of snapTargets) {
            if (Math.abs(newStart - target) <= snapThreshold) {
              const diff = target - newStart;
              newStart = target;
              if (ds.mode === "resize-l") {
                newDuration = Math.max(1, newDuration - diff);
              }
              snappedFrame = target;
              break;
            }
          }
        }
        if (snappedFrame === null && (ds.mode === "move" || ds.mode === "resize-r")) {
          for (const target of snapTargets) {
            if (Math.abs(newEnd - target) <= snapThreshold) {
              newDuration = Math.max(1, target - newStart);
              snappedFrame = target;
              break;
            }
          }
        }

        setSnapFrame(snappedFrame);
        updateClipTiming(ds.clipId, newStart, newDuration);
      };

      const onUp = () => {
        cleanup();
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      scrollEl?.addEventListener("mouseleave", onMouseLeave);
    },
    [pxPerFrame, selectClip, updateClipTiming, currentFrame],
  );

  const onClipDropToTrack = useCallback(
    (trackId: string, clipId: string) => {
      if (useEditorStore.getState().clips[clipId]) {
        moveClipToTrack(clipId, trackId);
      }
    },
    [moveClipToTrack],
  );

  return (
    <div className="flex h-[300px] min-h-[250px] flex-shrink-0 flex-col border-t border-black/5 bg-white/50 text-xs text-slate-700 dark:border-white/8 dark:bg-[#121215]/80 dark:text-gray-300">
      {/* ===== 播放控件栏 - 剪映风格：居中的播放按钮 ===== */}
      <div className="glass flex h-10 flex-shrink-0 items-center gap-1.5 border-b border-black/5 bg-white/70 px-4 dark:border-white/8 dark:bg-[#161618]/70">
        {/* 左侧：添加轨道 - 次级按钮 */}
        <button
          onClick={() => addTrack("overlay")}
          className="flex items-center gap-1 rounded-md border border-black/5 bg-black/5 px-2 py-1 text-[11px] text-slate-500 transition-colors hover:bg-black/10 dark:border-white/8 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
          title="添加叠加轨道"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>叠加轨道</span>
        </button>
        <button
          onClick={() => addTrack("background")}
          className="flex items-center gap-1 rounded-md border border-black/5 bg-black/5 px-2 py-1 text-[11px] text-slate-500 transition-colors hover:bg-black/10 dark:border-white/8 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
          title="添加背景轨道"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>背景轨道</span>
        </button>

        <span className="flex-1" />

        {/* 中间：播放控件 */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setCurrentFrame(0)}
            title="回到开头 (Home)"
            className="play-btn"
          >
            <IconSkipBack size={14} />
          </button>
          <button
            onClick={() => setCurrentFrame(currentFrame - 1)}
            title="上一帧 (←)"
            className="play-btn"
          >
            <IconFrameBack size={14} />
          </button>
          <button
            onClick={togglePlay}
            title="播放/暂停 (Space)"
            className={`flex h-8 w-8 items-center justify-center rounded-full text-white transition-all hover:scale-105 active:scale-95 ${
              isPlaying
                ? "bg-violet-500/20 text-violet-600 dark:text-violet-300"
                : "bg-gradient-to-br from-indigo-500 to-violet-500 shadow-md shadow-indigo-500/30"
            }`}
          >
            {isPlaying ? <IconPause size={14} /> : <IconPlay size={14} />}
          </button>
          <button
            onClick={() => setCurrentFrame(currentFrame + 1)}
            title="下一帧 (→)"
            className="play-btn"
          >
            <IconFrameForward size={14} />
          </button>
          <button
            onClick={() => setCurrentFrame(totalDuration - 1)}
            title="跳到结尾 (End)"
            className="play-btn"
          >
            <IconSkipForward size={14} />
          </button>
        </div>

        {/* 时间显示 */}
        <div className="ml-3 min-w-[140px] font-mono text-[11px] text-slate-400 dark:text-gray-500">
          <span className="font-semibold text-slate-800 dark:text-gray-100">
            {formatTime(currentFrame, fps)}
          </span>
          <span className="mx-1 text-slate-300 dark:text-gray-600">/</span>
          <span>{formatTime(totalDuration, fps)}</span>
        </div>

        <span className="flex-1" />

        {/* 右侧：缩放 */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-gray-500">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35M8 11h6M11 8v6" />
          </svg>
          <input
            type="range"
            min={0.5}
            max={20}
            step={0.5}
            value={pxPerFrame}
            onChange={(e) => setPxPerFrame(Number(e.target.value))}
            className="w-20 cursor-pointer"
          />
        </div>

        {/* 选中片段信息 + 分割/裁剪操作 */}
        {selectedClipId && clips[selectedClipId] && (() => {
          const sel = clips[selectedClipId];
          const clipEnd = sel.start + sel.duration;
          // 播放头是否落在 clip 内部（分割/裁剪的前提）
          const canSplit =
            currentFrame > sel.start && currentFrame < clipEnd;
          return (
            <div className="ml-2 flex items-center gap-1 rounded bg-violet-500/10 px-1.5 py-0.5">
              <span className="px-1 text-[11px] text-violet-600 dark:text-violet-300">
                {sel.name}
              </span>
              {/* 分割：在播放头位置切成两段 */}
              <button
                onClick={() => canSplit && splitClip(selectedClipId, currentFrame)}
                disabled={!canSplit}
                className="flex h-6 w-6 items-center justify-center rounded text-violet-500 transition-colors hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-violet-300"
                title="在播放头位置分割 (S)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="6" cy="6" r="3" />
                  <circle cx="6" cy="18" r="3" />
                  <line x1="20" y1="4" x2="8.12" y2="15.88" />
                  <line x1="14.47" y1="14.48" x2="20" y2="20" />
                  <line x1="8.12" y1="8.12" x2="12" y2="12" />
                </svg>
              </button>
              {/* 向前裁剪：删除播放头之前的部分（保留右侧） */}
              <button
                onClick={() => canSplit && trimClipStart(selectedClipId, currentFrame)}
                disabled={!canSplit}
                className="flex h-6 w-6 items-center justify-center rounded text-amber-500 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-amber-300"
                title="向前裁剪：删除播放头之前的部分 ([)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="6" width="18" height="12" rx="1" />
                  <rect x="3" y="6" width="7" height="12" fill="currentColor" stroke="none" opacity="0.35" />
                  <line x1="10" y1="3" x2="10" y2="21" strokeDasharray="2 2" />
                </svg>
              </button>
              {/* 向后裁剪：删除播放头之后的部分（保留左侧） */}
              <button
                onClick={() => canSplit && trimClipEnd(selectedClipId, currentFrame)}
                disabled={!canSplit}
                className="flex h-6 w-6 items-center justify-center rounded text-amber-500 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-amber-300"
                title="向后裁剪：删除播放头之后的部分 (])"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="6" width="18" height="12" rx="1" />
                  <rect x="14" y="6" width="7" height="12" fill="currentColor" stroke="none" opacity="0.35" />
                  <line x1="14" y1="3" x2="14" y2="21" strokeDasharray="2 2" />
                </svg>
              </button>
              {/* 删除 */}
              <button
                onClick={() => removeClip(selectedClipId)}
                className="flex h-6 w-6 items-center justify-center rounded text-red-500 transition-colors hover:bg-red-500/20 dark:text-red-300"
                title="删除 (Del)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            </div>
          );
        })()}
      </div>

      {/* ===== 时间线轨道区 ===== */}
      <div className="flex min-h-0 flex-1">
        {/* 左侧轨道头 */}
        <div
          className="flex-shrink-0 border-r border-black/5 bg-white/70 dark:border-white/8 dark:bg-[#161618]/70"
          style={{ width: TRACK_HEAD_WIDTH }}
        >
          <div
            className="border-b border-black/5 dark:border-white/8"
            style={{ height: RULER_HEIGHT }}
          />
          {/* Optimization 3 & 7: TrackHeader is memoized; key=t.id is stable */}
          {tracks.map((t) => (
            <TrackHeader
              key={t.id}
              track={t}
              toggleTrackMuted={toggleTrackMuted}
              toggleTrackLocked={toggleTrackLocked}
              removeTrack={removeTrack}
            />
          ))}
        </div>

        {/* 右侧时间线滚动区 */}
        <div
          ref={scrollRef}
          className="relative flex-1 overflow-auto bg-slate-100/50 dark:bg-[#0e0e10]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) selectClip(null);
          }}
        >
          {/* 标尺 */}
          <div
            className="sticky top-0 z-[5] cursor-pointer border-b border-black/5 bg-white/80 dark:border-white/8 dark:bg-[#161618]/90"
            style={{
              height: RULER_HEIGHT,
              width: Math.max(timelineWidth, 800),
            }}
            onMouseDown={onRulerMouseDown}
          >
            {/* Optimization 4: uses memoized rulerTicks instead of inline Array.from */}
            {rulerTicks.map((frame, i) => (
              <div
                key={i}
                className="absolute border-l border-black/5 pl-1 text-[9px] leading-[24px] text-slate-400 dark:border-white/8 dark:text-gray-600"
                style={{ left: frameToX(frame, pxPerFrame) }}
              >
                {frame}
              </div>
            ))}
          </div>

          {/* 轨道行 */}
          {/* Optimization 2 & 7: TrackRow is memoized; key=track.id is stable */}
          {tracks.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              clips={clips}
              timelineWidth={timelineWidth}
              pxPerFrame={pxPerFrame}
              selectedClipId={selectedClipId}
              onClipDropToTrack={onClipDropToTrack}
              startClipDrag={startClipDrag}
              selectClip={selectClip}
            />
          ))}

          {/* 多轨对齐参考线（金色） */}
          {snapFrame !== null && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-[18] w-px bg-amber-400"
              style={{
                left: frameToX(snapFrame, pxPerFrame),
                boxShadow: "0 0 6px rgba(251,191,36,0.6)",
              }}
            />
          )}

          {/* 播放头 */}
          <div
            onMouseDown={startPlayheadDrag}
            className="absolute top-0 bottom-0 z-20 cursor-ew-resize"
            style={{
              left: frameToX(currentFrame, pxPerFrame) - 5,
              width: 10,
            }}
            title="拖动播放头"
          >
            {/* 中线 */}
            <div className="absolute left-1 top-0 bottom-0 w-0.5 bg-gradient-to-b from-red-500 to-red-600 shadow-[0_0_4px_rgba(239,68,68,0.4)]" />
            {/* 顶部手柄 */}
            <div
              className="absolute top-0 left-0 h-3 w-2.5 bg-gradient-to-b from-red-500 to-red-600 shadow-[0_1px_3px_rgba(239,68,68,0.3)]"
              style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
