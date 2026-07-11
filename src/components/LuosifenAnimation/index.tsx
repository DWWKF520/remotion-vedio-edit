import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * 螺蛳粉动画
 *
 * 复刻用户给出的 demo：
 *   - 北方风格背景 + 顶部 logo/标题
 *   - 居中的螺蛳粉碗
 *   - 两条 spring 动画的滑动条（辣度 / 臭味）
 *   - 一个会"自动取消勾选"的复选框（螺蛳）
 *   - 4 个产品依次淡入 + 放大的展示
 *
 * 关键修正（相对用户给的原代码）：
 *   - 不用 useState/useEffect 触发"取消勾选"，改为纯帧驱动（避免时间漂移）
 *   - 产品入场用 interpolate + easing 代替 CSS transition
 *   - 滑动条 handle 居中对齐到 position（用 translateX(-50%)）
 *   - 文本用纯 HTML 而不是 Remotion <Text>
 *   - 全部文案/图片/颜色/动画参数都做成可配 prop
 */

const FONT =
  "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif";

export const LuosifenAnimation: React.FC<{
  // ====== 文案 ======
  readonly titleText?: string;
  readonly spicinessLabel?: string;
  readonly spicinessIcon?: string;
  readonly smellLabel?: string;
  readonly smellIcon?: string;
  readonly checkboxLabel?: string;
  readonly product1Name?: string;
  readonly product2Name?: string;
  readonly product3Name?: string;
  readonly product4Name?: string;

  // ====== 图片（默认 public/luosifen/） ======
  readonly backgroundImage?: string;
  readonly bowlImage?: string;
  readonly product1Image?: string;
  readonly product2Image?: string;
  readonly product3Image?: string;
  readonly product4Image?: string;

  // ====== 动画时序（帧） ======
  readonly spicinessStartFrame?: number;
  readonly smellStartFrame?: number;
  readonly checkboxUncheckFrame?: number;
  readonly product1Delay?: number;
  readonly product2Delay?: number;
  readonly product3Delay?: number;
  readonly product4Delay?: number;

  // ====== spring 配置 ======
  readonly springDamping?: number;
  readonly springStiffness?: number;

  // ====== 样式 ======
  readonly backgroundColor?: string;
  readonly titleColor?: string;
  readonly textColor?: string;
  readonly sliderTrackColor?: string;
  readonly sliderHandleColor?: string;
  readonly sliderHandleBorderColor?: string;
  readonly checkboxColor?: string;

  // ====== 布局 ======
  readonly bowlTop?: number;
  readonly bowlSize?: number;
  readonly sliderLeft?: number;
  readonly sliderTrackWidth?: number;
  readonly productTop?: number;
  readonly productSize?: number;
}> = ({
  titleText = "知危",
  spicinessLabel = "辣度",
  spicinessIcon = "🌶️",
  smellLabel = "臭味",
  smellIcon = "🧄",
  checkboxLabel = "螺蛳",
  product1Name = "干捞螺蛳粉",
  product2Name = "骨汤螺蛳粉",
  product3Name = "鹿茸菌螺蛳粉",
  product4Name = "麻酱螺蛳粉",

  backgroundImage = staticFile("luosifen/北方背景.png"),
  bowlImage = staticFile("luosifen/螺蛳粉碗.png"),
  product1Image = staticFile("luosifen/干捞螺蛳粉.png"),
  product2Image = staticFile("luosifen/骨汤螺蛳粉.png"),
  product3Image = staticFile("luosifen/鹿茸菌螺蛳粉.png"),
  product4Image = staticFile("luosifen/麻酱螺蛳粉.png"),

  spicinessStartFrame = 30,
  smellStartFrame = 60,
  checkboxUncheckFrame = 120,
  product1Delay = 150,
  product2Delay = 180,
  product3Delay = 210,
  product4Delay = 240,

  springDamping = 200,
  springStiffness = 200,

  backgroundColor = "#000000",
  titleColor = "#ffffff",
  textColor = "#ffffff",
  sliderTrackColor = "rgba(255,255,255,0.4)",
  sliderHandleColor = "#ffffff",
  sliderHandleBorderColor = "#333333",
  checkboxColor = "#e53935",

  bowlTop = 80,
  bowlSize = 280,
  sliderLeft = 100,
  sliderTrackWidth = 260,
  productTop = 640,
  productSize = 160,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 滑动条 spring 动画
  const spicinessPosition = spring({
    frame: frame - spicinessStartFrame,
    fps,
    config: { damping: springDamping, stiffness: springStiffness },
    from: 0,
    to: 100,
  });

  const smellPosition = spring({
    frame: frame - smellStartFrame,
    fps,
    config: { damping: springDamping, stiffness: springStiffness },
    from: 0,
    to: 100,
  });

  // 复选框在子组件里自己根据 useCurrentFrame 判定

  return (
    <AbsoluteFill style={{ backgroundColor, fontFamily: FONT }}>
      {/* 背景图 + 标题（Remotion 不允许 background-image，改用 <Img>） */}
      <Img
        src={backgroundImage}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 24,
          color: titleColor,
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: 2,
          textShadow: "0 2px 8px rgba(0,0,0,0.6)",
        }}
      >
        {titleText}
      </div>

      {/* 螺蛳粉碗 */}
      <Img
        src={bowlImage}
        style={{
          position: "absolute",
          top: bowlTop,
          left: "50%",
          transform: "translateX(-50%)",
          width: bowlSize,
          height: bowlSize,
          objectFit: "contain",
          filter: "drop-shadow(0 12px 30px rgba(0,0,0,0.5))",
        }}
      />

      {/* 辣度滑动条 */}
      <Slider
        label={spicinessLabel}
        icon={spicinessIcon}
        position={spicinessPosition}
        trackColor={sliderTrackColor}
        handleColor={sliderHandleColor}
        handleBorderColor={sliderHandleBorderColor}
        textColor={textColor}
        trackWidth={sliderTrackWidth}
        style={{ position: "absolute", top: 380, left: sliderLeft }}
      />

      {/* 臭味滑动条 */}
      <Slider
        label={smellLabel}
        icon={smellIcon}
        position={smellPosition}
        trackColor={sliderTrackColor}
        handleColor={sliderHandleColor}
        handleBorderColor={sliderHandleBorderColor}
        textColor={textColor}
        trackWidth={sliderTrackWidth}
        style={{ position: "absolute", top: 460, left: sliderLeft }}
      />

      {/* 复选框 */}
      <Checkbox
        label={checkboxLabel}
        uncheckFrame={checkboxUncheckFrame}
        color={checkboxColor}
        textColor={textColor}
        style={{ position: "absolute", top: 540, left: sliderLeft }}
      />

      {/* 产品展示 */}
      <ProductShowcase
        frame={frame}
        products={[
          { name: product1Name, image: product1Image, delay: product1Delay },
          { name: product2Name, image: product2Image, delay: product2Delay },
          { name: product3Name, image: product3Image, delay: product3Delay },
          { name: product4Name, image: product4Image, delay: product4Delay },
        ]}
        textColor={textColor}
        productSize={productSize}
        style={{ position: "absolute", top: productTop, left: 0, right: 0 }}
      />
    </AbsoluteFill>
  );
};

// ====== 滑动条 ======
const Slider: React.FC<{
  label: string;
  icon: string;
  position: number;
  trackColor: string;
  handleColor: string;
  handleBorderColor: string;
  textColor: string;
  trackWidth: number;
  style: React.CSSProperties;
}> = ({
  label,
  icon,
  position,
  trackColor,
  handleColor,
  handleBorderColor,
  textColor,
  trackWidth,
  style,
}) => {
  return (
    <div style={style}>
      <div
        style={{
          marginBottom: 10,
          color: textColor,
          fontSize: 20,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 8,
          textShadow: "0 2px 6px rgba(0,0,0,0.6)",
        }}
      >
        <span style={{ fontSize: 24 }}>{icon}</span>
        <span>{label}</span>
      </div>
      <div
        style={{
          width: trackWidth,
          height: 6,
          backgroundColor: trackColor,
          position: "relative",
          borderRadius: 3,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${position}%`,
            top: -9,
            transform: "translateX(-50%)",
            width: 22,
            height: 22,
            backgroundColor: handleColor,
            borderRadius: 11,
            border: `2px solid ${handleBorderColor}`,
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          }}
        />
      </div>
    </div>
  );
};

// ====== 复选框（自己取 useCurrentFrame 以满足纯帧驱动）======
const Checkbox: React.FC<{
  label: string;
  uncheckFrame: number;
  color: string;
  textColor: string;
  style: React.CSSProperties;
}> = ({ label, uncheckFrame, color, textColor, style }) => {
  const frame = useCurrentFrame();
  const checked = frame <= uncheckFrame;
  return (
    <div
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          backgroundColor: checked ? color : "rgba(255,255,255,0.1)",
          border: `2px solid ${color}`,
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 20,
          fontWeight: 800,
        }}
      >
        {checked ? "✓" : ""}
      </div>
      <span
        style={{
          color: textColor,
          fontSize: 20,
          fontWeight: 600,
          textShadow: "0 2px 6px rgba(0,0,0,0.6)",
        }}
      >
        {label}
      </span>
    </div>
  );
};

// ====== 产品展示 ======
const ProductShowcase: React.FC<{
  frame: number;
  products: Array<{ name: string; image: string; delay: number }>;
  textColor: string;
  productSize: number;
  style: React.CSSProperties;
}> = ({ frame, products, textColor, productSize, style }) => {
  return (
    <div
      style={{
        ...style,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        gap: 40,
      }}
    >
      {products.map((product) => {
        const opacity = interpolate(
          frame,
          [product.delay, product.delay + 18],
          [0, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          },
        );
        const scale = interpolate(
          frame,
          [product.delay, product.delay + 18],
          [0.8, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          },
        );
        return (
          <div
            key={product.name}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              opacity,
              transform: `scale(${scale})`,
            }}
          >
            <Img
              src={product.image}
              style={{
                width: productSize,
                height: productSize,
                objectFit: "cover",
                borderRadius: 12,
                boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
                backgroundColor: "#222",
              }}
            />
            <span
              style={{
                color: textColor,
                fontSize: 16,
                fontWeight: 600,
                textShadow: "0 2px 6px rgba(0,0,0,0.7)",
                whiteSpace: "nowrap",
              }}
            >
              {product.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};
