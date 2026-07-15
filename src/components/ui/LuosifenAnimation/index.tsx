import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * 螺蛳粉产业数据可视化 · 数据故事动画
 *
 * 把旁白稿（螺蛳粉 5.1 万家店 vs 沙县小吃 / 蜜雪冰城 + 813 亿产业链）
 * 拆成 7 个连续阶段，每阶段做不同的视觉化呈现：
 *
 *   1. 开场震撼：5.1万 大字数字滚动
 *   2. 沙县小吃对比：10万 vs 5.1万  双条形图
 *   3. 蜜雪冰城切入：5.5万 大字
 *   4. 一一对应：蜜雪冰城 ⇄ 螺蛳粉 配对
 *   5. 国民品类：徽章动效
 *   6. 813 亿产业链：堆叠柱状图 + 三类拆分
 *   7. 收尾：疑问淡出
 */

const FONT_HEI =
  "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif";
const FONT_NUM =
  "'SF Pro Display', 'Helvetica Neue', 'DIN Alternate', 'DIN', 'Inter', system-ui, sans-serif";

// 主题色
const C = {
  bg1: "#0f0707",
  bg2: "#1a0c08",
  bg3: "#2a1208",
  card: "rgba(255, 200, 150, 0.04)",
  cardBorder: "rgba(255, 165, 100, 0.18)",

  // 螺蛳粉主色
  luosifen: "#ff6b35",       // 番茄红
  luosifenDeep: "#d84315",   // 深红
  luosifenGlow: "#ffa726",   // 暖橙
  soup: "#ffd166",           // 汤底奶黄
  chili: "#e53935",          // 辣椒红
  // 沙县小吃色
  shaxian: "#5d4037",
  shaxianGlow: "#8d6e63",
  // 蜜雪冰城色
  mixue: "#2e7d32",          // 雪王绿
  mixueGlow: "#66bb6a",
  // 金色（国民品类）
  gold: "#fbbf24",
  goldDeep: "#f59e0b",
  // 文字
  text: "#fff5e6",
  textSub: "#ffd7b5",
  textDim: "#a89888",
} as const;

// 入场辅助：指定区间内做透明度 + 位移入场
function enter(
  frame: number,
  fromFrame: number,
  durationFrames = 18,
  distance = 24,
): { opacity: number; translateY: number; progress: number } {
  const p = interpolate(frame, [fromFrame, fromFrame + durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return { opacity: p, translateY: (1 - p) * distance, progress: p };
}

// 数字插值（保留小数位）
function tweenNumber(
  from: number,
  to: number,
  frame: number,
  fromFrame: number,
  durationFrames: number,
  decimals = 0,
): number {
  const p = interpolate(frame, [fromFrame, fromFrame + durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const v = from + (to - from) * p;
  const k = Math.pow(10, decimals);
  return Math.round(v * k) / k;
}

export const LuosifenAnimation: React.FC<{
  /** 阶段切换曲线松紧度（默认 18） */
  readonly enterDuration?: number;
  /** 背景透明度（0=完全透明，叠加在视频上用 0；纯色背景用 1） */
  readonly bgOpacity?: number;
  /** 背景渐变起始色 */
  readonly bgStart?: string;
  /** 背景渐变结束色 */
  readonly bgEnd?: string;
  /** 主强调色（螺蛳粉） */
  readonly accentColor?: string;
  /** 文字颜色 */
  readonly textColor?: string;
  /** 全局字体缩放（0.6-1.4） */
  readonly fontScale?: number;
  /** 文字描边强度 0-1（叠加在视频上时调大） */
  readonly textStroke?: number;
  /** 底部蒙版强度 0-1（提高文字可读性） */
  readonly bottomMask?: number;
  /** 视频宽度（兜底） */
  readonly videoWidth?: number;
  /** 视频高度（兜底） */
  readonly videoHeight?: number;
}> = ({
  bgOpacity = 0,
  bgStart = C.bg1,
  bgEnd = C.bg3,
  accentColor = C.luosifen,
  textColor = "#ffffff",
  fontScale = 1,
  textStroke = 0.8,
  bottomMask = 0.5,
  videoWidth = 1920,
  videoHeight = 1080,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: vw, height: vh, durationInFrames } = useVideoConfig();
  const width = vw || videoWidth;
  const height = vh || videoHeight;

  // ====== 阶段分界（30fps，20s 总时长 600 帧） ======
  // 1: 0-90    (0-3s)   开场 5.1万
  // 2: 90-180  (3-6s)   沙县对比
  // 3: 180-270 (6-9s)   蜜雪冰城
  // 4: 270-360 (9-12s)  一一对应
  // 5: 360-420 (12-14s) 国民品类
  // 6: 420-540 (14-18s) 813亿产业链
  // 7: 540-end (18s+)   收尾
  const s1End = 90;
  const s2End = 180;
  const s3End = 270;
  const s4End = 360;
  const s5End = 420;
  const s6End = 540;

  // 全局退出淡出（最后 18 帧）
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 18, durationInFrames - 4],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // 文字描边样式（叠加在视频上时保证可读性）
  const strokePx = textStroke * 4;
  const textShadowStyle = textStroke > 0
    ? `0 ${strokePx * 0.5}px ${strokePx * 2}px rgba(0,0,0,0.6), 0 0 ${strokePx}px rgba(0,0,0,0.8)`
    : "none";
  const strokeStyle = textStroke > 0
    ? `${strokePx}px #000`
    : "0px transparent";

  return (
    <AbsoluteFill
      style={{
        background: bgOpacity > 0
          ? `radial-gradient(ellipse at 50% 30%, ${bgEnd} 0%, ${bgStart} 70%, #000 100%)`
          : "transparent",
        fontFamily: FONT_HEI,
        color: textColor,
        opacity: exitOpacity,
        overflow: "hidden",
      }}
    >
      {/* 背景装饰（只有 bgOpacity > 0 时显示） */}
      {bgOpacity > 0 && (
        <BackgroundDecor frame={frame} fps={fps} accentColor={accentColor} />
      )}

      {/* 底部渐变蒙版：提高下方文字可读性（叠加视频时尤其重要） */}
      {bottomMask > 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "55%",
            background: `linear-gradient(180deg, transparent 0%, rgba(0,0,0,${bottomMask * 0.4}) 45%, rgba(0,0,0,${bottomMask * 0.7}) 100%)`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* 顶部暗角：不让标题和亮部视频打架 */}
      {bottomMask > 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: "25%",
            background: `linear-gradient(0deg, transparent 0%, rgba(0,0,0,${bottomMask * 0.35}) 100%)`,
            pointerEvents: "none",
          }}
        />
      )}

      <AbsoluteFill
        style={{
          padding: `${60 * fontScale}px ${60 * fontScale}px`,
          paddingBottom: `${100 * fontScale}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "center",
          // 全局文字阴影（让所有文字自动带描边感）
          textShadow: textShadowStyle,
        }}
      >
        {/* 通过 CSS 变量把描边传下去 */}
        <div
          style={{
            "--stroke-color": "#000",
            "--stroke-width": strokeStyle,
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            alignItems: "center",
          } as React.CSSProperties}
        >
        {frame < s1End && (
          <Stage1
            frame={frame}
            fps={fps}
            fontScale={fontScale}
            accentColor={accentColor}
            width={width}
            height={height}
            textColor={textColor}
            textStroke={textStroke}
          />
        )}
        {frame >= s1End && frame < s2End && (
          <Stage2
            frame={frame - s1End}
            fontScale={fontScale}
            accentColor={accentColor}
            textColor={textColor}
            textStroke={textStroke}
          />
        )}
        {frame >= s2End && frame < s3End && (
          <Stage3
            frame={frame - s2End}
            fps={fps}
            fontScale={fontScale}
            textColor={textColor}
            textStroke={textStroke}
          />
        )}
        {frame >= s3End && frame < s4End && (
          <Stage4
            frame={frame - s3End}
            fontScale={fontScale}
            accentColor={accentColor}
            textColor={textColor}
            textStroke={textStroke}
          />
        )}
        {frame >= s4End && frame < s5End && (
          <Stage5
            frame={frame - s4End}
            fps={fps}
            fontScale={fontScale}
            textColor={textColor}
            textStroke={textStroke}
          />
        )}
        {frame >= s5End && frame < s6End && (
          <Stage6
            frame={frame - s5End}
            fps={fps}
            fontScale={fontScale}
            accentColor={accentColor}
            textColor={textColor}
            textStroke={textStroke}
          />
        )}
        {frame >= s6End && (
          <Stage7
            frame={frame - s6End}
            fontScale={fontScale}
            accentColor={accentColor}
            textColor={textColor}
            textStroke={textStroke}
          />
        )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ================= 背景装饰 =================
const BackgroundDecor: React.FC<{
  frame: number;
  fps: number;
  accentColor: string;
}> = ({ frame, accentColor }) => {
  return (
    <>
      {/* 中心暖色光晕 */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "40%",
          width: 1400,
          height: 1400,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, ${accentColor}22 0%, ${accentColor}08 35%, transparent 70%)`,
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      {/* 飘动的辣椒 / 汤底粒子 */}
      {[
        { ch: "🌶", x: 8, y: 12, size: 40, spd: 0.18 },
        { ch: "🍜", x: 88, y: 18, size: 56, spd: 0.12 },
        { ch: "🌶", x: 14, y: 82, size: 36, spd: 0.22 },
        { ch: "🥢", x: 90, y: 78, size: 44, spd: 0.15 },
        { ch: "🌶", x: 50, y: 6, size: 32, spd: 0.2 },
        { ch: "🍲", x: 6, y: 48, size: 48, spd: 0.14 },
        { ch: "🌶", x: 92, y: 50, size: 30, spd: 0.19 },
        { ch: "🥢", x: 48, y: 92, size: 42, spd: 0.13 },
      ].map((p, i) => {
        const driftY = (frame * p.spd) % 100;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${(p.y + driftY) % 100}%`,
              fontSize: p.size,
              opacity: 0.08 + (i % 3) * 0.02,
              transform: `rotate(${(frame * (0.3 + (i % 3) * 0.15)) % 360}deg)`,
              pointerEvents: "none",
              userSelect: "none",
              filter: "blur(1.5px)",
            }}
          >
            {p.ch}
          </div>
        );
      })}
    </>
  );
};

// ================= Stage 1：5.1万开场 =================
const Stage1: React.FC<{
  frame: number;
  fps: number;
  fontScale: number;
  accentColor: string;
  width: number;
  height: number;
  textColor: string;
  textStroke: number;
}> = ({ frame, fps, fontScale, accentColor, textColor, textStroke }) => {
  const titleEnter = enter(frame, 0, 18);
  const numberEnter = enter(frame, 15, 22);
  const subEnter = enter(frame, 45, 18);

  // 数字滚动：0 → 5.1
  const num = tweenNumber(0, 5.1, frame, 18, 38, 1);
  // 个位"万"字微抖动
  const shake = Math.sin(frame * 0.6) * 1.5;
  // 数字进入时的 spring 弹动
  const numSpring = spring({
    frame: frame - 18,
    fps,
    config: { damping: 12, mass: 0.6, stiffness: 180 },
  });
  const numScale = 0.7 + 0.3 * Math.min(1, numSpring);

  // 强描边样式（大数字用）
  const strongStroke = textStroke > 0
    ? `0 0 ${textStroke * 8}px rgba(0,0,0,0.9), 0 ${textStroke * 3}px ${textStroke * 10}px rgba(0,0,0,0.8)`
    : "none";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14 * fontScale,
        width: "100%",
      }}
    >
      {/* 顶部小标签 */}
      <div
        style={{
          opacity: titleEnter.opacity,
          transform: `translateY(${titleEnter.translateY}px)`,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 22px",
          background: "rgba(0,0,0,0.45)",
          border: `1px solid ${accentColor}55`,
          borderRadius: 999,
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            background: accentColor,
            boxShadow: `0 0 10px ${accentColor}`,
          }}
        />
        <div
          style={{
            fontSize: 16 * fontScale,
            color: "#fff",
            letterSpacing: 4,
            fontWeight: 600,
            textShadow: "0 1px 4px rgba(0,0,0,0.8)",
          }}
        >
          国民小吃数据报告
        </div>
      </div>

      {/* 主标题 */}
      <div
        style={{
          opacity: titleEnter.opacity,
          transform: `translateY(${titleEnter.translateY}px)`,
          fontSize: 38 * fontScale,
          fontWeight: 700,
          color: textColor,
          letterSpacing: 3,
          marginTop: 4,
        }}
      >
        螺蛳粉线下实体店已达
      </div>

      {/* 大数字 */}
      <div
        style={{
          opacity: numberEnter.opacity,
          transform: `translateY(${numberEnter.translateY}px) scale(${numScale}) translateX(${shake}px)`,
          display: "flex",
          alignItems: "baseline",
          gap: 6,
          lineHeight: 1,
        }}
      >
        <div
          style={{
            fontFamily: FONT_NUM,
            fontSize: 200 * fontScale,
            fontWeight: 900,
            color: "#fff",
            letterSpacing: -4,
            fontVariantNumeric: "tabular-nums",
            textShadow: `0 0 20px ${accentColor}cc, ${strongStroke}`,
            WebkitTextStroke: textStroke > 0 ? `${textStroke * 2}px ${accentColor}` : "none",
          }}
        >
          {num.toFixed(1)}
        </div>
        <div
          style={{
            fontSize: 72 * fontScale,
            fontWeight: 800,
            color: accentColor,
            textShadow: `0 0 20px ${accentColor}cc, 0 2px 8px rgba(0,0,0,0.8)`,
          }}
        >
          万
        </div>
      </div>

      {/* 副标题 */}
      <div
        style={{
          opacity: subEnter.opacity,
          transform: `translateY(${subEnter.translateY}px)`,
          display: "flex",
          alignItems: "center",
          gap: 18,
          marginTop: 4,
        }}
      >
        <div
          style={{
            width: 40,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${accentColor})`,
          }}
        />
        <div
          style={{
            fontSize: 28 * fontScale,
            fontWeight: 600,
            color: "#ffe0b2",
            letterSpacing: 3,
            textShadow: "0 1px 6px rgba(0,0,0,0.8)",
          }}
        >
          家 门 店 · 遍 布 全 国
        </div>
        <div
          style={{
            width: 40,
            height: 2,
            background: `linear-gradient(90deg, ${accentColor}, transparent)`,
          }}
        />
      </div>
    </div>
  );
};

// ================= Stage 2：沙县小吃对比 =================
const Stage2: React.FC<{
  frame: number;
  fontScale: number;
  accentColor: string;
  textColor: string;
  textStroke: number;
}> = ({ frame, fontScale, accentColor, textColor, textStroke }) => {
  const titleEnter = enter(frame, 0, 16);

  // 条形增长
  const shaxianW = interpolate(frame, [10, 50], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const luosifenW = interpolate(frame, [18, 60], [0, 51], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const strongStroke = textStroke > 0
    ? `0 0 ${textStroke * 6}px rgba(0,0,0,0.85), 0 ${textStroke * 2}px ${textStroke * 6}px rgba(0,0,0,0.7)`
    : "none";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24 * fontScale,
        width: "100%",
        maxWidth: 1400,
        alignItems: "center",
      }}
    >
      <div
        style={{
          opacity: titleEnter.opacity,
          transform: `translateY(${titleEnter.translateY}px)`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 20 * fontScale,
            color: "#ffe0b2",
            letterSpacing: 5,
            fontWeight: 500,
            marginBottom: 4,
            textShadow: "0 1px 4px rgba(0,0,0,0.8)",
          }}
        >
          要 知 道 · 强 如
        </div>
        <div
          style={{
            fontSize: 44 * fontScale,
            fontWeight: 800,
            color: textColor,
            letterSpacing: -1,
            textShadow: strongStroke,
          }}
        >
          国民小吃之王 · 沙县小吃
        </div>
        <div
          style={{
            fontSize: 24 * fontScale,
            color: "#ffe0b2",
            marginTop: 6,
            fontWeight: 500,
            textShadow: "0 1px 4px rgba(0,0,0,0.8)",
          }}
        >
          国内也就有近 <span style={{ fontWeight: 800, color: "#fff" }}>10 万+</span> 家店
        </div>
      </div>

      {/* 对比条 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          width: "100%",
          padding: "20px 32px",
          background: "rgba(0,0,0,0.35)",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
        }}
      >
        {/* 沙县小吃 */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 140,
              fontSize: 22 * fontScale,
              fontWeight: 700,
              color: "#d7ccc8",
              textAlign: "right",
              textShadow: "0 1px 4px rgba(0,0,0,0.8)",
            }}
          >
            沙县小吃
          </div>
          <div
            style={{
              flex: 1,
              height: 48,
              background: "rgba(255,255,255,0.08)",
              borderRadius: 24,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <div
              style={{
                width: `${shaxianW}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${C.shaxian}, #a1887f)`,
                borderRadius: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingRight: 20,
                fontSize: 20 * fontScale,
                fontWeight: 800,
                color: "#fff",
                fontFamily: FONT_NUM,
                boxShadow: `inset 0 0 16px rgba(255,255,255,0.2)`,
                textShadow: "0 1px 4px rgba(0,0,0,0.5)",
              }}
            >
              10万+
            </div>
          </div>
        </div>

        {/* 螺蛳粉 */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 140,
              fontSize: 22 * fontScale,
              fontWeight: 700,
              color: accentColor,
              textAlign: "right",
              textShadow: `0 0 10px ${accentColor}aa, 0 1px 4px rgba(0,0,0,0.8)`,
            }}
          >
            螺蛳粉
          </div>
          <div
            style={{
              flex: 1,
              height: 48,
              background: "rgba(255,255,255,0.08)",
              borderRadius: 24,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <div
              style={{
                width: `${luosifenW}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${accentColor}, ${C.luosifenGlow})`,
                borderRadius: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingRight: 20,
                fontSize: 20 * fontScale,
                fontWeight: 800,
                color: "#fff",
                fontFamily: FONT_NUM,
                boxShadow: `0 0 16px ${accentColor}66, inset 0 0 16px rgba(255,255,255,0.2)`,
                textShadow: "0 1px 4px rgba(0,0,0,0.5)",
              }}
            >
              5.1万
            </div>
          </div>
        </div>
      </div>

      {/* 底部说明 */}
      <div
        style={{
          opacity: enter(frame, 55, 18).opacity,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 20px",
          background: "rgba(0,0,0,0.4)",
          borderRadius: 999,
          fontSize: 20 * fontScale,
          color: "#ffe0b2",
          border: "1px solid rgba(255,255,255,0.1)",
          textShadow: "0 1px 4px rgba(0,0,0,0.8)",
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            background: C.soup,
            boxShadow: `0 0 8px ${C.soup}`,
          }}
        />
        螺蛳粉店数 ≈ 沙县小吃的一半
      </div>
    </div>
  );
};

// ================= Stage 3：蜜雪冰城切入 =================
const Stage3: React.FC<{
  frame: number;
  fps: number;
  fontScale: number;
  textColor: string;
  textStroke: number;
}> = ({ frame, fps, fontScale, textColor, textStroke }) => {
  const line1 = enter(frame, 0, 16);
  const line2 = enter(frame, 18, 16);
  const numEnter = enter(frame, 38, 20);
  const num = tweenNumber(0, 5.5, frame, 40, 36, 1);
  const numSpring = spring({
    frame: frame - 40,
    fps,
    config: { damping: 14, mass: 0.5, stiffness: 200 },
  });
  const numScale = 0.7 + 0.3 * Math.min(1, numSpring);

  const strongStroke = textStroke > 0
    ? `0 0 ${textStroke * 8}px rgba(0,0,0,0.9), 0 ${textStroke * 3}px ${textStroke * 8}px rgba(0,0,0,0.8)`
    : "none";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18 * fontScale,
        width: "100%",
      }}
    >
      <div
        style={{
          opacity: line1.opacity,
          transform: `translateY(${line1.translateY}px)`,
          fontSize: 28 * fontScale,
          color: "#e0e0e0",
          letterSpacing: 2,
          textShadow: "0 1px 5px rgba(0,0,0,0.8)",
        }}
      >
        如果你对这个体量无感
      </div>
      <div
        style={{
          opacity: line2.opacity,
          transform: `translateY(${line2.translateY}px)`,
          fontSize: 28 * fontScale,
          color: "#e0e0e0",
          letterSpacing: 2,
          textShadow: "0 1px 5px rgba(0,0,0,0.8)",
        }}
      >
        我们再说一个数据
      </div>

      {/* 蜜雪冰城 logo 风格大字 */}
      <div
        style={{
          opacity: numEnter.opacity,
          transform: `translateY(${numEnter.translateY}px) scale(${numScale})`,
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginTop: 12,
          padding: "20px 40px",
          background: "rgba(0,0,0,0.35)",
          borderRadius: 28,
          border: `1px solid ${C.mixue}55`,
          backdropFilter: "blur(10px)",
        }}
      >
        {/* 雪王雪糕图标替代 */}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            background: `linear-gradient(135deg, ${C.mixue}, ${C.mixueGlow})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 56,
            boxShadow: `0 0 30px ${C.mixue}88`,
            border: "3px solid #fff",
          }}
        >
          🍦
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              fontSize: 22 * fontScale,
              color: C.mixueGlow,
              letterSpacing: 4,
              fontWeight: 700,
              textShadow: "0 1px 4px rgba(0,0,0,0.8)",
            }}
          >
            蜜雪冰城
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 6,
              lineHeight: 1,
              marginTop: 2,
            }}
          >
            <div
              style={{
                fontFamily: FONT_NUM,
                fontSize: 120 * fontScale,
                fontWeight: 900,
                color: "#fff",
                letterSpacing: -3,
                fontVariantNumeric: "tabular-nums",
                textShadow: `0 0 20px ${C.mixueGlow}cc, ${strongStroke}`,
                WebkitTextStroke: textStroke > 0 ? `${textStroke * 1.5}px ${C.mixue}` : "none",
              }}
            >
              {num.toFixed(1)}
            </div>
            <div
              style={{
                fontSize: 52 * fontScale,
                fontWeight: 800,
                color: C.mixueGlow,
                textShadow: `0 0 16px ${C.mixueGlow}cc, 0 2px 6px rgba(0,0,0,0.8)`,
              }}
            >
              万
            </div>
          </div>
          <div
            style={{
              fontSize: 18 * fontScale,
              color: "#ccc",
              marginTop: 2,
              letterSpacing: 2,
              textShadow: "0 1px 4px rgba(0,0,0,0.8)",
            }}
          >
            内地门店数
          </div>
        </div>
      </div>
    </div>
  );
};

// ================= Stage 4：一对一对应 =================
const Stage4: React.FC<{
  frame: number;
  fontScale: number;
  accentColor: string;
  textColor: string;
  textStroke: number;
}> = ({ frame, fontScale, accentColor, textColor, textStroke }) => {
  const titleEnter = enter(frame, 0, 16);
  const subtitleEnter = enter(frame, 18, 16);

  // 一对一配对动画
  const pairProgress = interpolate(frame, [38, 78], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // 配对元素列表（4 对示意）
  const pairs = [0, 1, 2, 3];
  const activeCount = Math.floor(pairProgress * pairs.length);

  const strongStroke = textStroke > 0
    ? `0 0 ${textStroke * 6}px rgba(0,0,0,0.85), 0 ${textStroke * 2}px ${textStroke * 6}px rgba(0,0,0,0.7)`
    : "none";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24 * fontScale,
        width: "100%",
      }}
    >
      <div
        style={{
          opacity: titleEnter.opacity,
          transform: `translateY(${titleEnter.translateY}px)`,
          fontSize: 26 * fontScale,
          color: "#e0e0e0",
          letterSpacing: 2,
          textShadow: "0 1px 5px rgba(0,0,0,0.8)",
        }}
      >
        大街小巷上随处可见的
        <span style={{ color: C.mixueGlow, fontWeight: 700, textShadow: `0 0 10px ${C.mixueGlow}aa` }}> 蜜雪冰城 </span>
      </div>

      {/* 一对一配对可视化 */}
      <div
        style={{
          opacity: enter(frame, 28, 16).opacity,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: "24px 40px",
          background: "rgba(0,0,0,0.4)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20,
          backdropFilter: "blur(10px)",
        }}
      >
        {pairs.map((i) => {
          const isActive = i < activeCount;
          const itemDelay = 38 + i * 8;
          const itemEnter = enter(frame, itemDelay, 14);
          return (
            <React.Fragment key={i}>
              <div
                style={{
                  opacity: itemEnter.opacity,
                  transform: `scale(${itemEnter.progress})`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    background: `linear-gradient(135deg, ${C.mixue}, ${C.mixueGlow})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                    border: "2.5px solid #fff",
                    boxShadow: isActive
                      ? `0 0 24px ${C.mixue}aa`
                      : "0 4px 8px rgba(0,0,0,0.3)",
                    transition: "box-shadow 0.3s",
                  }}
                >
                  🍦
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#ddd",
                    fontWeight: 600,
                    letterSpacing: 1,
                    textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                  }}
                >
                  蜜雪
                </div>
              </div>

              <div
                style={{
                  opacity: isActive ? 1 : 0.15,
                  fontSize: 24,
                  color: isActive ? C.gold : "#888",
                  fontWeight: 800,
                  transform: isActive ? "scale(1.2)" : "scale(1)",
                  transition: "all 0.3s",
                  filter: isActive ? `drop-shadow(0 0 6px ${C.gold})` : "none",
                }}
              >
                ⇄
              </div>

              <div
                style={{
                  opacity: itemEnter.opacity,
                  transform: `scale(${itemEnter.progress})`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    background: `linear-gradient(135deg, ${accentColor}, ${C.luosifenGlow})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                    border: "2.5px solid #fff",
                    boxShadow: isActive
                      ? `0 0 24px ${accentColor}aa`
                      : "0 4px 8px rgba(0,0,0,0.3)",
                    transition: "box-shadow 0.3s",
                  }}
                >
                  🍜
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#ddd",
                    fontWeight: 600,
                    letterSpacing: 1,
                    textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                  }}
                >
                  螺蛳粉
                </div>
              </div>

              {i < pairs.length - 1 && (
                <div
                  style={{
                    width: 10,
                    height: 2,
                    background: "rgba(255,255,255,0.15)",
                    margin: "0 4px",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div
        style={{
          opacity: subtitleEnter.opacity,
          transform: `translateY(${subtitleEnter.translateY}px)`,
          textAlign: "center",
          fontSize: 28 * fontScale,
          fontWeight: 600,
          color: textColor,
          textShadow: strongStroke,
        }}
      >
        每一家背后都对应着一家
        <span
          style={{
            color: accentColor,
            fontWeight: 800,
            textShadow: `0 0 20px ${accentColor}aa, ${strongStroke}`,
          }}
        >
          {" "}螺蛳粉店{" "}
        </span>
      </div>
    </div>
  );
};

// ================= Stage 5：国民品类 =================
const Stage5: React.FC<{
  frame: number;
  fps: number;
  fontScale: number;
  textColor: string;
  textStroke: number;
}> = ({ frame, fps, fontScale, textColor, textStroke }) => {
  const line1 = enter(frame, 0, 16);
  const line2 = enter(frame, 15, 16);
  const badgeEnter = enter(frame, 32, 22);

  const badgeSpring = spring({
    frame: frame - 32,
    fps,
    config: { damping: 8, mass: 0.7, stiffness: 220 },
  });
  const badgeScale = 0.3 + 0.7 * Math.min(1, badgeSpring);

  const strongStroke = textStroke > 0
    ? `0 0 ${textStroke * 6}px rgba(0,0,0,0.85), 0 ${textStroke * 2}px ${textStroke * 6}px rgba(0,0,0,0.7)`
    : "none";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20 * fontScale,
        width: "100%",
      }}
    >
      <div
        style={{
          opacity: line1.opacity,
          transform: `translateY(${line1.translateY}px)`,
          fontSize: 30 * fontScale,
          color: "#e0e0e0",
          letterSpacing: 2,
          textShadow: "0 1px 5px rgba(0,0,0,0.8)",
        }}
      >
        螺蛳粉能有如此规模
      </div>
      <div
        style={{
          opacity: line1.opacity,
          transform: `translateY(${line1.translateY}px)`,
          fontSize: 30 * fontScale,
          color: "#e0e0e0",
          letterSpacing: 2,
          textShadow: "0 1px 5px rgba(0,0,0,0.8)",
        }}
      >
        意味着它已经悄悄从
      </div>

      {/* 转折箭头 + 国民品类 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
          margin: "6px 0",
        }}
      >
        <div
          style={{
            opacity: line2.opacity,
            transform: `translateX(${-line2.progress * 24}px)`,
            padding: "8px 20px",
            background: "rgba(0,0,0,0.4)",
            border: "1.5px dashed rgba(255,255,255,0.3)",
            borderRadius: 10,
            fontSize: 26 * fontScale,
            color: "#888",
            fontWeight: 600,
            textDecoration: "line-through",
            textDecorationColor: "#888",
            textShadow: "0 1px 4px rgba(0,0,0,0.8)",
          }}
        >
          小众单品
        </div>
        <div
          style={{
            opacity: line2.opacity,
            fontSize: 48 * fontScale,
            color: C.gold,
            fontWeight: 800,
            filter: `drop-shadow(0 0 10px ${C.gold}aa)`,
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}
        >
          →
        </div>
        {/* 国民品类徽章 */}
        <div
          style={{
            opacity: badgeEnter.opacity,
            transform: `scale(${badgeScale}) rotate(${(1 - badgeEnter.progress) * -8}deg)`,
            padding: "12px 28px",
            background: `linear-gradient(135deg, ${C.gold}, ${C.goldDeep})`,
            borderRadius: 14,
            boxShadow: `0 10px 32px ${C.gold}88, inset 0 -3px 0 rgba(0,0,0,0.2), inset 0 2px 0 rgba(255,255,255,0.4)`,
            border: "2.5px solid #fff8e1",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 28 }}>👑</div>
          <div
            style={{
              fontSize: 36 * fontScale,
              fontWeight: 900,
              color: "#3a1f00",
              letterSpacing: 3,
              textShadow: "0 1.5px 0 rgba(255,255,255,0.4)",
            }}
          >
            国 民 品 类
          </div>
        </div>
      </div>

      <div
        style={{
          opacity: enter(frame, 50, 18).opacity,
          transform: `translateY(${enter(frame, 50, 18).translateY}px)`,
          fontSize: 24 * fontScale,
          color: C.gold,
          fontWeight: 600,
          letterSpacing: 4,
          textShadow: `0 0 12px ${C.gold}aa, 0 1px 4px rgba(0,0,0,0.6)`,
        }}
      >
        ✦ 悄 然 跃 升 ✦
      </div>
    </div>
  );
};

// ================= Stage 6：813亿产业链 =================
const Stage6: React.FC<{
  frame: number;
  fps: number;
  fontScale: number;
  accentColor: string;
  textColor: string;
  textStroke: number;
}> = ({ frame, fps, fontScale, accentColor, textColor, textStroke }) => {
  const sourceEnter = enter(frame, 0, 14);
  const titleEnter = enter(frame, 8, 14);
  const numEnter = enter(frame, 18, 16);
  const num = tweenNumber(0, 813, frame, 22, 42, 0);
  const numSpring = spring({
    frame: frame - 18,
    fps,
    config: { damping: 14, mass: 0.5, stiffness: 200 },
  });
  const numScale = 0.6 + 0.4 * Math.min(1, numSpring);

  // 三段产业链：实体店 434 / 预包装 163 / 配套 216.1
  const segments = [
    { name: "实体店", value: 434, color: accentColor, glow: C.luosifenGlow, pct: 53.4 },
    { name: "配套及衍生产业", value: 216.1, color: C.soup, glow: "#ffe082", pct: 26.6 },
    { name: "预包装螺蛳粉", value: 163, color: C.gold, glow: "#fde68a", pct: 20.0 },
  ];
  const total = 813.1;

  // 三段条形（依次增长）
  const barProgress = [0, 0, 0];
  segments.forEach((_, i) => {
    barProgress[i] = interpolate(frame, [55 + i * 8, 75 + i * 8], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  });

  const strongStroke = textStroke > 0
    ? `0 0 ${textStroke * 8}px rgba(0,0,0,0.9), 0 ${textStroke * 3}px ${textStroke * 8}px rgba(0,0,0,0.8)`
    : "none";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20 * fontScale,
        width: "100%",
        maxWidth: 1400,
        alignItems: "center",
      }}
    >
      <div
        style={{
          opacity: sourceEnter.opacity,
          transform: `translateY(${sourceEnter.translateY}px)`,
          fontSize: 18 * fontScale,
          color: "#ddd",
          letterSpacing: 3,
          padding: "5px 16px",
          background: "rgba(0,0,0,0.4)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 999,
          textShadow: "0 1px 3px rgba(0,0,0,0.8)",
        }}
      >
        柳州市商务局 · 2025 年数据
      </div>

      <div
        style={{
          opacity: titleEnter.opacity,
          transform: `translateY(${titleEnter.translateY}px)`,
          fontSize: 28 * fontScale,
          color: textColor,
          fontWeight: 600,
          letterSpacing: 1,
          textShadow: "0 1px 5px rgba(0,0,0,0.8)",
        }}
      >
        柳州螺蛳粉全产业链收入
      </div>

      {/* 大数字 813亿 */}
      <div
        style={{
          opacity: numEnter.opacity,
          transform: `translateY(${numEnter.translateY}px) scale(${numScale})`,
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          lineHeight: 1,
        }}
      >
        <div
          style={{
            fontSize: 24 * fontScale,
            color: C.gold,
            fontWeight: 600,
            alignSelf: "flex-start",
            marginTop: 12,
            textShadow: "0 1px 4px rgba(0,0,0,0.8)",
          }}
        >
          突破
        </div>
        <div
          style={{
            fontFamily: FONT_NUM,
            fontSize: 160 * fontScale,
            fontWeight: 900,
            color: "#fff",
            letterSpacing: -3,
            fontVariantNumeric: "tabular-nums",
            textShadow: `0 0 24px ${C.gold}cc, ${strongStroke}`,
            WebkitTextStroke: textStroke > 0 ? `${textStroke * 1.5}px ${C.goldDeep}` : "none",
          }}
        >
          {num}
        </div>
        <div
          style={{
            fontSize: 60 * fontScale,
            fontWeight: 800,
            color: C.gold,
            textShadow: `0 0 24px ${C.gold}cc, 0 2px 8px rgba(0,0,0,0.8)`,
          }}
        >
          亿元
        </div>
      </div>

      {/* 三段堆叠条形 */}
      <div
        style={{
          opacity: enter(frame, 50, 16).opacity,
          transform: `translateY(${enter(frame, 50, 16).translateY}px)`,
          width: "100%",
          maxWidth: 1100,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          marginTop: 8,
          padding: "18px 28px",
          background: "rgba(0,0,0,0.35)",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
        }}
      >
        {/* 横向堆叠条 */}
        <div
          style={{
            width: "100%",
            height: 52,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 26,
            overflow: "hidden",
            display: "flex",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {segments.map((seg, i) => {
            const w = (seg.value / total) * 100 * barProgress[i];
            return (
              <div
                key={i}
                style={{
                  width: `${w}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${seg.color}, ${seg.glow})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16 * fontScale,
                  fontWeight: 700,
                  color: "#1a0c08",
                  borderRight:
                    i < segments.length - 1 ? "2px solid rgba(0,0,0,0.3)" : "none",
                  boxShadow: `inset 0 0 14px ${seg.color}66`,
                  textShadow: "0 1px 0 rgba(255,255,255,0.3)",
                  minWidth: w > 0 ? "1px" : "0",
                  transition: "width 0.1s linear",
                }}
              >
                {w > 8 ? `${seg.value}` : ""}
              </div>
            );
          })}
        </div>

        {/* 图例 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            gap: 12,
            marginTop: 4,
            flexWrap: "wrap",
          }}
        >
          {segments.map((seg, i) => {
            const itemEnter = enter(frame, 60 + i * 8, 14);
            return (
              <div
                key={i}
                style={{
                  opacity: itemEnter.opacity,
                  transform: `translateY(${itemEnter.translateY}px)`,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    background: `linear-gradient(135deg, ${seg.color}, ${seg.glow})`,
                    boxShadow: `0 0 6px ${seg.color}aa`,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      fontSize: 18 * fontScale,
                      fontWeight: 700,
                      color: "#fff",
                      textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                    }}
                  >
                    {seg.name}
                  </div>
                  <div
                    style={{
                      fontSize: 14 * fontScale,
                      color: "#bbb",
                      fontFamily: FONT_NUM,
                      textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                    }}
                  >
                    {seg.value} 亿元 · {seg.pct.toFixed(1)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ================= Stage 7：收尾疑问 =================
const Stage7: React.FC<{
  frame: number;
  fontScale: number;
  accentColor: string;
  textColor: string;
  textStroke: number;
}> = ({ frame, fontScale, accentColor, textColor, textStroke }) => {
  const line1 = enter(frame, 0, 16);
  const line2 = enter(frame, 14, 16);
  const line3 = enter(frame, 28, 16);
  const line4 = enter(frame, 42, 18);

  const pulse = 0.85 + Math.sin(frame * 0.15) * 0.15;

  const strongStroke = textStroke > 0
    ? `0 0 ${textStroke * 6}px rgba(0,0,0,0.85), 0 ${textStroke * 2}px ${textStroke * 6}px rgba(0,0,0,0.7)`
    : "none";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16 * fontScale,
        width: "100%",
      }}
    >
      <div
        style={{
          opacity: line1.opacity,
          transform: `translateY(${line1.translateY}px)`,
          fontSize: 26 * fontScale,
          color: "#ddd",
          letterSpacing: 2,
          textShadow: "0 1px 5px rgba(0,0,0,0.8)",
        }}
      >
        所以
      </div>

      <div
        style={{
          opacity: line2.opacity,
          transform: `translateY(${line2.translateY}px)`,
          fontSize: 32 * fontScale,
          color: textColor,
          fontWeight: 600,
          letterSpacing: 1,
          textShadow: strongStroke,
        }}
      >
        为什么螺蛳粉能从一个
        <span style={{ color: "#ffe0b2", textShadow: strongStroke }}> 地方小吃 </span>
      </div>

      <div
        style={{
          opacity: line3.opacity,
          transform: `translateY(${line3.translateY}px)`,
          fontSize: 32 * fontScale,
          color: textColor,
          fontWeight: 600,
          letterSpacing: 1,
          textShadow: strongStroke,
        }}
      >
        顺利完成
        <span
          style={{
            color: accentColor,
            fontWeight: 800,
            textShadow: `0 0 20px ${accentColor}aa, ${strongStroke}`,
          }}
        >
          {" "}
          产业化{" "}
        </span>
      </div>

      <div
        style={{
          opacity: line4.opacity,
          transform: `translateY(${line4.translateY}px) scale(${pulse})`,
          fontSize: 40 * fontScale,
          color: C.gold,
          fontWeight: 800,
          letterSpacing: 2,
          marginTop: 8,
          textShadow: `0 0 24px ${C.gold}cc, ${strongStroke}`,
        }}
      >
        成 为 国 民 级 品 类 呢 ？
      </div>
    </div>
  );
};
