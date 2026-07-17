import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * 月薪 1 万美元在中国什么水平 —— 中美收入与购买力对比科普
 *
 * 内容分四幕：
 *   1. 开场：标题 + 汇率换算 + 中国收入分布
 *   2. 两种错误对比方式
 *   3. 三类商品/服务的真实购买力
 *   4. 结论：分品类看，不能一刀切
 */

const FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif";

// === 颜色方案 ===
const C = {
  bg: "#0a0e1a",
  bgGradientStart: "#0a0e1a",
  bgGradientEnd: "#101830",
  card: "rgba(255,255,255,0.04)",
  cardBorder: "rgba(255,255,255,0.08)",
  text: "#f5f7fa",
  textSub: "#9aa3b2",
  textDim: "#6b7280",
  accent: "#fbbf24", // 美元 - 橙金
  accent2: "#ef4444", // 中国 - 红
  good: "#22c55e", // 美国占便宜
  neutral: "#3b82f6", // 体感相当
  warn: "#f59e0b",
  china: "#dc2626",
  us: "#3b82f6",
} as const;

/**
 * 在指定 frame 区间内做 0→1 的入场动画（透明度 + 上移）。
 */
function enter(
  frame: number,
  fromFrame: number,
  durationFrames = 18,
): { opacity: number; translateY: number } {
  const p = interpolate(frame, [fromFrame, fromFrame + durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { opacity: p, translateY: (1 - p) * 24 };
}

export const SalaryCompare: React.FC<{
  /** 主题色（强调色，美元/收入） */
  readonly accentColor?: string;
  /** 中国主题色 */
  readonly chinaColor?: string;
  /** 背景色 */
  readonly backgroundColor?: string;
  /** 美元 → 人民币汇率 */
  readonly usdToCny?: number;
  /** 字体大小（基础） */
  readonly fontSize?: number;
  /** 标题 1 */
  readonly title1?: string;
  /** 标题 2 */
  readonly title2?: string;
}> = ({
  accentColor = C.accent,
  chinaColor = C.china,
  backgroundColor = C.bg,
  usdToCny = 7.2,
  fontSize = 1,
  title1 = "月薪 1 万美元",
  title2 = "在中国是什么水平？",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // 全局退出淡出
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames - 5],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // === 阶段 1: 0~3.5s — 开场（汇率换算 + 中国收入分布） ===
  // === 阶段 2: 3.5~7.5s — 两种错误对比方式 ===
  // === 阶段 3: 7.5~15.5s — 三类商品/服务真实购买力 ===
  // === 阶段 4: 15.5~end — 结论 ===

  const s1End = 105; // 3.5s
  const s2End = 225; // 7.5s
  const s3End = 465; // 15.5s

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at top, ${backgroundColor} 0%, #050810 100%)`,
        fontFamily: FONT_FAMILY,
        color: C.text,
        opacity: exitOpacity,
        overflow: "hidden",
      }}
    >
      {/* 背景装饰：微弱的网格 + 渐变光晕 */}
      <BackgroundDecor frame={frame} fps={fps} />

      <AbsoluteFill
        style={{
          padding: 60,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {frame < s1End && <Stage1 frame={frame} fps={fps} fontSize={fontSize} usdToCny={usdToCny} accentColor={accentColor} chinaColor={chinaColor} title1={title1} title2={title2} />}
        {frame >= s1End && frame < s2End && <Stage2 frame={frame - s1End} fontSize={fontSize} accentColor={accentColor} />}
        {frame >= s2End && frame < s3End && <Stage3 frame={frame - s2End} fontSize={fontSize} usdToCny={usdToCny} />}
        {frame >= s3End && <Stage4 frame={frame - s3End} fontSize={fontSize} accentColor={accentColor} />}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ============== 背景装饰 ==============
const BackgroundDecor: React.FC<{ frame: number; fps: number }> = ({
  frame,
}) => {
  return (
    <>
      {/* 飘动的美元符号与人民币符号 */}
      {[...Array(8)].map((_, i) => {
        const seed = i * 137.5;
        const x = ((seed * 13) % 100) + ((frame * 0.05) % 100);
        const y = ((seed * 37) % 100);
        const speed = 0.3 + (i % 3) * 0.1;
        const driftY = (frame * speed) % 100;
        const opacity = 0.04 + (i % 3) * 0.02;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${(y + driftY) % 100}%`,
              fontSize: 80 + (i % 3) * 30,
              color: i % 2 === 0 ? "#fbbf24" : "#dc2626",
              opacity,
              fontWeight: 700,
              pointerEvents: "none",
              userSelect: "none",
              filter: "blur(1px)",
            }}
          >
            {i % 2 === 0 ? "$" : "¥"}
          </div>
        );
      })}
    </>
  );
};

// ============== 阶段 1：开场 ==============
const Stage1: React.FC<{
  frame: number;
  fps: number;
  fontSize: number;
  usdToCny: number;
  accentColor: string;
  chinaColor: string;
  title1: string;
  title2: string;
}> = ({ frame, fps, fontSize, usdToCny, accentColor, chinaColor, title1, title2 }) => {
  const titleEnter = enter(frame, 0, 25);
  const subtitleEnter = enter(frame, 15, 25);

  // 数字滚动
  const usdAmount = 10000;
  const cnyAmount = Math.round(usdAmount * usdToCny);
  const numberAnim = spring({
    frame: frame - 30,
    fps,
    config: { damping: 30, stiffness: 80 },
  });
  const animatedCny = Math.round(cnyAmount * Math.min(1, Math.max(0, numberAnim)));

  // 收入金字塔
  const pyramidEnter = enter(frame, 55, 20);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 36 * fontSize,
        width: "100%",
        alignItems: "center",
      }}
    >
      {/* 标题 */}
      <div
        style={{
          opacity: titleEnter.opacity,
          transform: `translateY(${titleEnter.translateY}px)`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 26 * fontSize,
            color: C.textSub,
            letterSpacing: 8,
            fontWeight: 500,
            marginBottom: 12,
          }}
        >
          跨 国 收 入 与 购 买 力
        </div>
        <div
          style={{
            fontSize: 96 * fontSize,
            fontWeight: 800,
            background: `linear-gradient(135deg, #fff 0%, ${accentColor} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1.1,
            letterSpacing: -1,
          }}
        >
          {title1}
        </div>
        <div
          style={{
            fontSize: 64 * fontSize,
            fontWeight: 700,
            color: C.text,
            marginTop: 8,
            letterSpacing: -1,
          }}
        >
          {title2}
        </div>
      </div>

      {/* 副标题：汇率换算 */}
      <div
        style={{
          opacity: subtitleEnter.opacity,
          transform: `translateY(${subtitleEnter.translateY}px)`,
          display: "flex",
          alignItems: "center",
          gap: 24 * fontSize,
          padding: "16px 32px",
          background: "rgba(251,191,36,0.08)",
          border: "1px solid rgba(251,191,36,0.2)",
          borderRadius: 16,
        }}
      >
        <div style={{ fontSize: 48 * fontSize, fontWeight: 700, color: accentColor }}>
          $10,000
        </div>
        <div style={{ fontSize: 32 * fontSize, color: C.textSub }}>≈</div>
        <div
          style={{
            fontSize: 48 * fontSize,
            fontWeight: 700,
            color: "#fff",
            fontVariantNumeric: "tabular-nums",
            minWidth: 2100,
            textAlign: "right",
          }}
        >
          ¥ {animatedCny.toLocaleString()}
        </div>
        <div
          style={{
            fontSize: 18 * fontSize,
            color: C.textDim,
            paddingLeft: 16,
            borderLeft: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          按 1 USD = {usdToCny} CNY
          <br />
          汇率换算
        </div>
      </div>

      {/* 收入金字塔：3 层 */}
      <div
        style={{
          opacity: pyramidEnter.opacity,
          transform: `translateY(${pyramidEnter.translateY}px)`,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          alignItems: "center",
          marginTop: 16,
        }}
      >
        <div
          style={{
            fontSize: 16 * fontSize,
            color: C.textSub,
            letterSpacing: 4,
            fontWeight: 600,
          }}
        >
          中 国 月 收 入 分 布
        </div>

        <Pyramid
          enterFrame={frame}
          delay={70}
          width={180 * fontSize}
          color="rgba(220,38,38,0.15)"
          borderColor="rgba(220,38,38,0.4)"
          label="¥70,000+"
          sub="前 1% · 一线城市高薪"
          highlight
          highlightColor={chinaColor}
        />
        <Pyramid
          enterFrame={frame}
          delay={80}
          width={360 * fontSize}
          color="rgba(255,255,255,0.04)"
          borderColor="rgba(255,255,255,0.1)"
          label="¥10,000+"
          sub="超过全国 90% 的人"
        />
        <Pyramid
          enterFrame={frame}
          delay={90}
          width={560 * fontSize}
          color="rgba(255,255,255,0.04)"
          borderColor="rgba(255,255,255,0.1)"
          label="¥3,000 ~ 6,000"
          sub="全国绝大多数人月收入"
        />
      </div>
    </div>
  );
};

const Pyramid: React.FC<{
  enterFrame: number;
  delay: number;
  width: number;
  color: string;
  borderColor: string;
  label: string;
  sub: string;
  highlight?: boolean;
  highlightColor?: string;
}> = ({ enterFrame, delay, width, color, borderColor, label, sub, highlight, highlightColor }) => {
  const e = enter(enterFrame, delay, 14);
  return (
    <div
      style={{
        opacity: e.opacity,
        transform: `translateY(${e.translateY}px) scaleX(${0.85 + e.opacity * 0.15})`,
        width,
        padding: "12px 20px",
        background: color,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 10,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        boxShadow: highlight
          ? `0 0 24px ${highlightColor}30, inset 0 0 24px ${highlightColor}10`
          : "none",
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: highlight ? highlightColor : C.text,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, color: C.textSub }}>{sub}</div>
    </div>
  );
};

// ============== 阶段 2：两种错误对比方式 ==============
const Stage2: React.FC<{
  frame: number;
  fontSize: number;
  accentColor: string;
}> = ({ frame, fontSize, accentColor }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 30 * fontSize,
        width: "100%",
      }}
    >
      {/* 标题 */}
      <TitleBlock
        frame={frame}
        title="怎么对比不同国家的物价？"
        subtitle="两种常见的极端错误"
        delay={0}
        fontSize={fontSize}
      />

      <div
        style={{
          display: "flex",
          gap: 28 * fontSize,
          width: "100%",
        }}
      >
        {/* 错误 1：纯汇率换算 */}
        <MistakeCard
          enterFrame={frame}
          delay={20}
          fontSize={fontSize}
          x={true}
          label="❌ 错误 ①"
          title="直接按汇率换算"
          example="$3000 = ¥21,600"
          comment="所以美国好有钱？"
          color="#ef4444"
        />

        {/* 中间：VS */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: enter(frame, 30, 15).opacity,
            fontSize: 40 * fontSize,
            fontWeight: 800,
            color: C.textDim,
          }}
        >
          VS
        </div>

        {/* 错误 2：完全不看汇率 */}
        <MistakeCard
          enterFrame={frame}
          delay={35}
          fontSize={fontSize}
          x={false}
          label="❌ 错误 ②"
          title="'挣美元花美元'"
          example="$1 = ¥1"
          comment="生活差不多？"
          color="#f59e0b"
        />
      </div>

      {/* 底部结论 */}
      <div
        style={{
          opacity: enter(frame, 65, 18).opacity,
          transform: `translateY(${enter(frame, 65, 18).translateY}px)`,
          textAlign: "center",
          fontSize: 28 * fontSize,
          color: C.text,
          fontWeight: 600,
          padding: "20px 32px",
          background: `linear-gradient(90deg, transparent, rgba(251,191,36,0.1), transparent)`,
          borderRadius: 12,
        }}
      >
        这两种<span style={{ color: "#ef4444" }}>都不对</span> · 真正的对比要<span style={{ color: accentColor }}>分品类</span>看
      </div>
    </div>
  );
};

const MistakeCard: React.FC<{
  enterFrame: number;
  delay: number;
  fontSize: number;
  x: boolean;
  label: string;
  title: string;
  example: string;
  comment: string;
  color: string;
}> = ({ enterFrame, delay, fontSize, x, label, title, example, comment, color }) => {
  const e = enter(enterFrame, delay, 20);
  return (
    <div
      style={{
        opacity: e.opacity,
        transform: `translateX(${x ? -(1 - e.opacity) * 40 : (1 - e.opacity) * 40}px)`,
        flex: 1,
        padding: 28 * fontSize,
        background: C.card,
        border: `1.5px solid ${color}40`,
        borderRadius: 16,
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          fontSize: 18 * fontSize,
          color,
          fontWeight: 700,
          letterSpacing: 2,
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 30 * fontSize,
          fontWeight: 700,
          color: C.text,
          marginBottom: 16,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 26 * fontSize,
          color: C.textSub,
          padding: "12px 16px",
          background: "rgba(0,0,0,0.2)",
          borderRadius: 8,
          fontFamily: "monospace",
          marginBottom: 12,
        }}
      >
        {example}
      </div>
      <div style={{ fontSize: 18 * fontSize, color: C.textDim, fontStyle: "italic" }}>
        {comment}
      </div>
    </div>
  );
};

const TitleBlock: React.FC<{
  frame: number;
  title: string;
  subtitle?: string;
  delay: number;
  fontSize: number;
}> = ({ frame, title, subtitle, delay, fontSize }) => {
  const e = enter(frame, delay, 18);
  return (
    <div
      style={{
        opacity: e.opacity,
        transform: `translateY(${e.translateY}px)`,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          fontSize: 18 * fontSize,
          color: C.textSub,
          letterSpacing: 6,
          fontWeight: 500,
        }}
      >
        {subtitle}
      </div>
      <div
        style={{
          fontSize: 56 * fontSize,
          fontWeight: 800,
          color: C.text,
          letterSpacing: -1,
        }}
      >
        {title}
      </div>
    </div>
  );
};

// ============== 阶段 3：三类商品/服务 ==============
const Stage3: React.FC<{
  frame: number;
  fontSize: number;
  usdToCny: number;
}> = ({ frame, fontSize, usdToCny }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24 * fontSize,
        width: "100%",
      }}
    >
      <TitleBlock
        frame={frame}
        title="科学的对比 · 分三类看"
        subtitle="跨 国 物 价 的 三 个 世 界"
        delay={0}
        fontSize={fontSize}
      />

      <div
        style={{
          display: "flex",
          gap: 16 * fontSize,
          width: "100%",
        }}
      >
        <CategoryCard
          frame={frame}
          delay={15}
          fontSize={fontSize}
          num="01"
          tag="可贸易品"
          title="全球化商品"
          emoji="📱"
          color="#22c55e"
          examples={[
            { item: "iPhone", cn: "¥9999", us: "$999" },
            { item: "汽车 / 大牌服饰", cn: "国内 ¥30万", us: "美国 $4万" },
            { item: "进口食品", cn: "差不多", us: "差不多" },
          ]}
          conclusion="1 USD ≈ 6-7 RMB"
          verdict="美国更划算"
          usdToCny={usdToCny}
          verdictColor="#22c55e"
        />

        <CategoryCard
          frame={frame}
          delay={30}
          fontSize={fontSize}
          num="02"
          tag="不可贸易品"
          title="本地服务"
          emoji="💇"
          color="#3b82f6"
          examples={[
            { item: "理发", cn: "¥30-80", us: "$30-80" },
            { item: "美甲 / 洗车", cn: "几十元", us: "几十美元" },
            { item: "外卖 / 保洁", cn: "几十元", us: "几十美元" },
          ]}
          conclusion="1 USD ≈ 1 RMB"
          verdict="体感相当"
          usdToCny={usdToCny}
          verdictColor="#3b82f6"
        />

        <CategoryCard
          frame={frame}
          delay={45}
          fontSize={fontSize}
          num="03"
          tag="混合品类"
          title="食 / 住 / 行"
          emoji="🍔"
          color="#f59e0b"
          examples={[
            { item: "基础食品 / 肉类", cn: "较贵", us: "更便宜" },
            { item: "快餐 / 普通餐厅", cn: "便宜", us: "占收入比相当" },
            { item: "房租", cn: "一线很贵", us: "占收入比往往更高" },
          ]}
          conclusion="看具体品类"
          verdict="不能一刀切"
          usdToCny={usdToCny}
          verdictColor="#f59e0b"
        />
      </div>

      {/* 底部条带：购买力标尺 */}
      <PowerScale frame={frame} delay={80} fontSize={fontSize} />
    </div>
  );
};

const CategoryCard: React.FC<{
  frame: number;
  delay: number;
  fontSize: number;
  num: string;
  tag: string;
  title: string;
  emoji: string;
  color: string;
  examples: { item: string; cn: string; us: string }[];
  conclusion: string;
  verdict: string;
  usdToCny: number;
  verdictColor: string;
}> = ({
  frame,
  delay,
  fontSize,
  num,
  tag,
  title,
  emoji,
  color,
  examples,
  conclusion,
  verdict,
  verdictColor,
}) => {
  const e = enter(frame, delay, 22);
  return (
    <div
      style={{
        opacity: e.opacity,
        transform: `translateY(${e.translateY}px)`,
        flex: 1,
        padding: 24 * fontSize,
        background: C.card,
        border: `1.5px solid ${color}30`,
        borderRadius: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        backdropFilter: "blur(8px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 顶部色条 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${color}, ${color}40)`,
        }}
      />

      {/* 编号 + emoji */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: 14 * fontSize,
            color: color,
            fontWeight: 700,
            letterSpacing: 3,
            fontFamily: "monospace",
          }}
        >
          {num}
        </div>
        <div style={{ fontSize: 32 * fontSize }}>{emoji}</div>
      </div>

      {/* 标题 */}
      <div>
        <div
          style={{
            fontSize: 12 * fontSize,
            color: C.textDim,
            letterSpacing: 2,
            marginBottom: 4,
          }}
        >
          {tag}
        </div>
        <div
          style={{
            fontSize: 26 * fontSize,
            fontWeight: 800,
            color: C.text,
          }}
        >
          {title}
        </div>
      </div>

      {/* 对比列表 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: "12px 0",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {examples.map((ex, i) => {
          const itemEnter = enter(frame, delay + 15 + i * 5, 10);
          return (
            <div
              key={i}
              style={{
                opacity: itemEnter.opacity,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 14 * fontSize,
                gap: 8,
              }}
            >
              <span style={{ color: C.textSub, flexShrink: 0 }}>{ex.item}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: "#ef4444", fontFamily: "monospace" }}>{ex.cn}</span>
                <span style={{ color: C.textDim }}>·</span>
                <span style={{ color: "#3b82f6", fontFamily: "monospace" }}>{ex.us}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 结论 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            fontSize: 16 * fontSize,
            color: C.textSub,
            fontFamily: "monospace",
          }}
        >
          {conclusion}
        </div>
        <div
          style={{
            fontSize: 18 * fontSize,
            fontWeight: 700,
            color: verdictColor,
          }}
        >
          → {verdict}
        </div>
      </div>
    </div>
  );
};

// 购买力标尺
const PowerScale: React.FC<{
  frame: number;
  delay: number;
  fontSize: number;
}> = ({ frame, delay, fontSize }) => {
  const e = enter(frame, delay, 25);
  // 标尺从左到右：1 USD = 7 RMB (强) → 1 USD = 1 RMB (弱)
  const markerX = Math.min(1, Math.max(0, (frame - delay - 10) / 60));
  return (
    <div
      style={{
        opacity: e.opacity,
        transform: `translateY(${e.translateY}px)`,
        padding: "16px 24px",
        background: C.card,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 14,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13 * fontSize,
          color: C.textSub,
          letterSpacing: 1,
        }}
      >
        <span>📱 手机/汽车/进口货</span>
        <span>💇 理发/外卖/人工</span>
      </div>
      <div
        style={{
          position: "relative",
          height: 8,
          width: "100%",
          background: `linear-gradient(90deg, #22c55e 0%, #3b82f6 100%)`,
          borderRadius: 4,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -4,
            left: `${markerX * 100}%`,
            width: 4,
            height: 16,
            background: "#fff",
            borderRadius: 2,
            boxShadow: "0 0 8px rgba(255,255,255,0.8)",
            transform: "translateX(-50%)",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13 * fontSize,
          color: C.textDim,
          fontFamily: "monospace",
        }}
      >
        <span>1 USD ≈ 6-7 RMB</span>
        <span>1 USD ≈ 1 RMB</span>
      </div>
    </div>
  );
};

// ============== 阶段 4：结论 ==============
const Stage4: React.FC<{
  frame: number;
  fontSize: number;
  accentColor: string;
}> = ({ frame, fontSize, accentColor }) => {
  const titleEnter = enter(frame, 0, 22);

  // 三条结论逐条出现
  const lines = [
    { icon: "🇺🇸", text: "月薪 1 万美元 = 中国顶级高薪（前 1%）", color: "#22c55e" },
    { icon: "📱", text: "全球化商品：1 USD ＞ 6 RMB（美国占便宜）", color: "#22c55e" },
    { icon: "💇", text: "本地服务：1 USD ≈ 1 RMB（体感相当）", color: "#3b82f6" },
    { icon: "🧠", text: "不能简单划等号 —— 全球化看汇率，服务看体感", color: accentColor },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 32 * fontSize,
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
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
            fontSize: 18 * fontSize,
            color: C.textSub,
            letterSpacing: 6,
            fontWeight: 500,
            marginBottom: 8,
          }}
        >
          CONCLUS ION
        </div>
        <div
          style={{
            fontSize: 64 * fontSize,
            fontWeight: 800,
            background: `linear-gradient(135deg, #fff 0%, ${accentColor} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: -1,
          }}
        >
          一句话总结
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          width: "100%",
          maxWidth: 1400,
        }}
      >
        {lines.map((line, i) => {
          const e = enter(frame, 20 + i * 12, 18);
          return (
            <div
              key={i}
              style={{
                opacity: e.opacity,
                transform: `translateX(${(1 - e.opacity) * -30}px)`,
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "16px 24px",
                background: `${line.color}10`,
                border: `1.5px solid ${line.color}40`,
                borderRadius: 14,
              }}
            >
              <div style={{ fontSize: 36 * fontSize }}>{line.icon}</div>
              <div
                style={{
                  fontSize: 26 * fontSize,
                  color: C.text,
                  fontWeight: 600,
                }}
              >
                {line.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
