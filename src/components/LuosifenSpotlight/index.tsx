import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * 螺蛳粉短视频复刻
 *
 * 复刻 `public/luosifen/7月9日(3).mp4` 的视觉与节奏：
 *  - 黑色底 + "知危." logo + 旋转的"知危"水印
 *  - 白色圆角卡片：螺蛳粉碗 + 辣度/臭味滑动条 + 螺蛳复选框
 *  - 红色卡通手光标依次拖动滑动条 / 取消勾选
 *  - 字幕条（白底黑字）实时切换
 *  - 底部红+白标题
 *  - 阶段2："产品创新" + 单碗聚光
 *  - 阶段3：4 个产品并排依次淡入
 *
 * 总时长 19.4s @ 30fps = 582 帧（默认 582 帧）
 */

const FONT =
  "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif";

export const LuosifenSpotlight: React.FC<{
  // 文案
  readonly headlineTop?: string;
  readonly headlineBottom?: string;
  readonly headlineAccent?: string;
  readonly captions?: string;
  readonly brandText?: string;

  // 阶段时间（帧，30fps）
  readonly spicinessDragStart?: number;
  readonly spicinessDragEnd?: number;
  readonly smellDragStart?: number;
  readonly smellDragEnd?: number;
  readonly uncheckStart?: number;
  readonly uncheckEnd?: number;
  readonly transitionStart?: number;
  readonly productRowStart?: number;
  readonly productStagger?: number;

  // 图片
  readonly bowlImage?: string;
  readonly productImages?: string;
  readonly productNames?: string;

  // 样式
  readonly backgroundColor?: string;
  readonly cardColor?: string;
  readonly textColor?: string;
  readonly accentColor?: string;
  readonly checkboxColor?: string;
  readonly sliderTrackColor?: string;
  readonly sliderHandleColor?: string;
  readonly sliderHandleBorderColor?: string;
  readonly captionBarColor?: string;
  readonly watermarkColor?: string;
  readonly fontFamily?: string;
}> = ({
  headlineTop = "螺蛳粉门店量追上雪王",
  headlineBottom = "这个臭臭的小吃为啥",
  headlineAccent = "这么强?",
  captions =
    "比如在北方城市,很多品牌都降低了辣度,有的品牌汤底里面,干脆就没有放'螺蛳',也衍生出干捞螺蛳粉,鹿茸菌螺蛳粉,改良成了'融合菜'",
  brandText = "知危",

  spicinessDragStart = 30,
  spicinessDragEnd = 120,
  smellDragStart = 180,
  smellDragEnd = 240,
  uncheckStart = 270,
  uncheckEnd = 330,
  transitionStart = 330,
  productRowStart = 420,
  productStagger = 25,

  bowlImage = staticFile("luosifen/螺蛳粉碗.png"),
  productImages,
  productNames,

  backgroundColor = "#000000",
  cardColor = "#ffffff",
  textColor = "#1a1a1a",
  accentColor = "#e53935",
  checkboxColor = "#e53935",
  sliderTrackColor = "#d6d6d6",
  sliderHandleColor = "#ffffff",
  sliderHandleBorderColor = "#3a3a3a",
  captionBarColor = "#ffffff",
  watermarkColor = "rgba(255,255,255,0.12)",
  fontFamily = FONT,
}) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  // ===== 解析 captions =====
  const captionList = captions
    .split(/[,,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  // 每个字幕占多少帧（均匀分布到 0..transitionStart+90 段，再追加两个）
  // 简化：把 caption 列表按顺序映射到 [0, transitionStart] 与 [productRowStart, end)
  const phase1Count = Math.min(4, captionList.length); // 前 4 条给前段
  const phase2Count = Math.min(3, Math.max(0, captionList.length - 4)); // 后 3 条给后段
  const phase1Span = transitionStart;
  const phase2Span = Math.max(1, 582 - productRowStart);

  function pickCaption(): { text: string; key: number } {
    if (captionList.length === 0) return { text: "", key: 0 };
    if (frame < transitionStart) {
      const i = Math.min(
        phase1Count - 1,
        Math.floor((frame / phase1Span) * phase1Count),
      );
      return { text: captionList[i] ?? "", key: i };
    }
    const i = Math.min(
      phase2Count - 1,
      Math.floor(((frame - productRowStart) / phase2Span) * phase2Count),
    );
    return { text: captionList[phase1Count + i] ?? "", key: phase1Count + i };
  }
  const { text: currentCaption, key: captionKey } = pickCaption();

  // ===== 滑动条值 =====
  const spiciness = interpolate(
    frame,
    [spicinessDragStart, spicinessDragEnd],
    [0, 100],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );
  const smell = interpolate(
    frame,
    [smellDragStart, smellDragEnd],
    [0, 100],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );
  const checked = frame < uncheckEnd;

  // ===== 阶段判断 =====
  const showCard = frame < transitionStart + 5;
  const showTransition = frame >= transitionStart && frame < productRowStart;
  const showProductRow = frame >= productRowStart;

  // 卡片淡出
  const cardOpacity = interpolate(
    frame,
    [transitionStart - 10, transitionStart + 10],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  // 产品创新淡入
  const transitionOpacity = interpolate(
    frame,
    [transitionStart, transitionStart + 12],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  // 产品创新淡出
  const transitionFadeOut = interpolate(
    frame,
    [productRowStart - 10, productRowStart + 10],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // ===== 产品并排 =====
  const productList: Array<{ image: string; name: string }> = (() => {
    const imgs = (productImages ?? "干捞螺蛳粉,骨汤螺蛳粉,鹿茸菌螺蛳粉,麻酱螺蛳粉")
      .split(/[,,]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => staticFile(`luosifen/${name}.png`));
    const nms = (productNames ?? "干捞螺蛳粉,骨汤螺蛳粉,鹿茸菌螺蛳粉,麻酱螺蛳粉")
      .split(/[,,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return imgs.map((img, i) => ({ image: img, name: nms[i] ?? "" }));
  })();

  // 4 个产品依次淡入 + 轻微缩放
  const productAp = productList.map((_, i) => {
    const start = productRowStart + i * productStagger;
    return interpolate(
      frame,
      [start, start + 20],
      [0, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      },
    );
  });

  // ===== 手光标位置（仅在卡片阶段显示） =====
  // 卡片在画布中的参数（与下方 JSX 保持一致）
  const cardW = Math.min(width * 0.86, 820);
  const cardX = (width - cardW) / 2;
  const cardY = 160;
  const cardH = 660;

  const sliderLeft = cardX + 200; // 标签/图标 + 缩进后 slider 起点
  const sliderTrackWidth = cardW - 240;
  const spicyY = cardY + 380;
  const smellY = cardY + 460;
  const checkX = cardX + 70; // 复选框水平位置
  const checkY = cardY + 540;

  // 决定手应该出现在哪里（按阶段切）
  type HandPos = { x: number; y: number; visible: boolean; phase: string };
  const hand: HandPos = (() => {
    if (frame < spicinessDragStart) {
      // 还没开始拖：停在辣度滑动条左侧
      return {
        x: sliderLeft + (spiciness / 100) * sliderTrackWidth,
        y: spicyY,
        visible: true,
        phase: "spiciness",
      };
    }
    if (frame < spicinessDragEnd) {
      return {
        x: sliderLeft + (spiciness / 100) * sliderTrackWidth,
        y: spicyY,
        visible: true,
        phase: "spiciness",
      };
    }
    if (frame < smellDragStart) {
      // 短暂停留 / 隐藏
      return {
        x: sliderLeft + (smell / 100) * sliderTrackWidth,
        y: smellY,
        visible: true,
        phase: "smell",
      };
    }
    if (frame < smellDragEnd) {
      return {
        x: sliderLeft + (smell / 100) * sliderTrackWidth,
        y: smellY,
        visible: true,
        phase: "smell",
      };
    }
    if (frame < uncheckStart) {
      return { x: checkX + 14, y: checkY + 14, visible: true, phase: "checkbox" };
    }
    if (frame < uncheckEnd) {
      // 复选框取消动画期间手按住
      return { x: checkX + 14, y: checkY + 14, visible: true, phase: "checkbox" };
    }
    return { x: 0, y: 0, visible: false, phase: "none" };
  })();

  // 手点击复选框的"按下"缩放
  const handScale =
    hand.phase === "checkbox" ? interpolate(frame, [uncheckStart, uncheckStart + 4, uncheckEnd], [1, 0.85, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;

  // 复选框打勾在 uncheckStart 时立即消失
  const checkOpacity = frame < uncheckStart ? 1 : interpolate(frame, [uncheckStart, uncheckStart + 3], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ===== 布局比例 =====
  const cardPadding = 28;
  const innerW = cardW - cardPadding * 2;
  const isMobile = width <= 720;

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        fontFamily,
        overflow: "hidden",
      }}
    >
      {/* 背景纹理：极轻的暗色噪点 + 红色光晕 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(229,57,53,0.08), transparent 50%), radial-gradient(circle at 80% 80%, rgba(229,57,53,0.06), transparent 50%)",
          pointerEvents: "none",
        }}
      />

      {/* 顶部 logo：知危. */}
      <div
        style={{
          position: "absolute",
          top: 32,
          left: 32,
          color: "#ffffff",
          fontSize: 36,
          fontWeight: 800,
          letterSpacing: 1,
          display: "flex",
          alignItems: "flex-end",
          gap: 2,
          textShadow: "0 2px 6px rgba(0,0,0,0.6)",
        }}
      >
        <span>{brandText}</span>
        <span style={{ color: accentColor, fontSize: 48, lineHeight: 1 }}>
          .
        </span>
      </div>

      {/* 旋转水印：右上 */}
      <div
        style={{
          position: "absolute",
          top: 60,
          right: -20,
          color: watermarkColor,
          fontSize: 120,
          fontWeight: 900,
          letterSpacing: 4,
          transform: "rotate(20deg)",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {brandText}
      </div>

      {/* 旋转水印：右下 */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          right: -30,
          color: watermarkColor,
          fontSize: 140,
          fontWeight: 900,
          letterSpacing: 4,
          transform: "rotate(-15deg)",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {brandText}
      </div>

      {/* 卡片阶段 */}
      {showCard && (
        <div
          style={{
            position: "absolute",
            top: cardY,
            left: cardX,
            width: cardW,
            height: cardH,
            backgroundColor: cardColor,
            borderRadius: 24,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            padding: cardPadding,
            opacity: cardOpacity,
          }}
        >
          {/* 碗 */}
          <div
            style={{
              position: "absolute",
              top: 40,
              left: "50%",
              transform: "translateX(-50%)",
              width: innerW * 0.78,
              height: innerW * 0.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Img
              src={bowlImage}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.25))",
              }}
            />
          </div>

          {/* 滑动条 + 复选框容器 */}
          <div
            style={{
              position: "absolute",
              top: innerW * 0.5 + 70,
              left: cardPadding,
              right: cardPadding,
              border: "2px solid #e0e0e0",
              borderRadius: 16,
              padding: "20px 18px",
            }}
          >
            <Slider
              icon="🌶️"
              label="辣度"
              position={spiciness}
              iconStyle={{ color: "#e53935" }}
              trackColor={sliderTrackColor}
              handleColor={sliderHandleColor}
              handleBorderColor={sliderHandleBorderColor}
            />
            <div style={{ height: 20 }} />
            <Slider
              icon="🧄"
              label="臭味"
              position={smell}
              iconStyle={{ color: "#caa84a" }}
              trackColor={sliderTrackColor}
              handleColor={sliderHandleColor}
              handleBorderColor={sliderHandleBorderColor}
            />
            <div style={{ height: 20 }} />
            <Checkbox
              icon="🐌"
              label="螺蛳"
              checked={checked && checkOpacity > 0.05}
              color={checkboxColor}
            />
          </div>
        </div>
      )}

      {/* 阶段2：产品创新 + 单碗聚光 */}
      {showTransition && (
        <div
          style={{
            position: "absolute",
            top: cardY,
            left: cardX,
            width: cardW,
            height: cardH,
            backgroundColor: cardColor,
            borderRadius: 24,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            overflow: "hidden",
            opacity: transitionOpacity * transitionFadeOut,
          }}
        >
          {/* 棋盘格背景 */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(45deg, #e8e8e8 25%, transparent 25%), linear-gradient(-45deg, #e8e8e8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e8e8e8 75%), linear-gradient(-45deg, transparent 75%, #e8e8e8 75%)",
              backgroundSize: "60px 60px",
              backgroundPosition: "0 0, 0 30px, 30px -30px, -30px 0px",
              opacity: 0.7,
            }}
          />
          {/* "产品创新"大字 */}
          <div
            style={{
              position: "absolute",
              top: 90,
              left: 0,
              right: 0,
              textAlign: "center",
              fontSize: 84,
              fontWeight: 900,
              color: "#e53935",
              letterSpacing: 6,
              textShadow: "2px 2px 0 #000",
            }}
          >
            产品创新
          </div>
          {/* 单碗 + 聚光 */}
          <div
            style={{
              position: "absolute",
              top: 220,
              left: 0,
              right: 0,
              height: 360,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: 360,
                height: 360,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.6) 30%, rgba(255,255,255,0) 70%)",
                filter: "blur(8px)",
              }}
            />
            <Img
              src={bowlImage}
              style={{
                position: "relative",
                width: 320,
                height: 200,
                objectFit: "contain",
                filter: "drop-shadow(0 16px 30px rgba(0,0,0,0.4))",
              }}
            />
          </div>
        </div>
      )}

      {/* 阶段3：4 个产品并排 */}
      {showProductRow && (
        <div
          style={{
            position: "absolute",
            top: cardY + 20,
            left: cardX,
            width: cardW,
            height: cardH - 40,
            backgroundColor: cardColor,
            borderRadius: 24,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            padding: cardPadding,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows: "1fr 1fr",
              gap: 16,
              width: "100%",
              height: "100%",
            }}
          >
            {productList.map((p, i) => (
              <div
                key={p.name + i}
                style={{
                  position: "relative",
                  borderRadius: 16,
                  backgroundColor: "#f5f5f5",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: productAp[i],
                  transform: `scale(${0.85 + 0.15 * productAp[i]})`,
                }}
              >
                <Img
                  src={p.image}
                  style={{
                    width: "85%",
                    height: "85%",
                    objectFit: "contain",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 8,
                    left: 8,
                    right: 8,
                    textAlign: "center",
                    fontSize: 18,
                    fontWeight: 800,
                    color: textColor,
                    backgroundColor: "rgba(255,255,255,0.85)",
                    borderRadius: 8,
                    padding: "4px 6px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 字幕条 */}
      <div
        key={captionKey}
        style={{
          position: "absolute",
          top: cardY + cardH + 24,
          left: cardX,
          width: cardW,
          backgroundColor: captionBarColor,
          borderRadius: 8,
          padding: "16px 24px",
          textAlign: "center",
          fontSize: 30,
          fontWeight: 700,
          color: textColor,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}
      >
        {currentCaption}
      </div>

      {/* 底部标题：两行 */}
      <div
        style={{
          position: "absolute",
          left: 32,
          right: 32,
          bottom: 56,
          fontSize: isMobile ? 32 : 40,
          fontWeight: 900,
          lineHeight: 1.25,
          letterSpacing: 1,
          textShadow: "0 2px 8px rgba(0,0,0,0.7)",
        }}
      >
        <div style={{ color: accentColor }}>{headlineTop}</div>
        <div style={{ color: "#ffffff" }}>
          {headlineBottom}
          <span style={{ color: accentColor }}>{headlineAccent}</span>
        </div>
      </div>

      {/* 红色卡通手光标（仅卡片阶段显示） */}
      {hand.visible && showCard && (
        <div
          style={{
            position: "absolute",
            top: hand.y - 36,
            left: hand.x - 36,
            width: 72,
            height: 72,
            transform: `scale(${handScale})`,
            transformOrigin: "center",
            pointerEvents: "none",
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
          }}
        >
          <HandIcon />
        </div>
      )}
    </AbsoluteFill>
  );
};

// ===== 滑动条 =====
const Slider: React.FC<{
  icon: string;
  label: string;
  position: number;
  iconStyle: React.CSSProperties;
  trackColor: string;
  handleColor: string;
  handleBorderColor: string;
}> = ({ icon, label, position, iconStyle, trackColor, handleColor, handleBorderColor }) => {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div
        style={{
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          ...iconStyle,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, width: 64 }}>{label}</div>
      <div
        style={{
          flex: 1,
          height: 8,
          backgroundColor: trackColor,
          position: "relative",
          borderRadius: 4,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${position}%`,
            top: -10,
            transform: "translateX(-50%)",
            width: 28,
            height: 28,
            backgroundColor: handleColor,
            borderRadius: 14,
            border: `3px solid ${handleBorderColor}`,
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          }}
        />
      </div>
    </div>
  );
};

// ===== 复选框 =====
const Checkbox: React.FC<{
  icon: string;
  label: string;
  checked: boolean;
  color: string;
}> = ({ icon, label, checked, color }) => {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div
        style={{
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, width: 64 }}>{label}</div>
      <div
        style={{
          width: 32,
          height: 32,
          backgroundColor: checked ? color : "transparent",
          border: `3px solid ${color}`,
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 22,
          fontWeight: 800,
        }}
      >
        {checked ? "✓" : ""}
      </div>
    </div>
  );
};

// ===== 红色卡通手光标 SVG =====
const HandIcon: React.FC = () => {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%">
      {/* 手指（指向上方，点击目标在下方） */}
      <g>
        {/* 食指 */}
        <rect
          x="22"
          y="6"
          width="10"
          height="22"
          rx="4"
          fill="#e53935"
          stroke="#000"
          strokeWidth="1.5"
        />
        {/* 中指 */}
        <rect
          x="34"
          y="12"
          width="9"
          height="18"
          rx="4"
          fill="#e53935"
          stroke="#000"
          strokeWidth="1.5"
        />
        {/* 无名指 */}
        <rect
          x="44"
          y="20"
          width="8"
          height="14"
          rx="4"
          fill="#e53935"
          stroke="#000"
          strokeWidth="1.5"
        />
        {/* 手掌 */}
        <path
          d="M 18 28 Q 14 32 14 40 L 14 52 Q 14 60 24 60 L 44 60 Q 56 60 56 50 L 56 32 Q 56 24 50 24 L 44 24 L 44 34 L 32 34 L 32 22 L 24 22 L 24 32 L 18 32 Z"
          fill="#e53935"
          stroke="#000"
          strokeWidth="1.5"
        />
        {/* 拇指 */}
        <ellipse
          cx="11"
          cy="42"
          rx="6"
          ry="9"
          fill="#e53935"
          stroke="#000"
          strokeWidth="1.5"
        />
        {/* 高光 */}
        <rect
          x="25"
          y="8"
          width="3"
          height="14"
          rx="1.5"
          fill="rgba(255,255,255,0.5)"
        />
      </g>
    </svg>
  );
};
