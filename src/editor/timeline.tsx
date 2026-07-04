import React, { useCallback, useRef } from "react";
import { useEditorStore } from "./store";
import { getComponentDef } from "./registry";
import type { Clip } from "./types";

const TRACK_HEAD_WIDTH = 160;
const TRACK_HEIGHT = 56;
const RULER_HEIGHT = 28;

function frameToX(frame: number, pxPerFrame: number): number {
  return frame * pxPerFrame;
}

function xToFrame(x: number, pxPerFrame: number): number {
  return Math.round(x / pxPerFrame);
}

export const Timeline: React.FC = () => {
  const tracks = useEditorStore((s) => s.tracks);
  const clips = useEditorStore((s) => s.clips);
  const totalDuration = useEditorStore((s) => s.totalDuration);
  const pxPerFrame = useEditorStore((s) => s.pxPerFrame);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);

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

  // 播放头跟随 Player 的当前帧（由 frameupdate 事件同步到 store）
  const currentFrame = useEditorStore((s) => s.currentFrame);

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

  // 点击标尺：seek 到对应帧
  const onRulerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0);
      const frame = xToFrame(x, pxPerFrame);
      setCurrentFrame(frame);
    },
    [pxPerFrame, setCurrentFrame],
  );

  // 拖动播放头：mousedown 启动，mousemove 持续 seek，mouseup 结束
  const startPlayheadDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // 拖动开始时暂停播放
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
        background: "#0f0f0f",
        borderTop: "1px solid #222",
        minHeight: 260,
        height: 320,
        color: "#ddd",
        fontSize: 12,
      }}
    >
      {/* 工具栏 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px",
          borderBottom: "1px solid #222",
          background: "#161616",
        }}
      >
        <span style={{ fontWeight: 600, marginRight: 8 }}>Timeline</span>
        <button onClick={() => addTrack("overlay")} style={btnStyle}>
          + Overlay Track
        </button>
        <button onClick={() => addTrack("background")} style={btnStyle}>
          + BG Track
        </button>
        <span style={{ flex: 1 }} />
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Zoom
          <input
            type="range"
            min={0.5}
            max={20}
            step={0.5}
            value={pxPerFrame}
            onChange={(e) => setPxPerFrame(Number(e.target.value))}
            style={{ width: 120 }}
          />
        </label>
        <span style={{ color: "#888" }}>
          Frame {currentFrame} / {totalDuration}
        </span>
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* 左侧轨道头 */}
        <div
          style={{
            width: TRACK_HEAD_WIDTH,
            flexShrink: 0,
            borderRight: "1px solid #222",
            background: "#161616",
          }}
        >
          <div style={{ height: RULER_HEIGHT, borderBottom: "1px solid #222" }} />
          {tracks.map((t) => (
            <div
              key={t.id}
              style={{
                height: TRACK_HEIGHT,
                padding: "6px 8px",
                borderBottom: "1px solid #1c1c1c",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 4,
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
                <span
                  style={{
                    fontWeight: 600,
                    color: t.kind === "background" ? "#7dd3fc" : "#fbbf24",
                  }}
                >
                  {t.name}
                </span>
                <div style={{ display: "flex", gap: 2 }}>
                  <button
                    title={t.muted ? "Show" : "Hide"}
                    onClick={() => toggleTrackMuted(t.id)}
                    style={iconBtn}
                  >
                    {t.muted ? "🙈" : "👁"}
                  </button>
                  <button
                    title={t.locked ? "Unlock" : "Lock"}
                    onClick={() => toggleTrackLocked(t.id)}
                    style={iconBtn}
                  >
                    {t.locked ? "🔒" : "🔓"}
                  </button>
                  <button
                    title="Remove track"
                    onClick={() => removeTrack(t.id)}
                    style={iconBtn}
                  >
                    ✕
                  </button>
                </div>
              </div>
              <span style={{ color: "#666", fontSize: 10 }}>
                {t.clipIds.length} clips
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
            background: "#0a0a0a",
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
              background: "#161616",
              borderBottom: "1px solid #222",
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
                      borderLeft: "1px solid #2a2a2a",
                      paddingLeft: 4,
                      fontSize: 10,
                      color: "#888",
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
                  borderBottom: "1px solid #1c1c1c",
                  width: Math.max(timelineWidth, 800),
                  position: "relative",
                  background: track.muted
                    ? "repeating-linear-gradient(45deg,#0a0a0a,#0a0a0a 6px,#0e0e0e 6px,#0e0e0e 12px)"
                    : "#0c0c0c",
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
                        top: 6,
                        left,
                        width,
                        height: TRACK_HEIGHT - 12,
                        background: selected
                          ? "linear-gradient(135deg,#2563eb,#1e40af)"
                          : def?.key === "helloworld"
                            ? "linear-gradient(135deg,#7c3aed,#5b21b6)"
                            : def?.key === "logo"
                              ? "linear-gradient(135deg,#0891b2,#155e75)"
                              : def?.key === "title"
                                ? "linear-gradient(135deg,#16a34a,#14532d)"
                                : "linear-gradient(135deg,#ea580c,#7c2d12)",
                        borderRadius: 4,
                        border: selected
                          ? "1px solid #60a5fa"
                          : "1px solid rgba(255,255,255,0.1)",
                        cursor: locked ? "not-allowed" : "move",
                        overflow: "hidden",
                        userSelect: "none",
                        boxShadow: selected
                          ? "0 0 0 2px rgba(96,165,250,0.5)"
                          : "none",
                      }}
                      title={`${clip.name}  (${clip.start} → ${clip.start + clip.duration})`}
                    >
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
                          background: "rgba(255,255,255,0.15)",
                        }}
                      />
                      <div
                        style={{
                          padding: "2px 10px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          color: "#fff",
                          fontWeight: 600,
                          fontSize: 11,
                          lineHeight: `${TRACK_HEIGHT - 12}px`,
                        }}
                      >
                        {clip.name}
                      </div>
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
                          background: "rgba(255,255,255,0.15)",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* 播放头（可拖动） */}
          <div
            onMouseDown={startPlayheadDrag}
            style={{
              position: "absolute",
              left: frameToX(currentFrame, pxPerFrame) - 4,
              top: 0,
              bottom: 0,
              width: 10,
              cursor: "ew-resize",
              zIndex: 20,
            }}
            title="Drag to seek"
          >
            {/* 中线 */}
            <div
              style={{
                position: "absolute",
                left: 4,
                top: 0,
                bottom: 0,
                width: 2,
                background: "#ef4444",
              }}
            />
            {/* 顶部三角手柄 */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: -1,
                width: 12,
                height: 14,
                background: "#ef4444",
                clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "4px 12px",
          background: "#161616",
          borderTop: "1px solid #222",
          display: "flex",
          alignItems: "center",
          gap: 12,
          color: "#888",
        }}
      >
        {selectedClipId ? (
          <>
            <span>Selected: {clips[selectedClipId]?.name}</span>
            <button
              onClick={() => removeClip(selectedClipId)}
              style={{ ...btnStyle, background: "#7f1d1d" }}
            >
              Delete (Del)
            </button>
          </>
        ) : (
          <span>
            Click a clip to select. Drag to move. Edges to resize. Use Studio
            playbar to play/seek.
          </span>
        )}
      </div>
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  background: "#262626",
  color: "#ddd",
  border: "1px solid #333",
  borderRadius: 4,
  padding: "4px 8px",
  fontSize: 11,
  cursor: "pointer",
};

const iconBtn: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #333",
  borderRadius: 3,
  padding: "0 4px",
  color: "#aaa",
  cursor: "pointer",
  fontSize: 11,
  lineHeight: "16px",
};
