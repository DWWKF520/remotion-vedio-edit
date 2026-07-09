import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { useEditorStore } from "./store";
import { getComponentDef } from "./registry";
import type { Clip, Track } from "./types";

/**
 * 把 tracks/clips 渲染成 React 树。
 *
 * - 每个轨道是一个 AbsoluteFill 层（background 在底，overlay 在上）
 * - 每个 clip 用 <Sequence> 包裹对应组件
 * - 静音/隐藏的轨道不渲染
 *
 * 数据来源：
 * - 编辑器预览（Player）：从 zustand store 读
 * - 导出（renderMedia）：从 inputProps 读（避免依赖 store）
 */
export interface CompositionRendererProps {
  /** 可选：导出时通过 inputProps 传入，覆盖 store */
  tracks?: Track[];
  clips?: Record<string, Clip>;
}

export const CompositionRenderer: React.FC<CompositionRendererProps> = ({
  tracks: propTracks,
  clips: propClips,
}) => {
  const storeTracks = useEditorStore((s) => s.tracks);
  const storeClips = useEditorStore((s) => s.clips);
  const tracks = propTracks ?? storeTracks;
  const clips = propClips ?? storeClips;

  // background 轨道在底，overlay 在上
  const sorted = [...tracks].sort((a, b) => {
    if (a.kind === b.kind) return 0;
    return a.kind === "background" ? -1 : 1;
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {sorted.map((track) => {
        if (track.muted) return null;
        return (
          <AbsoluteFill key={track.id} style={{ pointerEvents: "none" }}>
            {track.clipIds.map((cid) => {
              const clip = clips[cid];
              if (!clip) return null;
              const def = getComponentDef(clip.componentKey);
              if (!def) return null;
              const Comp = def.component;
              return (
                <Sequence
                  key={clip.id}
                  from={clip.start}
                  durationInFrames={clip.duration}
                  name={clip.name}
                >
                  {/* 内层 Sequence：通过负 from 让组件内部 useCurrentFrame()
                      从 sourceStart 开始，使分割/裁剪后的后半段接着原内容播放，
                      而不是从头开始。 */}
                  <Sequence
                    from={-(clip.sourceStart ?? 0)}
                    durationInFrames={clip.duration + (clip.sourceStart ?? 0)}
                  >
                    <Comp {...clip.props} />
                  </Sequence>
                </Sequence>
              );
            })}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
