import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  useVideoConfig,
} from "remotion";

/**
 * 视频片段组件 —— 把任意 .mp4/.webm 等包装成可在时间线上拖入的素材
 *
 * 设计目标：
 * - 默认指向 /uploads/智谱清言.mp4
 * - 通过 scale/position/fit 控制画面在画布中的呈现
 * - 通过 startFrom（秒）/playbackRate 控制时间偏移和速率
 * - 整段时长由 manifest.defaultDuration 决定（默认 154 帧 ≈ 5.13s 对应原视频）
 *
 * ⚠️ 中文文件名由导出 API 在渲染前自动重命名为 ASCII（base64url 哈希），
 *    渲染时 src 形如 /uploads/m_xxx.mp4，OffthreadVideo 通过 serve URL 解析。
 *    编辑器内直接播放则使用浏览器原生 URL 处理能力。
 *
 * ⚠️ Remotion 渲染时视频文件必须放到 public/ 下（运行时通过 URL 访问）。
 *    当前项目 public/uploads/ 下的视频可直接通过 /uploads/xxx 引用。
 */

export const VideoClip: React.FC<{
  /** 视频 URL（相对 /uploads/... 或绝对 URL） */
  readonly src?: string;
  /** 音量 0-1 */
  readonly volume?: number;
  /** 静音 1/0 */
  readonly muted?: number;
  /** 播放速率 0.25-4 */
  readonly playbackRate?: number;
  /** 从第几秒开始播放（截取） */
  readonly startFrom?: number;
  /** 适配方式：contain / cover / fill */
  readonly fit?: string;
  /** 背景色（视频未铺满时显示） */
  readonly backgroundColor?: string;
  /** 水平位置 % 0-100 */
  readonly positionX?: number;
  /** 垂直位置 % 0-100 */
  readonly positionY?: number;
  /** 画面缩放 0.1-2 */
  readonly scale?: number;
  /** 圆角（像素） */
  readonly borderRadius?: number;
  /** 是否显示投影 1/0 */
  readonly showShadow?: number;
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
}) => {
  const vcfg = useVideoConfig();

  // startFrom 是秒，转成帧交给 <OffthreadVideo>
  const startFromFrames = Math.max(
    0,
    Math.floor(startFrom * (vcfg.fps || 30)),
  );

  // 音量使用回调：先按 mute 决定 0 / volume，再做淡入（开头 6 帧从 0 渐入到目标音量）
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

  // position/scale 通过 transform 实现，避免 auto 尺寸在渲染时失效
  const translateX = (positionX - 50);
  const translateY = (positionY - 50);

  return (
    <AbsoluteFill
      style={{
        background: backgroundColor,
        overflow: "hidden",
      }}
    >
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
    </AbsoluteFill>
  );
};
