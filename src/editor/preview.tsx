import React, { useEffect, useRef } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { CompositionRenderer } from "./renderer";
import { setPlayerRef, useEditorStore } from "./store";

/**
 * 预览区：用 @remotion/player 的 <Player> 渲染 CompositionRenderer。
 *
 * Player 在普通浏览器环境运行（不在 Composition 内部），所以可以直接使用。
 * - playerRef 通过 module-level 引用暴露给 store，用于 play/pause/seek
 * - frameupdate 事件回调更新 store.currentFrame，驱动时间线播放头
 * - 播放/暂停/seek 由编辑器自己的 UI 控制（见 editor.tsx）
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
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#050508",
        padding: 16,
        position: "relative",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          aspectRatio: `${width} / ${height}`,
          maxHeight: "100%",
          borderRadius: 6,
          overflow: "hidden",
          border: "2px solid rgba(139,92,246,0.25)",
          boxShadow:
            "0 0 0 1px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.04)",
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
  );
};
