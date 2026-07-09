import React, { useEffect, useRef } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { CompositionRenderer } from "./renderer";
import { setPlayerRef, useEditorStore } from "./store";

/**
 * 预览区：用 @remotion/player 的 <Player> 渲染 CompositionRenderer。
 * - playerRef 通过 module-level 引用暴露给 store，用于 play/pause/seek
 * - frameupdate 事件回调更新 store.currentFrame，驱动时间线播放头
 * - 播放/暂停/seek 由编辑器自己的 UI 控制（见 editor.tsx）
 *
 * 顶部带画幅比例选择器，切换后预览与导出均按该比例。
 */

/** 画幅预设：label 显示，w/h 为导出像素尺寸，比例由 w/h 推导 */
const ASPECT_PRESETS: {
  label: string;
  w: number;
  h: number;
}[] = [
  { label: "16:9 横屏", w: 1920, h: 1080 },
  { label: "9:16 竖屏", w: 1080, h: 1920 },
  { label: "1:1 方形", w: 1080, h: 1080 },
  { label: "4:3 传统", w: 1440, h: 1080 },
  { label: "3:4 竖版", w: 1080, h: 1440 },
  { label: "4:5 人像", w: 1080, h: 1350 },
  { label: "21:9 影院", w: 2560, h: 1080 },
];

export const Preview: React.FC = React.memo(() => {
  const width = useEditorStore((s) => s.width);
  const height = useEditorStore((s) => s.height);
  const totalDuration = useEditorStore((s) => s.totalDuration);
  const fps = useEditorStore((s) => s.fps);
  const onFrameChange = useEditorStore((s) => s.onFrameChange);
  const onPlayStateChanged = useEditorStore((s) => s.onPlayStateChanged);
  const setCanvasSize = useEditorStore((s) => s.setCanvasSize);

  const ref = useRef<PlayerRef>(null);
  const callbacksRef = useRef({ onFrameChange, onPlayStateChanged });
  callbacksRef.current = { onFrameChange, onPlayStateChanged };

  // 把 playerRef 注入 store
  useEffect(() => {
    setPlayerRef(ref.current);
    return () => setPlayerRef(null);
  }, []);

  // 订阅 Player 事件，把帧/播放状态变化同步到 store
  useEffect(() => {
    const p = ref.current;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) => {
      callbacksRef.current.onFrameChange(e.detail.frame);
    };
    const onPlay = () => callbacksRef.current.onPlayStateChanged(true);
    const onPause = () => callbacksRef.current.onPlayStateChanged(false);
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    return () => {
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
    };
  }, []); // empty deps — stable event subscription

  // 当前预设值（用于下拉显示），通过宽高匹配
  const currentPresetValue = `${width}x${height}`;
  const matchedPreset = ASPECT_PRESETS.find(
    (p) => `${p.w}x${p.h}` === currentPresetValue,
  );

  // 竖屏画幅时高度优先，横屏时宽度优先
  const isPortrait = height > width;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-slate-200/50 dark:bg-[#050508]">
      {/* 顶部工具栏：画幅比例选择 */}
      <div className="flex h-8 flex-shrink-0 items-center gap-2 border-b border-black/5 bg-white/60 px-3 dark:border-white/8 dark:bg-[#161618]/60">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">
          画幅
        </span>
        <select
          value={matchedPreset ? currentPresetValue : "custom"}
          onChange={(e) => {
            const preset = ASPECT_PRESETS.find(
              (p) => `${p.w}x${p.h}` === e.target.value,
            );
            if (preset) setCanvasSize(preset.w, preset.h);
          }}
          className="rounded-md border border-black/10 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700 outline-none transition-colors focus:border-violet-500 dark:border-white/10 dark:bg-black/30 dark:text-gray-200 dark:focus:border-violet-400"
          title="切换画幅比例（预览和导出均使用）"
        >
          {ASPECT_PRESETS.map((p) => (
            <option key={`${p.w}x${p.h}`} value={`${p.w}x${p.h}`}>
              {p.label} · {p.w}×{p.h}
            </option>
          ))}
          {!matchedPreset && (
            <option value="custom">
              自定义 · {width}×{height}
            </option>
          )}
        </select>
        <span className="text-[10px] text-slate-400 dark:text-gray-500">
          导出将按此尺寸渲染
        </span>
      </div>

      {/* 预览画布 */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-2">
        <div
          className="overflow-hidden rounded-lg border-2 border-violet-500/30 shadow-2xl shadow-black/20 ring-1 ring-black/5 dark:shadow-black/50 dark:ring-white/5"
          style={{
            aspectRatio: `${width} / ${height}`,
            // 竖屏：高度优先填满，宽度按比例；横屏：宽度优先填满，高度按比例。
            // 配合 max-h/max-w 防止溢出，浏览器自动选择最大可用尺寸。
            maxHeight: "100%",
            maxWidth: "100%",
            height: isPortrait ? "100%" : "auto",
            width: isPortrait ? "auto" : "100%",
          }}
        >
          <Player
            ref={ref}
            component={CompositionRenderer}
            durationInFrames={totalDuration}
            fps={fps}
            compositionWidth={width}
            compositionHeight={height}
            style={{ width: "100%", height: "100%" }}
            controls={false}
            loop={false}
            autoPlay={false}
            clickToPlay={false}
          />
        </div>
      </div>
    </div>
  );
});
