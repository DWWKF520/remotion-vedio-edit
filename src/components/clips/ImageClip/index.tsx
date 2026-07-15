import React from "react";
import { AbsoluteFill, Img, useVideoConfig, interpolate, useCurrentFrame } from "remotion";

/**
 * 图片片段组件 —— 把图片包装成可在时间线上拖入的素材
 *
 * - 使用 Remotion 的 <Img> 组件（渲染时会等待图片加载完成）
 * - 默认 5 秒时长（150 帧 @30fps）
 * - 支持位置、缩放、旋转、透明度、fit 等参数
 * - 入场出场淡入淡出（开头 10 帧淡入，结尾 10 帧淡出）
 */
export const ImageClip: React.FC<{
  readonly src?: string;
  /** 适配方式：contain / cover / fill / none */
  readonly fit?: string;
  /** 水平位置 % 0-100 */
  readonly positionX?: number;
  /** 垂直位置 % 0-100 */
  readonly positionY?: number;
  /** 缩放 0.1-5 */
  readonly scale?: number;
  /** 旋转角度 */
  readonly rotate?: number;
  /** 透明度 0-1 */
  readonly opacity?: number;
  /** 圆角像素 */
  readonly borderRadius?: number;
  /** 背景色 */
  readonly backgroundColor?: string;
  /** 是否显示投影 1/0 */
  readonly showShadow?: number;
  /** Ken Burns 效果（缓慢推进） 1/0 */
  readonly kenBurns?: number;
  /** 淡入帧数 */
  readonly fadeIn?: number;
  /** 淡出帧数 */
  readonly fadeOut?: number;
  /** 图片宽度（兜底） */
  readonly imageWidth?: number;
  /** 图片高度（兜底） */
  readonly imageHeight?: number;
}> = ({
  src = "",
  fit = "contain",
  positionX = 50,
  positionY = 50,
  scale = 1,
  rotate = 0,
  opacity = 1,
  borderRadius = 0,
  backgroundColor = "transparent",
  showShadow = 0,
  kenBurns = 0,
  fadeIn = 10,
  fadeOut = 10,
  imageWidth = 1920,
  imageHeight = 1080,
}) => {
  const frame = useCurrentFrame();
  const vcfg = useVideoConfig();
  const width = vcfg.width || imageWidth;
  const height = vcfg.height || imageHeight;
  const duration = vcfg.durationInFrames;

  // 淡入淡出
  const fadeInProgress = interpolate(frame, [0, fadeIn], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOutProgress = interpolate(
    frame,
    [duration - fadeOut, duration],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const finalOpacity = opacity * fadeInProgress * fadeOutProgress;

  // Ken Burns：缓慢放大（1 → 1.08）
  const kbScale = kenBurns
    ? interpolate(frame, [0, duration], [1, 1.08], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;
  const totalScale = scale * kbScale;

  const maxW = width * 0.96;
  const maxH = height * 0.96;

  const safeSrc = React.useMemo(() => {
    if (!src) return src;
    if (/^(https?:|data:|blob:)/i.test(src)) return src;
    const [p, query] = src.split("?");
    const encodedPath = p
      .split("/")
      .map((seg) => encodeURI(seg))
      .join("/");
    return query ? `${encodedPath}?${query}` : encodedPath;
  }, [src]);

  if (!src) {
    return (
      <AbsoluteFill style={{ background: backgroundColor }}>
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            color: "#888",
            fontSize: 14,
          }}
        >
          选择图片
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        background: backgroundColor,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: `${positionX}%`,
          top: `${positionY}%`,
          transform: `translate(-50%, -50%) rotate(${rotate}deg) scale(${totalScale})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: finalOpacity,
          filter: showShadow
            ? "drop-shadow(0 12px 32px rgba(0,0,0,0.45))"
            : "none",
          borderRadius,
          overflow: borderRadius > 0 ? "hidden" : "visible",
        }}
      >
        <Img
          src={safeSrc}
          style={{
            maxWidth: maxW,
            maxHeight: maxH,
            width: "auto",
            height: "auto",
            objectFit: fit as "contain" | "cover" | "fill" | "none",
            display: "block",
            borderRadius,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
