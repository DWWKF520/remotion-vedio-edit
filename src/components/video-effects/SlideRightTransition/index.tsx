import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";

/**
 * 视频右移渐变 · Slide-Right Transition
 *
 * 视频从全屏向右滑动并（可选）缩小，左边缘叠加颜色渐变蒙版与背景平滑过渡，
 * 左侧露出背景区域，便于在该区域叠加讲解动画。
 *
 * 使用方式：叠加在 VideoClip 上层（同 src、同起始），或直接作为视频片段使用。
 * 建议放在 overlay 轨道，背景设为透明即可露出底层视频/动画。
 */

/** 把 #RRGGBB 转成 rgba(r,g,b,a)。非 hex 输入退化为纯色 + transparent 关键字。 */
function toRgba(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (m) {
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  // 退化：无法解析时，用 transparent 占位（可能略带灰边）
  return alpha === 0 ? "transparent" : hex;
}

export const SlideRightTransition: React.FC<{
  /** 视频地址 */
  readonly src?: string;
  /** 右移距离（画布宽度的百分比 0-100） */
  readonly slideDistance?: number;
  /** 滑动动画持续帧数 */
  readonly slideDuration?: number;
  /** 滑动后视频缩放 0.1-2 */
  readonly finalScale?: number;
  /** 缩放原点 */
  readonly scaleOrigin?: "left" | "center" | "right";
  /** 左侧露出区域背景色（透明用 transparent） */
  readonly bgColor?: string;
  /** 背景渐变（CSS background 值，非空时优先于 bgColor） */
  readonly bgGradient?: string;
  /** 视频左边缘渐变蒙版颜色（建议与 bgColor 一致以实现平滑过渡） */
  readonly gradientColor?: string;
  /** 渐变蒙版宽度（视频宽度的百分比 0-50） */
  readonly gradientWidth?: number;
  /** 渐变蒙版最终透明度 0-1 */
  readonly gradientOpacity?: number;
  /** 视频圆角（像素） */
  readonly borderRadius?: number;
  /** 投影强度 0-1 */
  readonly shadow?: number;
  /** 视频透明度 0-1 */
  readonly videoOpacity?: number;
  /** 视频填充方式 */
  readonly objectFit?: "cover" | "contain";
  /** 音量 0-1 */
  readonly volume?: number;
  /** 静音 1/0 */
  readonly muted?: number;
  /** 视频从第几秒开始 */
  readonly startFrom?: number;
  /** 播放速率 */
  readonly playbackRate?: number;
  /** 视频宽度（兜底） */
  readonly videoWidth?: number;
  /** 视频高度（兜底） */
  readonly videoHeight?: number;
}> = ({
  src = "",
  slideDistance = 35,
  slideDuration = 20,
  finalScale = 0.72,
  scaleOrigin = "left",
  bgColor = "#0a0a1a",
  bgGradient = "",
  gradientColor = "#0a0a1a",
  gradientWidth = 18,
  gradientOpacity = 1,
  borderRadius = 16,
  shadow = 0.5,
  videoOpacity = 1,
  objectFit = "cover",
  volume = 1,
  muted = 0,
  startFrom = 0,
  playbackRate = 1,
  videoWidth = 1920,
  videoHeight = 1080,
}) => {
  const frame = useCurrentFrame();
  const { width: vw, height: vh, fps } = useVideoConfig();
  const width = vw || videoWidth;
  const height = vh || videoHeight;

  // 滑动进度 0 -> 1（缓出）
  const slideProgress = interpolate(frame, [0, slideDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // 视频水平位移（像素）
  const offsetX = (slideDistance / 100) * width * slideProgress;

  // 视频缩放：1 -> finalScale
  const videoScale = interpolate(slideProgress, [0, 1], [1, finalScale], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 左边缘渐变蒙版淡入
  const maskOpacity = interpolate(
    frame,
    [0, Math.max(1, slideDuration * 0.6)],
    [0, gradientOpacity],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // 圆角淡入（开始满屏无圆角，滑动后出现）
  const radius = interpolate(slideProgress, [0, 1], [0, borderRadius], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 投影随滑动进度增强
  const shadowStrength = shadow * slideProgress;

  const startFromFrames = Math.max(0, Math.floor(startFrom * (fps || 30)));

  // 渐变蒙版 CSS：左端为 gradientColor 实色，右端为同色 0 透明，避免灰边
  const maskGradient = `linear-gradient(to right, ${toRgba(
    gradientColor,
    1,
  )} 0%, ${toRgba(gradientColor, 0)} 100%)`;

  if (!src) {
    return (
      <AbsoluteFill style={{ background: bgColor }}>
        <div
          style={{
            color: "#888",
            fontSize: 14,
            textAlign: "center",
            paddingTop: 100,
          }}
        >
          请设置视频 src
        </div>
      </AbsoluteFill>
    );
  }

  const transformOriginMap: Record<string, string> = {
    left: "left center",
    center: "center center",
    right: "right center",
  };

  return (
    <AbsoluteFill
      style={{ background: bgGradient || bgColor, overflow: "hidden" }}
    >
      {/* 视频容器：右移 + 缩放 */}
      <div
        style={{
          position: "absolute",
          left: offsetX,
          top: 0,
          width,
          height,
          transform: `scale(${videoScale})`,
          transformOrigin: transformOriginMap[scaleOrigin] || "left center",
          opacity: videoOpacity,
          borderRadius: radius,
          overflow: "hidden",
          boxShadow:
            shadowStrength > 0
              ? `0 24px 60px rgba(0,0,0,${0.5 * shadowStrength}), 0 8px 20px rgba(0,0,0,${0.3 * shadowStrength})`
              : "none",
        }}
      >
        <OffthreadVideo
          src={src}
          startFrom={startFromFrames}
          playbackRate={playbackRate}
          volume={muted ? 0 : volume}
          muted={!!muted}
          style={{
            width: "100%",
            height: "100%",
            objectFit,
            display: "block",
          }}
        />
        {/* 左边缘渐变蒙版：与背景平滑过渡，避免硬边 */}
        {gradientWidth > 0 && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${gradientWidth}%`,
              background: maskGradient,
              opacity: maskOpacity,
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};
