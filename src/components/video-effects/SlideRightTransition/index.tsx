import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { computeSlideRight, SLIDE_RIGHT_TRANSFORM_ORIGIN_MAP } from "./shared";

/**
 * 视频右移渐变 · Slide-Right Transition
 *
 * 视频从全屏向右滑动并（可选）缩小，左边缘叠加颜色渐变蒙版与背景平滑过渡，
 * 左侧露出背景区域，便于在该区域叠加讲解动画。
 *
 * 使用方式：叠加在 VideoClip 上层（同 src、同起始），或直接作为视频片段使用。
 * 建议放在 overlay 轨道，背景设为透明即可露出底层视频/动画。
 */

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

  const startFromFrames = Math.max(0, Math.floor(startFrom * (fps || 30)));

  // 滑动动画逐帧状态（计算逻辑与 SlideRightEffect 共享，确保动画曲线一致）
  const {
    offsetX,
    videoScale,
    maskOpacity,
    radius,
    shadowStrength,
    maskGradient,
  } = computeSlideRight(frame, width, {
    slideDistance,
    slideDuration,
    finalScale,
    gradientColor,
    gradientOpacity,
    borderRadius,
    shadow,
  });

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
          transformOrigin: SLIDE_RIGHT_TRANSFORM_ORIGIN_MAP[scaleOrigin] || "left center",
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
