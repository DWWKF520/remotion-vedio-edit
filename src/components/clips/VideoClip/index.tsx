import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  useVideoConfig,
} from "remotion";
import { EffectStack } from "../../video-effects/VideoEffectStack/EffectStack";
import type { VideoEffectItem } from "../../video-effects/VideoEffectStack/types";

/**
 * 视频片段组件 —— 把任意 .mp4/.webm 等包装成可在时间线上拖入的素材
 *
 * 支持通过 effects 数组叠加多层视频效果（右移渐变、圆形收缩等）。
 * 效果按数组顺序叠加，第0个是最外层，最后一个是最内层。
 */

export const VideoClip: React.FC<{
  readonly src?: string;
  readonly volume?: number;
  readonly muted?: number;
  readonly playbackRate?: number;
  readonly startFrom?: number;
  readonly fit?: string;
  readonly backgroundColor?: string;
  readonly positionX?: number;
  readonly positionY?: number;
  readonly scale?: number;
  readonly borderRadius?: number;
  readonly showShadow?: number;
  /** 叠加效果数组，按顺序嵌套 */
  readonly effects?: VideoEffectItem[];
}> = ({
  src = "/uploads/智谱清言.mp4",
  volume = 1,
  muted = 0,
  playbackRate = 1,
  startFrom = 0,
  fit = "contain",
  backgroundColor = "#000000",
  positionX = 50,
  positionY = 50,
  scale = 1,
  borderRadius = 0,
  showShadow = 1,
  effects = [],
}) => {
  const vcfg = useVideoConfig();

  const startFromFrames = Math.max(
    0,
    Math.floor(startFrom * (vcfg.fps || 30)),
  );

  const volumeCallback = React.useCallback(
    (f: number) => {
      if (muted) return 0;
      const target = volume;
      return interpolate(f, [0, 6], [0, target], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    },
    [muted, volume],
  );

  const translateX = positionX - 50;
  const translateY = positionY - 50;

  // 视频元素（被效果栈包裹的核心内容）
  const videoElement = (
    <OffthreadVideo
      src={src}
      startFrom={startFromFrames}
      playbackRate={playbackRate}
      volume={volumeCallback}
      muted={!!muted}
      style={{
        width: "100%",
        height: "100%",
        objectFit: fit as "contain" | "cover" | "fill",
        borderRadius,
        display: "block",
        transform: `translate(${translateX}%, ${translateY}%) scale(${scale})`,
        filter: showShadow
          ? "drop-shadow(0 12px 32px rgba(0,0,0,0.45))"
          : "none",
      }}
    />
  );

  // 如果有效果，用 EffectStack 包裹；否则直接渲染
  const content =
    effects && effects.length > 0 ? (
      <EffectStack effects={effects}>{videoElement}</EffectStack>
    ) : (
      videoElement
    );

  return (
    <AbsoluteFill
      style={{
        background: backgroundColor,
        overflow: "hidden",
      }}
    >
      {content}
    </AbsoluteFill>
  );
};
