import React from "react";
import { interpolate, Easing, spring } from "remotion";
import type { EffectWrapperProps } from "../types";

/**
 * 圆形收缩效果包装器
 * 接收 children（视频或下层效果），对其应用形状收缩+边框+发光+背景变暗动画
 */
export const CircleShrinkEffect: React.FC<EffectWrapperProps> = ({
  children,
  params,
  frame,
  width,
  height,
  fps,
}) => {
  const shape = String(params.shape ?? "circle") as
    | "circle"
    | "square"
    | "rect"
    | "rounded";
  const rectAspect = Number(params.rectAspect ?? 1.78);
  const cornerRadius = Number(params.cornerRadius ?? 24);
  const contentMode = String(params.contentMode ?? "scale") as
    | "scale"
    | "crop";
  const finalX = Number(params.finalX ?? 12);
  const finalY = Number(params.finalY ?? 82);
  const finalRadius = Number(params.finalRadius ?? 100);
  const shrinkDuration = Number(params.shrinkDuration ?? 18);
  const borderWidth = Number(params.borderWidth ?? 5);
  const borderColor = String(params.borderColor ?? "#ffffff");
  const glowIntensity = Number(params.glowIntensity ?? 0.8);
  const bgDim = Number(params.bgDim ?? 0.4);

  const maxRadius = Math.sqrt(width * width + height * height) / 2 + 200;

  const shrinkProgress = interpolate(frame, [0, shrinkDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const startX = width / 2;
  const startY = height / 2;
  const endX = (finalX / 100) * width;
  const endY = (finalY / 100) * height;

  const curX = interpolate(shrinkProgress, [0, 1], [startX, endX], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const curY = interpolate(shrinkProgress, [0, 1], [startY, endY], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const curRadius = interpolate(
    shrinkProgress,
    [0, 1],
    [maxRadius, finalRadius],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const shapeHalfW = shape === "rect" ? curRadius * rectAspect : curRadius;
  const shapeHalfH = curRadius;
  const shapeBorderRadius =
    shape === "circle"
      ? "50%"
      : shape === "rounded"
        ? `${cornerRadius}px`
        : "0px";

  const finalShapeW =
    shape === "rect" ? finalRadius * rectAspect * 2 : finalRadius * 2;
  const finalShapeH = finalRadius * 2;
  const videoRatio = width / height;
  const finalShapeRatio = finalShapeW / finalShapeH;
  const finalScale =
    videoRatio > finalShapeRatio
      ? finalShapeH / height
      : finalShapeW / width;
  const videoScale = interpolate(shrinkProgress, [0, 1], [1, finalScale], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const dimProgress = interpolate(frame, [2, shrinkDuration + 4], [0, bgDim], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ringSpring = spring({
    frame: frame - 2,
    fps: fps || 30,
    config: { damping: 10, mass: 0.4, stiffness: 200 },
  });
  const ringScale = 0.8 + 0.2 * Math.min(1, ringSpring);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
      }}
    >
      {/* 背景变暗层 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `rgba(0,0,0,${dimProgress})`,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* 形状高亮区域 */}
      <div
        style={{
          position: "absolute",
          left: curX - shapeHalfW,
          top: curY - shapeHalfH,
          width: shapeHalfW * 2,
          height: shapeHalfH * 2,
          borderRadius: shapeBorderRadius,
          overflow: "hidden",
          zIndex: 2,
          boxShadow:
            glowIntensity > 0
              ? `0 0 ${40 * glowIntensity}px rgba(255,255,255,${0.3 * glowIntensity}), 0 0 ${80 * glowIntensity}px rgba(255,255,255,${0.15 * glowIntensity})`
              : "none",
        }}
      >
        {contentMode === "scale" ? (
          // 缩放模式：整体缩放
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
            {children}
          </div>
        ) : (
          // 裁剪模式：通过偏移实现取景窗效果
          <div
            style={{
              position: "absolute",
              width,
              height,
              left: -(curX - shapeHalfW),
              top: -(curY - shapeHalfH),
            }}
          >
            {children}
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
    </div>
  );
};
