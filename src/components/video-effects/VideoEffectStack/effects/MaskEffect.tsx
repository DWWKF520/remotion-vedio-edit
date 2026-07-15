import React from "react";
import type { EffectWrapperProps } from "../types";
import type { Mask, MaskEffectParams } from "../types";

/**
 * 蒙版效果包装器（遮罩层语义）
 *
 * 效果：在视频上方叠加一个黑色遮罩层，通过 mask 定义遮罩层的显示区域。
 * - 蒙版区域内：显示黑色遮罩层（透明度由 opacity 控制）
 * - 蒙版区域外：显示原视频
 * - 羽化：遮罩层边缘产生模糊过渡
 * - 反相：黑色遮罩层作用在蒙版区域外，区域内显示原视频
 *
 * 透明度 opacity 的语义：
 * - 0：遮罩层完全透明，无任何效果
 * - 1：遮罩层完全不透明，蒙版区域显示纯黑色
 */
export const MaskEffect: React.FC<EffectWrapperProps> = ({
  children,
  params,
  width,
  height,
}) => {
  const { masks = [] } = ((params as unknown) as MaskEffectParams) || {};

  if (!masks || masks.length === 0) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width,
        height,
        overflow: "hidden",
      }}
    >
      {/* 下层内容：视频 */}
      {children}

      {/* 为每个蒙版生成一个 SVG mask，并叠加黑色遮罩层 */}
      {masks.map((mask) => (
        <MaskOverlay key={mask.id} mask={mask} width={width} height={height} />
      ))}
    </div>
  );
};

const MaskOverlay: React.FC<{ mask: Mask; width: number; height: number }> = ({
  mask,
  width,
  height,
}) => {
  const opacity = Math.max(0, Math.min(1, Number(mask.opacity ?? 1)));
  const feather = Math.max(0, Number(mask.feather ?? 0));
  const invert = !!mask.invert;

  // 是否可见
  if (opacity <= 0) return null;

  return (
    <>
      <svg
        width={width}
        height={height}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        <defs>
          <filter id={`mask-feather-${mask.id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation={feather / 2}
              result="blur"
            />
          </filter>
          <mask id={`mask-layer-${mask.id}`} maskUnits="userSpaceOnUse">
            {/* 背景：不反相时黑色（裁掉遮罩层，显示视频）；反相时白色（保留遮罩层，外部变黑） */}
            <rect x="0" y="0" width={width} height={height} fill={invert ? "white" : "black"} />
            {/* 蒙版形状：不反相时白色（保留遮罩层，显示黑色）；反相时黑色（裁掉遮罩层，内部显示视频） */}
            <g filter={`url(#mask-feather-${mask.id})`}>
              {renderMaskShape(mask, invert)}
            </g>
          </mask>
        </defs>
      </svg>

      {/* 黑色遮罩层，应用 mask */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "black",
          opacity,
          mask: `url(#mask-layer-${mask.id})`,
          WebkitMask: `url(#mask-layer-${mask.id})`,
          pointerEvents: "none",
        }}
      />
    </>
  );
};

function renderMaskShape(mask: Mask, invert: boolean): React.ReactNode {
  const { x, y, width, height } = mask;

  // mask 中：白色=保留遮罩层（显示黑色），黑色=裁掉遮罩层（显示视频）
  const fill = invert ? "black" : "white";

  switch (mask.type) {
    case "circle": {
      const cx = x + width / 2;
      const cy = y + height / 2;
      const r = Math.min(width, height) / 2;
      return <circle cx={cx} cy={cy} r={r} fill={fill} />;
    }
    case "custom": {
      if (mask.path) {
        return (
          <path
            d={mask.path}
            fill={fill}
            transform={`translate(${x}, ${y})`}
          />
        );
      }
      return (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={mask.cornerRadius ?? 0}
          fill={fill}
        />
      );
    }
    case "rect":
    default:
      return (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={mask.cornerRadius ?? 0}
          fill={fill}
        />
      );
  }
}
