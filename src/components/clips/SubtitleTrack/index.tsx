import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * 字幕轨道组件 —— 通过编程式文本批量管理多段字幕。
 *
 * 用法示例（subtitlesText 属性）：
 * ```
 * 0-3: 第一句字幕
 * 3.5-6: 第二句字幕
 * 7-10: 第三句字幕
 * ```
 *
 * 每行格式：`起始秒-结束秒: 字幕文本`
 * 也可以在代码中直接传 subtitles 数组：
 * <SubtitleTrack subtitles={[{ start: 0, end: 3, text: "Hello" }]} ... />
 */

export interface SubtitleEntry {
  /** 起始时间（秒） */
  start: number;
  /** 结束时间（秒） */
  end: number;
  /** 字幕文本 */
  text: string;
}

export interface SubtitleTrackProps {
  /** 字幕列表（编程式传入），优先于 subtitlesText */
  readonly subtitles?: SubtitleEntry[];
  /** 字幕文本（每行格式：`起始秒-结束秒: 文本`），用于属性面板编辑 */
  readonly subtitlesText?: string;
  readonly color?: string;
  readonly fontSize?: number;
  readonly bgColor?: string;
  readonly position?: "top" | "middle" | "bottom";
  readonly animation?: "slide" | "fade" | "none";
}

/** 解析多行字幕文本为 SubtitleEntry 数组 */
export function parseSubtitlesText(text: string): SubtitleEntry[] {
  const lines = text.split("\n");
  const entries: SubtitleEntry[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // 格式：`起始秒-结束秒: 文本`  或  `起始秒-结束秒 文本`
    const match = trimmed.match(/^([\d.]+)\s*-\s*([\d.]+)\s*[:：]?\s*(.*)$/);
    if (!match) continue;
    const start = parseFloat(match[1]);
    const end = parseFloat(match[2]);
    const subtitleText = match[3].trim();
    if (!subtitleText) continue;
    entries.push({ start, end, text: subtitleText });
  }
  return entries;
}

export const SubtitleTrack: React.FC<SubtitleTrackProps> = ({
  subtitles,
  subtitlesText,
  color = "#ffffff",
  fontSize = 48,
  bgColor = "rgba(0,0,0,0.6)",
  position = "bottom",
  animation = "slide",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 解析字幕列表
  const entries = useMemo<SubtitleEntry[]>(() => {
    if (subtitles && subtitles.length > 0) return subtitles;
    if (subtitlesText) return parseSubtitlesText(subtitlesText);
    return [];
  }, [subtitles, subtitlesText]);

  // 找到当前帧应该显示的字幕
  const currentSec = frame / fps;
  const activeEntry = entries.find(
    (e) => currentSec >= e.start && currentSec < e.end,
  );

  if (!activeEntry) return null;

  // 当前字幕的局部帧（从字幕开始算起）
  const localFrame = frame - Math.round(activeEntry.start * fps);
  const localDuration = Math.round((activeEntry.end - activeEntry.start) * fps);

  // 入场动画
  let opacity = 1;
  let translateY = 0;

  if (animation === "slide") {
    const enterProgress = spring({
      frame: localFrame,
      fps,
      config: { damping: 200 },
    });
    translateY = interpolate(enterProgress, [0, 1], [30, 0]);
    const enterOpacity = interpolate(enterProgress, [0, 1], [0, 1]);
    const exitOpacity = interpolate(
      localFrame,
      [localDuration - 10, localDuration - 3],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
    opacity = Math.min(enterOpacity, exitOpacity);
  } else if (animation === "fade") {
    const enterOpacity = interpolate(localFrame, [0, 8], [0, 1], {
      extrapolateRight: "clamp",
    });
    const exitOpacity = interpolate(
      localFrame,
      [localDuration - 10, localDuration - 3],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
    opacity = Math.min(enterOpacity, exitOpacity);
  }

  // 位置样式
  const positionStyle: React.CSSProperties =
    position === "top"
      ? { top: "8%" }
      : position === "middle"
        ? {
            top: "50%",
            transform: `translateY(-50%) translateY(${translateY}px)`,
          }
        : { bottom: "10%", transform: `translateY(${translateY}px)` };

  return (
    <AbsoluteFill
      style={{ justifyContent: "center", alignItems: "center", opacity }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          padding: "0 60px",
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
            maxWidth: "80%",
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
            {activeEntry.text}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
