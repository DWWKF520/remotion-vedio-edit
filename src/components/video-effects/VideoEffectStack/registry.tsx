import type { EffectMeta, EffectType, EffectWrapper } from "./types";
import { SlideRightEffect } from "./effects/SlideRightEffect";
import { CircleShrinkEffect } from "./effects/CircleShrinkEffect";

/** 所有可用效果的元数据 */
export const EFFECT_META_LIST: EffectMeta[] = [
  {
    type: "slideRight",
    label: "右移渐变",
    color: "#34c759",
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="14" height="14" rx="2" />
        <path d="M17 12h4M19 10l2 2-2 2" />
      </svg>
    ),
    defaultParams: {
      slideDistance: 35,
      slideDuration: 20,
      finalScale: 0.72,
      scaleOrigin: "left",
      gradientColor: "#0a0a1a",
      gradientWidth: 18,
      gradientOpacity: 1,
      borderRadius: 16,
      shadow: 0.5,
    },
    paramSchema: [
      { name: "slideDistance", label: "右移距离%(0-100)", type: "number", min: 0, max: 100 },
      { name: "slideDuration", label: "滑动帧数", type: "number", min: 1 },
      { name: "finalScale", label: "最终缩放(0.1-2)", type: "number", min: 0.1, max: 2 },
      { name: "scaleOrigin", label: "缩放原点", type: "select", options: [
        { label: "左(left)", value: "left" },
        { label: "中心(center)", value: "center" },
        { label: "右(right)", value: "right" },
      ]},
      { name: "gradientColor", label: "渐变蒙版颜色", type: "color" },
      { name: "gradientWidth", label: "渐变宽度%(0-50)", type: "number", min: 0, max: 50 },
      { name: "gradientOpacity", label: "渐变透明度(0-1)", type: "number", min: 0, max: 1 },
      { name: "borderRadius", label: "圆角(像素)", type: "number", min: 0 },
      { name: "shadow", label: "投影强度(0-1)", type: "number", min: 0, max: 1 },
    ],
  },
  {
    type: "circleShrink",
    label: "圆形收缩",
    color: "#007aff",
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
    defaultParams: {
      shape: "circle",
      contentMode: "scale",
      finalX: 12,
      finalY: 82,
      finalRadius: 100,
      shrinkDuration: 18,
      borderWidth: 5,
      borderColor: "#ffffff",
      glowIntensity: 0.8,
      bgDim: 0.4,
    },
    paramSchema: [
      { name: "shape", label: "形状", type: "select", options: [
        { label: "圆形", value: "circle" },
        { label: "正方形", value: "square" },
        { label: "长方形", value: "rect" },
        { label: "圆角方形", value: "rounded" },
      ]},
      { name: "contentMode", label: "内容模式", type: "select", options: [
        { label: "缩放(scale)", value: "scale" },
        { label: "裁剪(crop)", value: "crop" },
      ]},
      { name: "finalX", label: "目标位置X%(0-100)", type: "number", min: 0, max: 100 },
      { name: "finalY", label: "目标位置Y%(0-100)", type: "number", min: 0, max: 100 },
      { name: "finalRadius", label: "最终半径(像素)", type: "number", min: 10 },
      { name: "shrinkDuration", label: "收缩帧数", type: "number", min: 1 },
      { name: "borderWidth", label: "边框宽度(像素)", type: "number", min: 0 },
      { name: "borderColor", label: "边框颜色", type: "color" },
      { name: "glowIntensity", label: "外发光(0-1)", type: "number", min: 0, max: 1 },
      { name: "bgDim", label: "背景变暗(0-1)", type: "number", min: 0, max: 1 },
    ],
  },
];

/** 效果包装组件映射 */
export const EFFECT_WRAPPERS: Record<EffectType, EffectWrapper> = {
  slideRight: SlideRightEffect,
  circleShrink: CircleShrinkEffect,
};

/** 根据 type 获取效果元数据 */
export function getEffectMeta(type: EffectType): EffectMeta | undefined {
  return EFFECT_META_LIST.find((m) => m.type === type);
}
