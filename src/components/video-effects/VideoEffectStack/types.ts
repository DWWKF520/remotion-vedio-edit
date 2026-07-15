import type React from "react";

/** 效果类型标识 */
export type EffectType = "slideRight" | "circleShrink";

/** 单个效果实例 */
export interface VideoEffectItem {
  id: string;
  type: EffectType;
  params: Record<string, unknown>;
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
