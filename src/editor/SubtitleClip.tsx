import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const SubtitleClip: React.FC<{
  readonly text: string;
  readonly color: string;
  readonly fontSize: number;
  readonly bgColor: string;
  readonly position: string;
}> = ({ text, color, fontSize, bgColor, position }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // 入场动画：从下方淡入滑入
  const enterProgress = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const translateY = interpolate(enterProgress, [0, 1], [40, 0]);
  const enterOpacity = interpolate(enterProgress, [0, 1], [0, 1]);

  // 出场动画：最后15帧淡出
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames - 5],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const opacity = Math.min(enterOpacity, exitOpacity);

  // 位置映射
  const positionStyle: React.CSSProperties =
    position === "top"
      ? { top: "8%" }
      : position === "middle"
        ? { top: "50%", transform: `translateY(-50%) translateY(${translateY}px)` }
        : { bottom: "10%" };

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          padding: "0 60px",
          opacity,
          ...positionStyle,
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "8px 24px",
            borderRadius: 8,
            background: bgColor,
            textAlign: "center",
          }}
        >
          <span
            style={{
              color,
              fontSize,
              fontWeight: 700,
              fontFamily: "SF Pro Text, Helvetica, Arial, sans-serif",
              textShadow: "0 2px 4px rgba(0,0,0,0.3)",
              lineHeight: 1.4,
              whiteSpace: "pre-wrap",
            }}
          >
            {text}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
