import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { computeCircleShrink, getCircleShrinkGlow } from "./shared";

/**
 * 形状收缩转场 · Shape Shrink Transition
 *
 * 支持多种形状（圆形/正方形/长方形/圆角方形），视频被形状框住后缩小到目标位置。
 *
 * 两种内容模式：
 *   - "scale" 整体缩放：视频完整缩小后放进形状框
 *   - "crop"  局部裁剪：形状是取景窗，框住视频局部
 */

export const CircleShrinkTransition: React.FC<{
  /** 视频地址 */
  readonly src?: string;
  /** 形状：circle=圆形，square=正方形，rect=长方形，rounded=圆角方形 */
  readonly shape?: "circle" | "square" | "rect" | "rounded";
  /** 长方形宽高比（width/height），仅 rect 模式生效 */
  readonly rectAspect?: number;
  /** 圆角半径（像素），仅 rounded 模式生效 */
  readonly cornerRadius?: number;
  /** 内容模式：scale=整体缩放进形状，crop=局部裁剪框住 */
  readonly contentMode?: "scale" | "crop";
  /** 聚焦点 X（百分比 0-100）—— 已弃用，保留兼容 */
  readonly focusX?: number;
  /** 聚焦点 Y（百分比 0-100）—— 已弃用，保留兼容 */
  readonly focusY?: number;
  /** 收缩后半径（像素）—— 已弃用，保留兼容 */
  readonly focusRadius?: number;
  /** 最终位置 X（百分比 0-100） */
  readonly finalX?: number;
  /** 最终位置 Y（百分比 0-100） */
  readonly finalY?: number;
  /** 最终半径/半边长（像素）—— 对 circle 是半径，对 square/rect 是半宽 */
  readonly finalRadius?: number;
  /** 收缩动画持续帧数 */
  readonly shrinkDuration?: number;
  /** 已弃用 */
  readonly flyDelay?: number;
  /** 已弃用 */
  readonly flyDuration?: number;
  /** 边框宽度（像素），0 表示无边框 */
  readonly borderWidth?: number;
  /** 边框颜色 */
  readonly borderColor?: string;
  /** 外发光强度 0-1 */
  readonly glowIntensity?: number;
  /** 背景是否变暗 0-1 */
  readonly bgDim?: number;
  /** 底层全屏视频是否显示 0-1 */
  readonly bgVideoOpacity?: number;
  /** 视频填充方式：cover=填满(可能裁剪)，contain=完整显示(可能留白) */
  readonly objectFit?: "cover" | "contain";
  /** 视频音量 0-1 */
  readonly volume?: number;
  /** 是否静音 */
  readonly muted?: number;
  /** 视频从第几秒开始 */
  readonly startFrom?: number;
  /** 视频宽度（兜底） */
  readonly videoWidth?: number;
  /** 视频高度（兜底） */
  readonly videoHeight?: number;
}> = ({
  src = "",
  shape = "circle",
  rectAspect = 1.78,
  cornerRadius = 24,
  contentMode = "scale",
  focusX = 20,
  focusY = 75,
  focusRadius = 220,
  finalX = 12,
  finalY = 82,
  finalRadius = 100,
  shrinkDuration = 18,
  flyDelay = 6,
  flyDuration = 30,
  borderWidth = 5,
  borderColor = "#ffffff",
  glowIntensity = 0.8,
  bgDim = 0.4,
  bgVideoOpacity = 0,
  objectFit = "cover",
  volume = 1,
  muted = 0,
  startFrom = 0,
  videoWidth = 1920,
  videoHeight = 1080,
}) => {
  const frame = useCurrentFrame();
  const { width: vw, height: vh } = useVideoConfig();
  const width = vw || videoWidth;
  const height = vh || videoHeight;

  // 已弃用参数，保留兼容
  void flyDelay;
  void flyDuration;
  void focusX;
  void focusY;
  void focusRadius;

  // 收缩动画逐帧状态（计算逻辑与 CircleShrinkEffect 共享，确保动画曲线一致）
  const {
    curX,
    curY,
    shapeHalfW,
    shapeHalfH,
    shapeBorderRadius,
    videoScale,
    dimProgress,
    ringScale,
  } = computeCircleShrink(frame, 30, width, height, {
    shape,
    rectAspect,
    cornerRadius,
    contentMode,
    finalX,
    finalY,
    finalRadius,
    shrinkDuration,
    bgDim,
  });

  if (!src) {
    return (
      <AbsoluteFill style={{ background: "#111" }}>
        <div style={{ color: "#888", fontSize: 14, textAlign: "center", paddingTop: 100 }}>
          请设置视频 src
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* 底层全屏视频（变暗） */}
      <div style={{ position: "absolute", inset: 0, opacity: bgVideoOpacity }}>
        <OffthreadVideo
          startFrom={Math.floor(startFrom * 30)}
          src={src}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          volume={muted ? 0 : volume}
          muted={muted > 0}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `rgba(0,0,0,${dimProgress})`,
            pointerEvents: "none",
          }}
        />
      </div>

      {/* 上层形状高亮视频 */}
      <div
        style={{
          position: "absolute",
          left: curX - shapeHalfW,
          top: curY - shapeHalfH,
          width: shapeHalfW * 2,
          height: shapeHalfH * 2,
          borderRadius: shapeBorderRadius,
          overflow: "hidden",
          boxShadow: getCircleShrinkGlow(glowIntensity),
        }}
      >
        {contentMode === "scale" ? (
          // 缩放模式：视频从画布尺寸开始，随形状等比例缩小
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width,
              height,
              transform: `translate(-50%, -50%) scale(${videoScale})`,
              transformOrigin: "center center",
            }}
          >
            <OffthreadVideo
              startFrom={Math.floor(startFrom * 30)}
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit,
              }}
              volume={0}
              muted
            />
          </div>
        ) : (
          // 裁剪模式：视频尺寸=画布尺寸，通过偏移让聚焦点对齐形状中心
          <div
            style={{
              position: "absolute",
              width,
              height,
              left: -(curX - shapeHalfW),
              top: -(curY - shapeHalfH),
            }}
          >
            <OffthreadVideo
              startFrom={Math.floor(startFrom * 30)}
              src={src}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              volume={0}
              muted
            />
          </div>
        )}

        {/* 形状边框 */}
        {borderWidth > 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: shapeBorderRadius,
              border: `${borderWidth}px solid ${borderColor}`,
              boxShadow: `inset 0 0 ${borderWidth * 2}px rgba(255,255,255,0.2)`,
              transform: `scale(${ringScale})`,
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};