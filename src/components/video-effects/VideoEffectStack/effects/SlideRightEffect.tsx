import React from "react";
import { interpolate, Easing } from "remotion";
import type { EffectWrapperProps } from "../types";

function toRgba(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (m) {
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return alpha === 0 ? "transparent" : hex;
}

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

  const slideProgress = interpolate(frame, [0, slideDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const offsetX = (slideDistance / 100) * width * slideProgress;
  const videoScale = interpolate(slideProgress, [0, 1], [1, finalScale], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const maskOpacity = interpolate(
    frame,
    [0, Math.max(1, slideDuration * 0.6)],
    [0, gradientOpacity],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const radius = interpolate(slideProgress, [0, 1], [0, borderRadius], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shadowStrength = shadow * slideProgress;

  const maskGradient = `linear-gradient(to right, ${toRgba(
    gradientColor,
    1,
  )} 0%, ${toRgba(gradientColor, 0)} 100%)`;

  const transformOriginMap: Record<string, string> = {
    left: "left center",
    center: "center center",
    right: "right center",
  };

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
          transformOrigin: transformOriginMap[scaleOrigin] || "left center",
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
