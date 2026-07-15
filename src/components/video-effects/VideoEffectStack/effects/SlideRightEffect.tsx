import React from "react";
import type { EffectWrapperProps } from "../types";
import { computeSlideRight, SLIDE_RIGHT_TRANSFORM_ORIGIN_MAP } from "../../SlideRightTransition/shared";

/**
 * 右移渐变效果包装器
 * 接收 children（视频或下层效果），对其应用右移+缩放+渐变蒙版动画
 */
export const SlideRightEffect: React.FC<EffectWrapperProps> = ({
  children,
  params,
  frame,
  width,
  height,
}) => {
  const slideDistance = Number(params.slideDistance ?? 35);
  const slideDuration = Number(params.slideDuration ?? 20);
  const finalScale = Number(params.finalScale ?? 0.72);
  const scaleOrigin = String(params.scaleOrigin ?? "left");
  const gradientColor = String(params.gradientColor ?? "#0a0a1a");
  const gradientWidth = Number(params.gradientWidth ?? 18);
  const gradientOpacity = Number(params.gradientOpacity ?? 1);
  const borderRadius = Number(params.borderRadius ?? 16);
  const shadow = Number(params.shadow ?? 0.5);

  // 滑动动画逐帧状态（计算逻辑与 SlideRightTransition 共享，确保动画曲线一致）
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

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
      }}
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
          borderRadius: radius,
          overflow: "hidden",
          boxShadow:
            shadowStrength > 0
              ? `0 24px 60px rgba(0,0,0,${0.5 * shadowStrength}), 0 8px 20px rgba(0,0,0,${0.3 * shadowStrength})`
              : "none",
        }}
      >
        {children}
        {/* 左边缘渐变蒙版 */}
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
    </div>
  );
};
