import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * Claude 风格打字机动画组件
 *
 * 模拟 Claude AI 回复时的逐字打字效果，带有：
 * - 聊天界面风格的窗口
 * - 用户提问气泡 + Claude 回复逐字打出
 * - 闪烁光标
 * - 打字完成后的淡入光标
 */

export const ClaudeType: React.FC<{
  /** 用户提问文本 */
  readonly prompt: string;
  /** Claude 回复文本 */
  readonly response: string;
  /** 主题色（Claude 橙色） */
  readonly accentColor?: string;
  /** 打字速度（帧/字符） */
  readonly speed?: number;
  /** 回复前的思考停顿帧数 */
  readonly thinkingFrames?: number;
  /** 字体大小 */
  readonly fontSize?: number;
  /** 窗口圆角 */
  readonly borderRadius?: number;
}> = ({
  prompt,
  response,
  accentColor = "#D97757",
  speed = 2,
  thinkingFrames = 30,
  fontSize = 18,
  borderRadius = 16,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 阶段计算
  // 阶段1: 用户提问淡入 (0 - 15帧)
  // 阶段2: 思考停顿 (15 - 15+thinkingFrames)
  // 阶段3: 逐字打字 (15+thinkingFrames - ...)
  // 阶段4: 完成，光标闪烁

  const promptAppearFrame = 0;
  const promptEndFrame = 15;
  const thinkingStart = promptEndFrame;
  const typingStart = thinkingStart + thinkingFrames;

  // 计算当前已打出的字符数
  const typingFrame = Math.max(0, frame - typingStart);
  const charsToShow = Math.floor(typingFrame / speed);
  const typedText = response.slice(0, charsToShow);
  const isTypingDone = charsToShow >= response.length;

  // 光标闪烁（每秒闪约2次）
  const cursorVisible = Math.floor(frame / (fps / 4)) % 2 === 0;

  // 用户气泡淡入
  const promptOpacity = interpolate(
    frame,
    [promptAppearFrame, promptEndFrame],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // 思考动画（三个点跳动）
  const thinkingDots = [0, 1, 2].map((i) => {
    const delay = i * 6;
    const phase = (frame - thinkingStart + delay) % 18;
    // 正弦波弹跳：phase 0→9 上升，9→18 下降
    return Math.sin((phase / 18) * Math.PI) * 8 + 4;
  });

  // 回复区域淡入
  const responseAreaOpacity = interpolate(
    frame,
    [typingStart - 5, typingStart + 5],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // 打字完成后的光标淡出
  const cursorOpacity = isTypingDone
    ? interpolate(
        frame,
        [typingStart + response.length * speed, typingStart + response.length * speed + 15],
        [1, 0.6],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 1;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "SF Pro Text, -apple-system, Helvetica, Arial, sans-serif",
      }}
    >
      {/* 聊天窗口 */}
      <div
        style={{
          width: "80%",
          maxWidth: 2000,
          height: "80%",
          maxHeight: "100%",
          background: "#ffffff",
          borderRadius,
          border: `1px solid rgba(0,0,0,0.1)`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(217,119,87,0.08)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 顶部标题栏 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            background: "rgba(0,0,0,0.02)",
            flexShrink: 0,
          }}
        >
          {/* Claude Logo 圆点 */}
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${accentColor}, #b85d3d)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span style={{ color: "#1a1a1a", fontWeight: 600, fontSize: 13 }}>
            Claude
          </span>
          <span
            style={{
              color: accentColor,
              fontSize: 10,
              padding: "2px 6px",
              background: `${accentColor}20`,
              borderRadius: 4,
              fontWeight: 500,
            }}
          >
            AI
          </span>
          <span style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: "#ff5f57" }} />
            <div style={{ width: 10, height: 10, borderRadius: 5, background: "#febc2e" }} />
            <div style={{ width: 10, height: 10, borderRadius: 5, background: "#28c840" }} />
          </div>
        </div>

        {/* 消息区域 */}
        <div
          style={{
            flex: 1,
            padding: "20px 24px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* 用户提问气泡 */}
          <div
            style={{
              opacity: promptOpacity,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                background: "rgba(0,0,0,0.05)",
                padding: "10px 16px",
                borderRadius: 14,
                borderBottomRightRadius: 4,
                maxWidth: "75%",
                color: "#1a1a1a",
                fontSize,
                lineHeight: 1.6,
              }}
            >
              {prompt}
            </div>
          </div>

          {/* Claude 回复 */}
          <div
            style={{
              opacity: responseAreaOpacity,
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            {/* Claude 头像 */}
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${accentColor}, #b85d3d)`,
                flexShrink: 0,
                marginTop: 2,
              }}
            />

            {/* 回复内容 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* 思考中动画 */}
              {!isTypingDone && charsToShow === 0 && frame >= thinkingStart ? (
                <div style={{ display: "flex", gap: 4, alignItems: "center", height: fontSize * 1.6 }}>
                  {thinkingDots.map((y, i) => (
                    <div
                      key={i}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: accentColor,
                        transform: `translateY(${-y}px)`,
                        opacity: 0.3 + (y - 4) / 8 * 0.7,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    color: "#2a2a2a",
                    fontSize,
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {typedText}
                  {/* 光标 */}
                  <span
                    style={{
                      display: "inline-block",
                      width: 2,
                      height: fontSize * 1.1,
                      background: accentColor,
                      marginLeft: 2,
                      verticalAlign: "text-bottom",
                      opacity: cursorVisible ? cursorOpacity : 0,
                      borderRadius: 1,
                      boxShadow: `0 0 4px ${accentColor}80`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部输入栏 */}
        <div
          style={{
            padding: "8px 16px",
            borderTop: "1px solid rgba(0,0,0,0.08)",
            background: "rgba(0,0,0,0.02)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 32,
              background: "rgba(0,0,0,0.04)",
              borderRadius: 8,
              border: "1px solid rgba(0,0,0,0.1)",
              display: "flex",
              alignItems: "center",
              paddingLeft: 12,
              color: "#555",
              fontSize: 12,
            }}
          >
            {isTypingDone ? "Reply to Claude..." : "Claude is typing..."}
          </div>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: isTypingDone
                ? `linear-gradient(135deg, ${accentColor}, #b85d3d)`
                : "rgba(0,0,0,0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.3s",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
