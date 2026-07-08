import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface LightSpotlightProps {
  /** 被揭示的文字 */
  labelText: string;
  /** 摆动角度（度） */
  swingAngleDegrees: number;
  /** 摆动一个完整来回的秒数 */
  swingCycleSeconds: number;
  /** 灯泡大小倍率 */
  lampScale: number;
  /** 灯光晕开透明度 0-1 */
  glowOpacity: number;
  /** 未照到的文字颜色（与背景同色调时呈现"未点亮"） */
  maskColor: string;
  /** 照亮后的文字颜色 */
  textColor: string;
  /** 背景色；传 "transparent" 表示透明 */
  backgroundColor: string;
  /** 视频宽度（兜底，单位 px） */
  videoWidth: number;
  /** 视频高度（兜底，单位 px） */
  videoHeight: number;
}

/**
 * 聚光灯扫字动画：顶部一颗灯泡左右摆动，灯光照到的文字从暗色变亮。
 *
 * 实现：双层文字 + SVG clipPath。底层暗色文字铺底，顶层亮色文字被
 * 灯锥多边形 clipPath 裁剪。灯泡每帧根据 sin 相位横向偏移。
 */
export const LightSpotlight: React.FC<LightSpotlightProps> = (p) => {
  const frame = useCurrentFrame();
  const vcfg = useVideoConfig();

  const width = vcfg.width || p.videoWidth || 1920;
  const height = vcfg.height || p.videoHeight || 1080;

  // 一个完整摆动周期对应的帧数
  const period = Math.max(1, p.swingCycleSeconds * vcfg.fps);
  // 0..1 循环
  const t = (frame % period) / period;
  // -1..1
  const swing = Math.sin(t * Math.PI * 2);

  // 灯泡（灯底中心）横向偏移：相对画面中线左右摇摆
  const swingLimit = width * 0.35;
  const apexX = width / 2 + swing * swingLimit;

  // 灯泡尺寸 & 位置
  const lampRadius = 22 * p.lampScale;
  const lampY = 30 + lampRadius;
  const lampApexY = lampY + lampRadius * 0.7;

  // 灯锥：从 apex 向画面下方扩展
  // 半角 = 14°（固定，加上 swing 后看起来更宽自然）
  const halfAngle = 14 * (Math.PI / 180);
  const coneLength = height - lampApexY + 200;
  const baseHalfWidth = Math.tan(halfAngle) * coneLength;

  const polyPoints = [
    `${apexX},${lampApexY}`,
    `${apexX - baseHalfWidth},${lampApexY + coneLength}`,
    `${apexX + baseHalfWidth},${lampApexY + coneLength}`,
  ].join(" ");

  // 灯泡根据 swing 微微反方向倾斜，增强"提灯"感
  const lampTilt = swing * (p.swingAngleDegrees / 3) * (Math.PI / 180);

  // 主字号：撑到画面 60% 宽
  const fontSize = Math.min(width / Math.max(p.labelText.length * 0.55, 4), height * 0.5);

  // 灯泡光晕（灯泡自身的柔光）
  const glowR = lampRadius * 4;
  const glowId = `ls-glow-${p.swingCycleSeconds.toFixed(2)}`;

  return (
    <AbsoluteFill
      style={{
        background: p.backgroundColor === "transparent" ? "transparent" : p.backgroundColor,
        overflow: "hidden",
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: "block" }}
      >
        <defs>
          <clipPath id="spot-clip">
            <polygon points={polyPoints} />
          </clipPath>
          <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={p.textColor} stopOpacity={p.glowOpacity} />
            <stop offset="60%" stopColor={p.textColor} stopOpacity={p.glowOpacity * 0.3} />
            <stop offset="100%" stopColor={p.textColor} stopOpacity="0" />
          </radialGradient>
          {/* 灯锥内填一层柔光渐变（让被照到的字也带点"光感"） */}
          <linearGradient id="cone-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.textColor} stopOpacity={p.glowOpacity * 0.25} />
            <stop offset="100%" stopColor={p.textColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 灯锥内的柔和填充（让聚光区有"光雾"） */}
        <polygon
          points={polyPoints}
          fill="url(#cone-fill)"
        />

        {/* 底层暗色文字（铺底用） */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          fontWeight={800}
          fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
          fill={p.maskColor}
        >
          {p.labelText}
        </text>

        {/* 顶层亮色文字（被聚光灯 clip） */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          fontWeight={800}
          fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
          fill={p.textColor}
          clipPath="url(#spot-clip)"
        >
          {p.labelText}
        </text>

        {/* 灯泡 + 灯泡光晕 */}
        <g
          transform={`translate(${apexX} ${lampY}) rotate(${(lampTilt * 180) / Math.PI})`}
        >
          {/* 外圈柔光 */}
          <circle r={glowR} fill={`url(#${glowId})`} />
          {/* 灯泡底座 */}
          <rect
            x={-lampRadius * 0.45}
            y={-lampRadius * 0.2}
            width={lampRadius * 0.9}
            height={lampRadius * 0.4}
            rx={lampRadius * 0.1}
            fill={p.maskColor}
          />
          {/* 灯泡主体 */}
          <circle r={lampRadius} fill={p.textColor} />
          {/* 灯泡高光 */}
          <circle
            cx={-lampRadius * 0.25}
            cy={-lampRadius * 0.25}
            r={lampRadius * 0.4}
            fill="#ffffff"
            opacity={0.55}
          />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
