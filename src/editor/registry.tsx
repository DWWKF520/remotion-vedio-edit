import React from "react";
import { HelloWorld } from "../HelloWorld";
import { SubtitleClip } from "./SubtitleClip";
import { SubtitleTrack } from "./SubtitleTrack";

/**
 * 组件库注册表
 *
 * 每个条目描述一个可在时间线上使用的 Remotion 组件：
 * - key：唯一标识，存于 Clip.componentKey
 * - component：React 组件（接收 props）
 * - defaultProps：添加到时间线时的初始 props
 * - propSchema：用于 Properties 面板渲染简单的输入控件
 *
 * 注意：HelloWorld 内部已组合 Logo + Title + Subtitle，
 * 所以不再单独注册这三个子组件。
 */
export interface PropSchema {
  /** 字段名 */
  name: string;
  /** 标签 */
  label: string;
  /** 输入类型 */
  type: "text" | "color" | "number" | "textarea";
}

// 组件 props 类型用 record 即可，因为各组件 props 不同，
// 这里统一以键值集合表示，由 Properties 面板按 propSchema 渲染。
export type RemotionComponent = React.FC<Record<string, unknown>>;

export interface ComponentDefinition {
  key: string;
  name: string;
  description: string;
  component: RemotionComponent;
  defaultProps: Record<string, unknown>;
  defaultDuration: number;
  propSchema: PropSchema[];
}

export const registry: ComponentDefinition[] = [
  {
    key: "helloworld",
    name: "Hello World",
    description: "完整示例：Logo + 标题 + 字幕",
    component: HelloWorld as RemotionComponent,
    defaultProps: {
      titleText: "Welcome to Remotion",
      titleColor: "#000000",
      logoColor1: "#91EAE4",
      logoColor2: "#86A8E7",
    },
    defaultDuration: 150,
    propSchema: [
      { name: "titleText", label: "Title Text", type: "text" },
      { name: "titleColor", label: "Title Color", type: "color" },
      { name: "logoColor1", label: "Logo Color 1", type: "color" },
      { name: "logoColor2", label: "Logo Color 2", type: "color" },
    ],
  },
  {
    key: "subtitle",
    name: "字幕",
    description: "可自定义文本、颜色、大小的字幕条",
    component: SubtitleClip as RemotionComponent,
    defaultProps: {
      text: "在这里输入字幕",
      color: "#ffffff",
      fontSize: 48,
      bgColor: "rgba(0,0,0,0.6)",
      position: "bottom",
    },
    defaultDuration: 90,
    propSchema: [
      { name: "text", label: "字幕文本", type: "text" },
      { name: "color", label: "文字颜色", type: "color" },
      { name: "fontSize", label: "字体大小", type: "number" },
      { name: "bgColor", label: "背景颜色", type: "text" },
      { name: "position", label: "位置(top/middle/bottom)", type: "text" },
    ],
  },
  {
    key: "subtitleTrack",
    name: "字幕轨道",
    description: "通过编程式文本批量管理多段字幕（每行：起始秒-结束秒: 文本）",
    component: SubtitleTrack as RemotionComponent,
    defaultProps: {
      subtitlesText:
        "0-3: 欢迎观看\n3-6: 这是字幕轨道组件\n6-10: 可以通过编程批量添加字幕",
      color: "#ffffff",
      fontSize: 48,
      bgColor: "rgba(0,0,0,0.6)",
      position: "bottom",
      animation: "slide",
    },
    defaultDuration: 300,
    propSchema: [
      {
        name: "subtitlesText",
        label: "字幕列表（每行：起始秒-结束秒: 文本）",
        type: "textarea",
      },
      { name: "color", label: "文字颜色", type: "color" },
      { name: "fontSize", label: "字体大小", type: "number" },
      { name: "bgColor", label: "背景颜色", type: "text" },
      { name: "position", label: "位置(top/middle/bottom)", type: "text" },
      { name: "animation", label: "动画(slide/fade/none)", type: "text" },
    ],
  },
];

export function getComponentDef(key: string): ComponentDefinition | undefined {
  return registry.find((c) => c.key === key);
}
