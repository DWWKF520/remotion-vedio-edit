import type React from "react";

/** 效果类型标识 */
export type EffectType = "slideRight" | "circleShrink" | "mask";

/** 蒙版形状 */
export type MaskShape = "rect" | "circle" | "custom";

/** 单个蒙版 */
export interface Mask {
  id: string;
  type: MaskShape;
  /** 矩形/圆形/自定义外接框：左上角像素坐标和尺寸 */
  x: number;
  y: number;
  width: number;
  height: number;
  /** 自定义形状的 SVG path（基于 x,y,width,height 内部坐标） */
  path?: string;
  /** 羽化半径（像素） */
  feather: number;
  /** 蒙版区域不透明度（0-1，1 表示完全保留） */
  opacity: number;
  /** 是否反相（保留区域变透明，外部保留） */
  invert: boolean;
  /** 圆角半径（像素，仅矩形有效） */
  cornerRadius?: number;
}

/** 单个效果实例 */
export interface VideoEffectItem {
  id: string;
  type: EffectType;
  params: Record<string, unknown>;
}

/** 蒙版效果参数 */
export interface MaskEffectParams {
  masks: Mask[];
  /** 全局蒙版混合模式 */
  blendMode?: "normal" | "intersect" | "subtract";
}

/** 效果元数据（用于 UI 展示和默认参数） */
export interface EffectMeta {
  type: EffectType;
  label: string;
  icon: React.ReactNode;
  color: string;
  defaultParams: Record<string, unknown>;
  /** 可编辑参数的 schema（用于属性面板） */
  paramSchema: { name: string; label: string; type: "number" | "color" | "text" | "select"; options?: { label: string; value: string }[]; min?: number; max?: number }[];
}

export type EffectWrapperProps = {
  children: React.ReactNode;
  params: Record<string, unknown>;
  frame: number;
  fps: number;
  width: number;
  height: number;
};

export type EffectWrapper = React.FC<EffectWrapperProps>;
