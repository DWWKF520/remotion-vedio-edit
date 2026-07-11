import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useEditorStore } from "./store";
import { getComponentDef } from "./registry";
import type { Clip, ClipEffect, EffectType, Track } from "./types";

/**
 * 把 tracks/clips 渲染成 React 树。
 *
 * - 每个轨道是一个 AbsoluteFill 层（background 在底，overlay 在上）
 * - 每个 clip 用 <Sequence> 包裹对应组件
 * - 静音/隐藏的轨道不渲染
 * - 支持入场/出场动画效果（淡入、滑入、弹入等）
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
                  <EffectWrapper
                    enterEffect={clip.enterEffect}
                    exitEffect={clip.exitEffect}
                    durationInFrames={clip.duration}
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
                  </EffectWrapper>
                </Sequence>
              );
            })}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * 根据 effect type 和 progress(0~1) 计算样式。
 * progress=0 表示完全隐藏，progress=1 表示完全显示。
 */
function effectToStyle(type: EffectType, progress: number): React.CSSProperties {
  const p = progress;
  switch (type) {
    case "fade":
      return { opacity: p };
    case "slide-left":
      return { opacity: p, transform: `translateX(${(1 - p) * -100}%)` };
    case "slide-right":
      return { opacity: p, transform: `translateX(${(1 - p) * 100}%)` };
    case "slide-up":
      return { opacity: p, transform: `translateY(${(1 - p) * 100}%)` };
    case "slide-down":
      return { opacity: p, transform: `translateY(${(1 - p) * -100}%)` };
    case "zoom-in":
      return { opacity: p, transform: `scale(${p})` };
    case "zoom-out":
      return { opacity: p, transform: `scale(${2 - p})` };
    case "rotate":
      return { opacity: p, transform: `rotate(${(1 - p) * 180}deg)` };
    case "bounce":
      return { opacity: p, transform: `scale(${p})` };
    default:
      return {};
  }
}

/**
 * 动画包裹器：在 clip 的入场/出场期间应用动画效果。
 * frame=0 是 clip 的第一帧（外层 Sequence 的坐标系）。
 */
const EffectWrapper: React.FC<{
  enterEffect?: ClipEffect;
  exitEffect?: ClipEffect;
  durationInFrames: number;
  children: React.ReactNode;
}> = ({ enterEffect, exitEffect, durationInFrames, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let style: React.CSSProperties = {};

  // 入场动画
  if (enterEffect && enterEffect.type !== "none" && enterEffect.duration > 0) {
    if (enterEffect.type === "bounce") {
      // spring 实现弹性弹入
      const progress = spring({
        frame,
        fps,
        config: { damping: 12, mass: 0.8, stiffness: 200 },
        durationInFrames: enterEffect.duration,
      });
      style = { ...style, ...effectToStyle("bounce", progress) };
    } else {
      const progress = interpolate(frame, [0, enterEffect.duration], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      style = { ...style, ...effectToStyle(enterEffect.type, progress) };
    }
  }

  // 出场动画
  if (exitEffect && exitEffect.type !== "none" && exitEffect.duration > 0) {
    const exitStart = durationInFrames - exitEffect.duration;
    if (exitEffect.type === "bounce") {
      // 反向 spring 实现弹出
      const progress = spring({
        frame: Math.max(0, frame - exitStart),
        fps,
        config: { damping: 12, mass: 0.8, stiffness: 200 },
        durationInFrames: exitEffect.duration,
      });
      // 出场：从 1 到 0
      style = { ...style, ...effectToStyle("bounce", 1 - progress) };
    } else {
      const progress = interpolate(
        frame,
        [exitStart, durationInFrames],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );
      // 出场覆盖入场的 transform/opacity
      style = { ...style, ...effectToStyle(exitEffect.type, progress) };
    }
  }

  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};
