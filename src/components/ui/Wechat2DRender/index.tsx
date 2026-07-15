import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * 微信 2D 二维码渲染组件
 *
 * 在视频中展示微信风格的二维码，适用于营销、引流场景：
 * - 模拟微信二维码图案（伪随机像素矩阵）
 * - 三个定位角标（左上、右上、左下）
 * - 微信绿色主题色，可配置
 * - 支持中心 Logo（文字或字母）
 * - 入场动画：缩放 + 淡入
 * - 支持呼吸光效、扫描线动画
 */

// 伪随机数生成器（基于种子，保证每帧渲染一致）
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// 生成二维码模块矩阵
function generateQRMatrix(
  size: number,
  seed: number,
  dataLevel: number,
): boolean[][] {
  const matrix: boolean[][] = [];
  const rng = seededRandom(seed);

  for (let y = 0; y < size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x++) {
      // 三个定位角区域留空（稍后单独绘制）
      const inTopLeftFinder = x < 7 && y < 7;
      const inTopRightFinder = x >= size - 7 && y < 7;
      const inBottomLeftFinder = x < 7 && y >= size - 7;
      if (inTopLeftFinder || inTopRightFinder || inBottomLeftFinder) {
        row.push(false);
        continue;
      }
      // 定时线（第 6 行/列交替黑白）
      if (x === 6 || y === 6) {
        row.push((x + y) % 2 === 0);
        continue;
      }
      // 数据区：伪随机填充，dataLevel 越高密度越高
      row.push(rng() < 0.45 + dataLevel * 0.05);
    }
    matrix.push(row);
  }

  return matrix;
}

export const Wechat2DRender: React.FC<{
  /** 二维码尺寸（像素，正方形边长） */
  readonly qrSize?: number;
  /** 前景色（二维码模块颜色） */
  readonly fgColor?: string;
  /** 背景色 */
  readonly bgColor?: string;
  /** 微信主题色（角标、Logo 背景） */
  readonly wechatColor?: string;
  /** 中心 Logo 文字 */
  readonly logoText?: string;
  /** Logo 字体大小 */
  readonly logoFontSize?: number;
  /** 二维码模块数量（决定密度） */
  readonly moduleCount?: number;
  /** 随机种子（改变二维码图案） */
  readonly seed?: number;
  /** 数据密度级别 0-3 */
  readonly dataLevel?: number;
  /** 是否显示扫描线动画 */
  readonly showScanLine?: boolean;
  /** 是否显示呼吸光效 */
  readonly showGlow?: boolean;
  /** 底部提示文字 */
  readonly hintText?: string;
  /** 提示文字颜色 */
  readonly hintColor?: string;
  /** 提示文字大小 */
  readonly hintFontSize?: number;
  /** 圆角大小 */
  readonly borderRadius?: number;
  /** 是否显示白色边框 */
  readonly showBorder?: boolean;
}> = ({
  qrSize = 400,
  fgColor = "#1a1a1a",
  bgColor = "#ffffff",
  wechatColor = "#07C160",
  logoText = "微信",
  logoFontSize = 20,
  moduleCount = 33,
  seed = 42,
  dataLevel = 1,
  showScanLine = true,
  showGlow = true,
  hintText = "长按识别二维码",
  hintColor = "#07C160",
  hintFontSize = 16,
  borderRadius = 12,
  showBorder = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // 生成二维码矩阵（useMemo 避免每帧重新生成）
  const matrix = useMemo(
    () => generateQRMatrix(moduleCount, seed, dataLevel),
    [moduleCount, seed, dataLevel],
  );

  // 入场动画：缩放 + 淡入
  const enterProgress = spring({
    frame,
    fps,
    config: { damping: 200 },
  });
  const scale = interpolate(enterProgress, [0, 1], [0.5, 1]);
  const enterOpacity = interpolate(enterProgress, [0, 1], [0, 1]);

  // 出场动画：最后 15 帧淡出
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames - 5],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const opacity = Math.min(enterOpacity, exitOpacity);

  // 呼吸光效
  const glowIntensity = showGlow
    ? interpolate(
        Math.sin((frame / fps) * 1.5),
        [-1, 1],
        [0.15, 0.4],
      )
    : 0;

  // 扫描线位置（从上到下循环）
  const scanLineProgress = showScanLine
    ? interpolate(
        (frame % (fps * 3)) / (fps * 3),
        [0, 1],
        [0, 1],
      )
    : 0;

  // 模块像素大小
  const moduleSize = qrSize / moduleCount;

  // 渲染定位角标（嵌套方形）
  const renderFinder = (offsetX: number, offsetY: number) => {
    const outerSize = 7 * moduleSize;
    const innerSize = 5 * moduleSize;
    const centerSize = 3 * moduleSize;
    const innerOffset = moduleSize;
    const centerOffset = 2 * moduleSize;

    return (
      <div key={`finder-${offsetX}-${offsetY}`}>
        {/* 外框 */}
        <div
          style={{
            position: "absolute",
            left: offsetX,
            top: offsetY,
            width: outerSize,
            height: outerSize,
            border: `${moduleSize}px solid ${fgColor}`,
            borderRadius: moduleSize * 0.3,
            boxSizing: "border-box",
          }}
        />
        {/* 内部空白 */}
        <div
          style={{
            position: "absolute",
            left: offsetX + innerOffset,
            top: offsetY + innerOffset,
            width: innerSize - 2 * moduleSize,
            height: innerSize - 2 * moduleSize,
            background: bgColor,
          }}
        />
        {/* 中心实心方块 */}
        <div
          style={{
            position: "absolute",
            left: offsetX + centerOffset,
            top: offsetY + centerOffset,
            width: centerSize,
            height: centerSize,
            background: fgColor,
            borderRadius: moduleSize * 0.3,
          }}
        />
      </div>
    );
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bgColor,
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          transform: `scale(${scale})`,
        }}
      >
        {/* 二维码容器 */}
        <div
          style={{
            position: "relative",
            width: qrSize + (showBorder ? 40 : 0),
            height: qrSize + (showBorder ? 40 : 0),
            background: showBorder ? "#ffffff" : "transparent",
            borderRadius: showBorder ? borderRadius + 4 : borderRadius,
            padding: showBorder ? 20 : 0,
            boxShadow: showGlow
              ? `0 0 ${qrSize * glowIntensity}px ${wechatColor}40, 0 8px 32px rgba(0,0,0,0.12)`
              : "0 8px 32px rgba(0,0,0,0.12)",
          }}
        >
          {/* 二维码画布 */}
          <div
            style={{
              position: "relative",
              width: qrSize,
              height: qrSize,
              background: bgColor,
              borderRadius: borderRadius,
              overflow: "hidden",
            }}
          >
            {/* 二维码模块 */}
            {matrix.map((row, y) =>
              row.map((isBlack, x) => {
                if (!isBlack) return null;
                return (
                  <div
                    key={`${x}-${y}`}
                    style={{
                      position: "absolute",
                      left: x * moduleSize,
                      top: y * moduleSize,
                      width: moduleSize,
                      height: moduleSize,
                      background: fgColor,
                    }}
                  />
                );
              }),
            )}

            {/* 定位角标 */}
            {renderFinder(0, 0)}
            {renderFinder((moduleCount - 7) * moduleSize, 0)}
            {renderFinder(0, (moduleCount - 7) * moduleSize)}

            {/* 扫描线 */}
            {showScanLine && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: `${scanLineProgress * 100}%`,
                  height: 3,
                  background: `linear-gradient(90deg, transparent, ${wechatColor}, transparent)`,
                  boxShadow: `0 0 12px ${wechatColor}, 0 0 24px ${wechatColor}80`,
                  transform: "translateY(-50%)",
                  zIndex: 5,
                }}
              >
                {/* 扫描线光晕 */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: -40,
                    height: 40,
                    background: `linear-gradient(180deg, transparent, ${wechatColor}15)`,
                  }}
                />
              </div>
            )}

            {/* 中心 Logo */}
            {logoText && (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: qrSize * 0.2,
                  height: qrSize * 0.2,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${wechatColor}, #06AD56)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 0 0 4px ${bgColor}, 0 4px 12px rgba(0,0,0,0.15)`,
                  zIndex: 10,
                }}
              >
                <span
                  style={{
                    color: "#ffffff",
                    fontSize: logoFontSize,
                    fontWeight: 700,
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
                    textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  }}
                >
                  {logoText}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 底部提示文字 */}
        {hintText && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              opacity: opacity,
            }}
          >
            {/* 微信图标 */}
            <div
              style={{
                width: hintFontSize + 6,
                height: hintFontSize + 6,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${wechatColor}, #06AD56)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width={hintFontSize}
                height={hintFontSize}
                viewBox="0 0 24 24"
                fill="#fff"
              >
                <path d="M8.5 4C4.36 4 1 6.69 1 10c0 1.89 1.08 3.56 2.78 4.66L3 17l2.5-1.32c.96.26 1.96.4 3 .4h.27c-.18-.57-.27-1.17-.27-1.8 0-3.2 3.13-5.8 7-5.8.25 0 .5.01.74.04C15.87 5.87 12.5 4 8.5 4zM6 9.5c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm5 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z" />
                <path d="M23 14.28c0-2.65-2.69-4.8-6-4.8s-6 2.15-6 4.8 2.69 4.8 6 4.8c.69 0 1.35-.09 1.96-.26L21 20l-.53-1.79c1.54-.88 2.53-2.3 2.53-3.93zM14 13.5c.41 0 .75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75zm4 0c.41 0 .75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75z" />
              </svg>
            </div>
            <span
              style={{
                color: hintColor,
                fontSize: hintFontSize,
                fontWeight: 600,
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
              }}
            >
              {hintText}
            </span>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};