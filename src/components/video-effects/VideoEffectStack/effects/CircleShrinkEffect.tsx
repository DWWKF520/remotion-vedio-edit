import React from "react";
import type { EffectWrapperProps } from "../types";
import { computeCircleShrink, getCircleShrinkGlow } from "../../CircleShrinkTransition/shared";

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

  // 收缩动画逐帧状态（计算逻辑与 CircleShrinkTransition 共享，确保动画曲线一致）
  const {
    curX,
    curY,
    shapeHalfW,
    shapeHalfH,
    shapeBorderRadius,
    videoScale,
    dimProgress,
    ringScale,
  } = computeCircleShrink(frame, fps || 30, width, height, {
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
          boxShadow: getCircleShrinkGlow(glowIntensity),
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
