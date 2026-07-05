import React, { useCallback, useRef } from "react";
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

  const timelineWidth = frameToX(totalDuration, pxPerFrame);

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

      const onMove = (ev: MouseEvent) => {
        const ds = dragState.current;
        if (!ds) return;
        const dx = ev.clientX - ds.startX;
        const dFrames = Math.round(dx / pxPerFrame);

        if (ds.mode === "move") {
          updateClipTiming(ds.clipId, ds.origStart + dFrames, ds.origDuration);
        } else if (ds.mode === "resize-r") {
          updateClipTiming(
            ds.clipId,
            ds.origStart,
            Math.max(1, ds.origDuration + dFrames),
          );
        } else if (ds.mode === "resize-l") {
          const newStart = Math.max(0, ds.origStart + dFrames);
          const newDur = Math.max(1, ds.origDuration - dFrames);
          updateClipTiming(ds.clipId, newStart, newDur);
        }
      };

      const onUp = () => {
        dragState.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [pxPerFrame, selectClip, updateClipTiming],
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "#121215",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        height: 300,
        minHeight: 250,
        color: "#ddd",
        fontSize: 12,
        flexShrink: 0,
      }}
    >
      {/* 播放控件栏 - 剪映风格：居中的播放按钮 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "#161618",
          height: 40,
          flexShrink: 0,
        }}
      >
        {/* 左侧：添加轨道 */}
        <button
          onClick={() => addTrack("overlay")}
          style={smallToolBtn}
          title="添加叠加轨道"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>叠加轨道</span>
        </button>
        <button
          onClick={() => addTrack("background")}
          style={smallToolBtn}
          title="添加背景轨道"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>背景轨道</span>
        </button>

        <span style={{ flex: 1 }} />

        {/* 中间：播放控件 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <button
            onClick={() => setCurrentFrame(0)}
            title="回到开头 (Home)"
            style={playBtn}
          >
            <IconSkipBack size={14} />
          </button>
          <button
            onClick={() => setCurrentFrame(currentFrame - 1)}
            title="上一帧 (←)"
            style={playBtn}
          >
            <IconFrameBack size={14} />
          </button>
          <button
            onClick={togglePlay}
            title="播放/暂停 (Space)"
            style={{
              ...playBtn,
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: isPlaying
                ? "rgba(139,92,246,0.2)"
                : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isPlaying ? <IconPause size={14} /> : <IconPlay size={14} />}
          </button>
          <button
            onClick={() => setCurrentFrame(currentFrame + 1)}
            title="下一帧 (→)"
            style={playBtn}
          >
            <IconFrameForward size={14} />
          </button>
          <button
            onClick={() => setCurrentFrame(totalDuration - 1)}
            title="跳到结尾 (End)"
            style={playBtn}
          >
            <IconSkipForward size={14} />
          </button>
        </div>

        {/* 时间显示 */}
        <div
          style={{
            marginLeft: 12,
            fontVariantNumeric: "tabular-nums",
            fontSize: 11,
            color: "#999",
            minWidth: 140,
          }}
        >
          <span style={{ color: "#e0e0e0", fontWeight: 600 }}>
            {formatTime(currentFrame, fps)}
          </span>
          <span style={{ color: "#555", margin: "0 4px" }}>/</span>
          <span>{formatTime(totalDuration, fps)}</span>
        </div>

        <span style={{ flex: 1 }} />

        {/* 右侧：缩放 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "#888",
            fontSize: 11,
          }}
        >
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
            style={{
              width: 80,
              accentColor: "#8b5cf6",
              cursor: "pointer",
            }}
          />
        </div>

        {/* 选中片段信息 */}
        {selectedClipId && clips[selectedClipId] && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginLeft: 8,
              padding: "2px 8px",
              background: "rgba(139,92,246,0.1)",
              borderRadius: 4,
              fontSize: 11,
            }}
          >
            <span style={{ color: "#c4b5fd" }}>
              {clips[selectedClipId].name}
            </span>
            <button
              onClick={() => removeClip(selectedClipId)}
              style={{
                background: "rgba(239,68,68,0.15)",
                border: "none",
                borderRadius: 3,
                padding: "1px 6px",
                color: "#fca5a5",
                cursor: "pointer",
                fontSize: 10,
              }}
              title="删除 (Del)"
            >
              删除
            </button>
          </div>
        )}
      </div>

      {/* 时间线轨道区 */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* 左侧轨道头 */}
        <div
          style={{
            width: TRACK_HEAD_WIDTH,
            flexShrink: 0,
            borderRight: "1px solid rgba(255,255,255,0.06)",
            background: "#161618",
          }}
        >
          <div
            style={{
              height: RULER_HEIGHT,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          />
          {tracks.map((t) => (
            <div
              key={t.id}
              style={{
                height: TRACK_HEIGHT,
                padding: "4px 8px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 2,
                background: t.muted
                  ? "rgba(255,255,255,0.01)"
                  : "transparent",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div
                    style={{
                      width: 3,
                      height: 12,
                      borderRadius: 2,
                      background:
                        t.kind === "background"
                          ? "linear-gradient(180deg, #38bdf8, #0284c7)"
                          : "linear-gradient(180deg, #fbbf24, #d97706)",
                    }}
                  />
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 11,
                      color: t.muted ? "#555" : "#ccc",
                    }}
                  >
                    {t.name}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 1 }}>
                  <button
                    title={t.muted ? "显示" : "隐藏"}
                    onClick={() => toggleTrackMuted(t.id)}
                    style={trackIconBtn}
                  >
                    {t.muted ? (
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
                    title={t.locked ? "解锁" : "锁定"}
                    onClick={() => toggleTrackLocked(t.id)}
                    style={trackIconBtn}
                  >
                    {t.locked ? (
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
                    onClick={() => removeTrack(t.id)}
                    style={trackIconBtn}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <span style={{ color: "#555", fontSize: 9, paddingLeft: 7 }}>
                {t.clipIds.length} 个片段
              </span>
            </div>
          ))}
        </div>

        {/* 右侧时间线滚动区 */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflow: "auto",
            position: "relative",
            background: "#0e0e10",
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) selectClip(null);
          }}
        >
          {/* 标尺 */}
          <div
            style={{
              height: RULER_HEIGHT,
              position: "sticky",
              top: 0,
              zIndex: 5,
              background: "#161618",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              width: Math.max(timelineWidth, 800),
              cursor: "pointer",
            }}
            onMouseDown={onRulerMouseDown}
          >
            {Array.from({ length: Math.ceil(totalDuration / 30) + 1 }).map(
              (_, i) => {
                const frame = i * 30;
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: frameToX(frame, pxPerFrame),
                      top: 0,
                      bottom: 0,
                      borderLeft: "1px solid rgba(255,255,255,0.06)",
                      paddingLeft: 4,
                      fontSize: 9,
                      color: "#555",
                      lineHeight: `${RULER_HEIGHT}px`,
                    }}
                  >
                    {frame}
                  </div>
                );
              },
            )}
          </div>

          {/* 轨道行 */}
          {tracks.map((track) => {
            const locked = track.locked;
            return (
              <div
                key={track.id}
                style={{
                  height: TRACK_HEIGHT,
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  width: Math.max(timelineWidth, 800),
                  position: "relative",
                  background: track.muted
                    ? "repeating-linear-gradient(45deg,#0e0e10,#0e0e10 6px,#121215 6px,#121215 12px)"
                    : "#101012",
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
                  const left = frameToX(clip.start, pxPerFrame);
                  const width = Math.max(8, frameToX(clip.duration, pxPerFrame));
                  const selected = cid === selectedClipId;

                  const clipColors: Record<string, { bg: string; bgSelected: string; border: string }> = {
                    helloworld: {
                      bg: "linear-gradient(135deg, rgba(139,92,246,0.6), rgba(109,40,217,0.6))",
                      bgSelected: "linear-gradient(135deg, rgba(139,92,246,0.9), rgba(109,40,217,0.9))",
                      border: "#8b5cf6",
                    },
                    subtitle: {
                      bg: "linear-gradient(135deg, rgba(236,72,153,0.6), rgba(190,24,93,0.6))",
                      bgSelected: "linear-gradient(135deg, rgba(236,72,153,0.9), rgba(190,24,93,0.9))",
                      border: "#ec4899",
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

                  const color = clipColors[def?.key ?? ""] ?? {
                    bg: "linear-gradient(135deg, rgba(249,115,22,0.6), rgba(154,52,18,0.6))",
                    bgSelected: "linear-gradient(135deg, rgba(249,115,22,0.9), rgba(154,52,18,0.9))",
                    border: "#f97316",
                  };

                  return (
                    <div
                      key={cid}
                      draggable={!locked}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", cid);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onMouseDown={(e) =>
                        !locked && startClipDrag(e, clip, "move", track.id)
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        selectClip(cid);
                      }}
                      style={{
                        position: "absolute",
                        top: 4,
                        left,
                        width,
                        height: TRACK_HEIGHT - 8,
                        background: selected ? color.bgSelected : color.bg,
                        borderRadius: 6,
                        border: selected
                          ? `1px solid ${color.border}`
                          : "1px solid rgba(255,255,255,0.08)",
                        cursor: locked ? "not-allowed" : "move",
                        overflow: "hidden",
                        userSelect: "none",
                        boxShadow: selected
                          ? `0 0 0 2px ${color.border}40, 0 2px 8px ${color.border}30`
                          : "0 1px 3px rgba(0,0,0,0.2)",
                        transition: "box-shadow 0.15s, border-color 0.15s",
                      }}
                      title={`${clip.name}  (${clip.start} → ${clip.start + clip.duration})`}
                    >
                      {/* 左边缘 resize */}
                      <div
                        onMouseDown={(e) =>
                          !locked &&
                          startClipDrag(e, clip, "resize-l", track.id)
                        }
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 6,
                          cursor: locked ? "not-allowed" : "ew-resize",
                          borderRadius: "6px 0 0 6px",
                          background: "rgba(255,255,255,0)",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.15)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0)";
                        }}
                      />
                      {/* 片段内容 */}
                      <div
                        style={{
                          padding: "0 10px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          color: "#fff",
                          fontWeight: 600,
                          fontSize: 10,
                          lineHeight: `${TRACK_HEIGHT - 8}px`,
                          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                        }}
                      >
                        {clip.name}
                      </div>
                      {/* 右边缘 resize */}
                      <div
                        onMouseDown={(e) =>
                          !locked &&
                          startClipDrag(e, clip, "resize-r", track.id)
                        }
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: 6,
                          cursor: locked ? "not-allowed" : "ew-resize",
                          borderRadius: "0 6px 6px 0",
                          background: "rgba(255,255,255,0)",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.15)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0)";
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* 播放头 */}
          <div
            onMouseDown={startPlayheadDrag}
            style={{
              position: "absolute",
              left: frameToX(currentFrame, pxPerFrame) - 5,
              top: 0,
              bottom: 0,
              width: 10,
              cursor: "ew-resize",
              zIndex: 20,
            }}
            title="拖动播放头"
          >
            {/* 中线 */}
            <div
              style={{
                position: "absolute",
                left: 4,
                top: 0,
                bottom: 0,
                width: 2,
                background: "linear-gradient(180deg, #ef4444, #dc2626)",
                boxShadow: "0 0 4px rgba(239,68,68,0.4)",
              }}
            />
            {/* 顶部手柄 */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 10,
                height: 12,
                background: "linear-gradient(180deg, #ef4444, #dc2626)",
                clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                boxShadow: "0 1px 3px rgba(239,68,68,0.3)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const playBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  color: "#bbb",
  border: "none",
  borderRadius: 6,
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "all 0.15s",
};

const smallToolBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6,
  padding: "4px 8px",
  color: "#aaa",
  cursor: "pointer",
  fontSize: 11,
  transition: "all 0.15s",
};

const trackIconBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  borderRadius: 3,
  padding: "2px",
  color: "#666",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "color 0.15s",
};
