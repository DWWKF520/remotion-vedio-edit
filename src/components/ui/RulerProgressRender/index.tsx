import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";

/**
 * 标尺进度渲染组件
 *
 * 在视频底部显示一条时间标尺，带有：
 * - 进度条随播放进度增长
 * - 标尺刻度和时间标记
 * - 播放头位置指示器
 * - 可配置的颜色、高度、样式
 */

export const RulerProgressRender: React.FC<{
  /** 进度条高度 */
  readonly height?: number;
  /** 进度条填充色 */
  readonly fillColor?: string;
  /** 进度条背景色 */
  readonly bgColor?: string;
  /** 标尺刻度线颜色 */
  readonly tickColor?: string;
  /** 时间文本颜色 */
  readonly textColor?: string;
  /** 播放头颜色 */
  readonly playheadColor?: string;
  /** 是否显示时间标记 */
  readonly showTimeMarkers?: boolean;
  /** 刻度间隔（秒） */
  readonly tickInterval?: number;
  /** 进度条位置 */
  readonly position?: "bottom" | "top";
  /** 是否显示播放头三角形 */
  readonly showPlayheadTriangle?: boolean;
  /** 边距 */
  readonly padding?: number;
  /** 进度条圆角 */
  readonly borderRadius?: number;
  /** 是否显示阴影 */
  readonly showShadow?: boolean;
}> = ({
  height = 40,
  fillColor = "#8b5cf6",
  bgColor = "#1a1a1e",
  tickColor = "#333",
  textColor = "#666",
  playheadColor = "#ef4444",
  showTimeMarkers = true,
  tickInterval = 1,
  position = "bottom",
  showPlayheadTriangle = true,
  padding = 0,
  borderRadius = 0,
  showShadow = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const totalDurationSec = durationInFrames / fps;
  const currentSec = frame / fps;
  const progress = frame / durationInFrames;

  // 计算刻度数量
  const tickCount = Math.ceil(totalDurationSec / tickInterval);

  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
    }
    return `${secs}.${ms.toString().padStart(2, "0")}`;
  };

  // 播放头闪烁动画
  const playheadGlow = interpolate(
    frame % fps,
    [0, fps / 2, fps],
    [1, 1.3, 1],
    { extrapolateRight: "clamp" }
  );

  const isTop = position === "top";

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* 标尺进度条容器 */}
      <div
        style={{
          position: "absolute",
          left: padding,
          right: padding,
          height: height,
          [isTop ? "top" : "bottom"]: padding,
          background: bgColor,
          borderRadius: borderRadius,
          overflow: "hidden",
          boxShadow: showShadow
            ? `0 ${isTop ? "2px" : "-2px"} 8px rgba(0,0,0,0.3)`
            : "none",
        }}
      >
        {/* 背景刻度线 */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        >
          {Array.from({ length: tickCount + 1 }).map((_, i) => {
            const sec = i * tickInterval;
            const xPos = (sec / totalDurationSec) * 100;
            const isMajorTick = i % 5 === 0;

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${xPos}%`,
                  top: 0,
                  height: isMajorTick ? "100%" : "50%",
                  width: 1,
                  background: isMajorTick
                    ? tickColor
                    : `${tickColor}80`,
                }}
              />
            );
          })}
        </div>

        {/* 进度条填充 */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${fillColor}cc, ${fillColor})`,
            boxShadow: `0 0 20px ${fillColor}60`,
          }}
        />

        {/* 已播放部分的刻度线覆盖（浅色） */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)`,
          }}
        >
          {Array.from({ length: tickCount + 1 }).map((_, i) => {
            const sec = i * tickInterval;
            const xPos = (sec / totalDurationSec) * 100;
            const isMajorTick = i % 5 === 0;

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${xPos}%`,
                  top: 0,
                  height: isMajorTick ? "100%" : "50%",
                  width: 1,
                  background: isMajorTick
                    ? "#fff"
                    : "#ffffff60",
                }}
              />
            );
          })}
        </div>

        {/* 时间标记 */}
        {showTimeMarkers && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: height - 20,
              height: 20,
              display: "flex",
              alignItems: "flex-end",
              fontFamily: "SF Mono, Monaco, monospace",
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: 0.5,
              color: textColor,
              paddingBottom: 2,
            }}
          >
            {Array.from({ length: Math.ceil(tickCount / 5) + 1 }).map((_, i) => {
              const sec = i * tickInterval * 5;
              if (sec > totalDurationSec) return null;
              const xPos = (sec / totalDurationSec) * 100;

              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${xPos}%`,
                    transform: "translateX(-50%)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatTime(sec)}
                </div>
              );
            })}
          </div>
        )}

        {/* 播放头指示器 */}
        <div
          style={{
            position: "absolute",
            left: `${progress * 100}%`,
            top: 0,
            bottom: 0,
            width: 2,
            background: playheadColor,
            boxShadow: `0 0 ${playheadGlow * 8}px ${playheadColor}`,
            transform: "translateX(-1px)",
            zIndex: 10,
          }}
        >
          {/* 顶部/底部三角形 */}
          {showPlayheadTriangle && (
            <div
              style={{
                position: "absolute",
                top: isTop ? "auto" : -8,
                bottom: isTop ? -8 : "auto",
                left: -4,
                width: 10,
                height: 10,
                background: playheadColor,
                clipPath: isTop
                  ? "polygon(0 100%, 50% 0, 100% 100%)"
                  : "polygon(0 0, 50% 100%, 100% 0)",
                boxShadow: `0 0 4px ${playheadColor}`,
              }}
            />
          )}
        </div>

        {/* 当前时间显示 */}
        <div
          style={{
            position: "absolute",
            right: 8,
            top: 4,
            fontFamily: "SF Mono, Monaco, monospace",
            fontSize: 11,
            fontWeight: 600,
            color: "#fff",
            padding: "2px 6px",
            background: "rgba(0,0,0,0.5)",
            borderRadius: 4,
            whiteSpace: "nowrap",
          }}
        >
          {formatTime(currentSec)} / {formatTime(totalDurationSec)}
        </div>
      </div>
    </AbsoluteFill>
  );
};