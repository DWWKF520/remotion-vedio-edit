import type React from "react";

/** 属性面板字段类型 */
export interface PropSchema {
  /** 字段名（对应组件 props key） */
  name: string;
  /** 标签（属性面板显示） */
  label: string;
  /** 输入类型 */
  type: "text" | "color" | "number" | "textarea";
}

/** Remotion 组件 props 类型（统一为键值集合） */
export type RemotionComponent = React.FC<Record<string, unknown>>;

/** 素材库分类：素材 / 字幕 */
export type ComponentCategory = "materials" | "subtitles";

/**
 * 组件 manifest：描述一个可在时间线上使用的 Remotion 组件。
 *
 * 每个组件放在 src/components/<Name>/manifest.ts 中，调用 registerComponent 注册。
 *
 * 加新组件步骤：
 *   1. 写 src/components/<Name>/index.tsx（组件实现）
 *   2. 写 src/components/<Name>/manifest.ts（默认导出 ComponentManifest，调用 registerComponent）
 *   3. 在 src/editor/auto-register-components.ts 追加一行 import（Rem 端兜底用）
 *
 * Vite 端：import.meta.glob 自动扫描并触发 register 副作用。
 * Remotion 端：auto-register-components.ts 集中导入触发。
 */
export interface ComponentManifest {
  /** 唯一标识，存于 Clip.componentKey */
  key: string;
  /** 显示名称（素材库） */
  name: string;
  /** 描述 */
  description: string;
  /** 素材库图标（emoji 或字符） */
  icon: string;
  /** 素材库主题色（HEX） */
  accentColor: string;
  /** 组件 */
  component: RemotionComponent;
  /** 添加到时间线时的初始 props */
  defaultProps: Record<string, unknown>;
  /** 添加到时间线时的默认时长（帧） */
  defaultDuration: number;
  /** 用于 Properties 面板的字段定义 */
  propSchema: PropSchema[];
  /** 分类：materials（素材）或 subtitles（字幕）。默认 materials */
  category?: ComponentCategory;
}
