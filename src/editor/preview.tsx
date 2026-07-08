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
 * 放大并加边框，占据中间最大视觉面积。
 */
export const Preview: React.FC = () => {
  const width = useEditorStore((s) => s.width);
  const height = useEditorStore((s) => s.height);
  const totalDuration = useEditorStore((s) => s.totalDuration);
  const fps = useEditorStore((s) => s.fps);
  const onFrameChange = useEditorStore((s) => s.onFrameChange);
  const onPlayStateChanged = useEditorStore((s) => s.onPlayStateChanged);

  const ref = useRef<PlayerRef>(null);

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
      onFrameChange(e.detail.frame);
    };
    const onPlay = () => onPlayStateChanged(true);
    const onPause = () => onPlayStateChanged(false);

    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    return () => {
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
    };
  }, [onFrameChange, onPlayStateChanged]);

  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center bg-slate-200/50 p-4 dark:bg-[#050508]">
      <div
        className="aspect-video max-h-full w-full max-w-full overflow-hidden rounded-lg border-2 border-violet-500/30 shadow-2xl shadow-black/20 ring-1 ring-black/5 dark:shadow-black/50 dark:ring-white/5"
        style={{ aspectRatio: `${width} / ${height}` }}
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
  );
};
