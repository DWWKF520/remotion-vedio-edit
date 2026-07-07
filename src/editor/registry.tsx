import React from "react";
import { HelloWorld } from "../components/HelloWorld";
import { SubtitleClip } from "../components/SubtitleClip";
import { SubtitleTrack } from "../components/SubtitleTrack";
import { ClaudeType } from "../components/ClaudeType";
import { RulerProgressRender } from "../components/RulerProgressRender";
import { Wechat2DRender } from "../components/Wechat2DRender";

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
  {
    key: "claudeType",
    name: "Claude 打字机",
    description: "Claude 风格的 AI 聊天打字动画，逐字显示回复",
    component: ClaudeType as RemotionComponent,
    defaultProps: {
      prompt: "What is Remotion?",
      response:
        "Remotion is a framework for creating videos programmatically using React. It allows you to use all the power of React — components, hooks, state — to create dynamic, data-driven videos.",
      accentColor: "#D97757",
      speed: 2,
      thinkingFrames: 30,
      fontSize: 24,
      borderRadius: 16,
    },
    defaultDuration: 300,
    propSchema: [
      { name: "prompt", label: "用户提问", type: "text" },
      { name: "response", label: "Claude 回复", type: "textarea" },
      { name: "accentColor", label: "主题色", type: "color" },
      { name: "speed", label: "打字速度(帧/字)", type: "number" },
      { name: "thinkingFrames", label: "思考停顿(帧)", type: "number" },
      { name: "fontSize", label: "字体大小", type: "number" },
      { name: "borderRadius", label: "窗口圆角", type: "number" },
    ],
  },
  {
    key: "wechat2d",
    name: "微信二维码",
    description: "微信风格二维码渲染，支持扫描线、呼吸光效、中心Logo",
    component: Wechat2DRender as RemotionComponent,
    defaultProps: {
      qrSize: 400,
      fgColor: "#1a1a1a",
      bgColor: "#ffffff",
      wechatColor: "#07C160",
      logoText: "微信",
      logoFontSize: 20,
      moduleCount: 33,
      seed: 42,
      dataLevel: 1,
      showScanLine: 1,
      showGlow: 1,
      hintText: "长按识别二维码",
      hintColor: "#07C160",
      hintFontSize: 16,
      borderRadius: 12,
      showBorder: 1,
    },
    defaultDuration: 300,
    propSchema: [
      { name: "qrSize", label: "二维码尺寸", type: "number" },
      { name: "fgColor", label: "前景色", type: "color" },
      { name: "bgColor", label: "背景色", type: "color" },
      { name: "wechatColor", label: "微信主题色", type: "color" },
      { name: "logoText", label: "Logo文字", type: "text" },
      { name: "logoFontSize", label: "Logo字体大小", type: "number" },
      { name: "moduleCount", label: "模块数量(密度)", type: "number" },
      { name: "seed", label: "随机种子", type: "number" },
      { name: "dataLevel", label: "数据密度(0-3)", type: "number" },
      { name: "showScanLine", label: "扫描线(1/0)", type: "number" },
      { name: "showGlow", label: "呼吸光效(1/0)", type: "number" },
      { name: "hintText", label: "提示文字", type: "text" },
      { name: "hintColor", label: "提示文字颜色", type: "color" },
      { name: "hintFontSize", label: "提示文字大小", type: "number" },
      { name: "borderRadius", label: "圆角", type: "number" },
      { name: "showBorder", label: "白色边框(1/0)", type: "number" },
    ],
  },
  {
    key: "rulerProgress",
    name: "标尺进度条",
    description: "底部时间标尺进度条，带刻度、时间标记和播放头指示器",
    component: RulerProgressRender as RemotionComponent,
    defaultProps: {
      height: 40,
      fillColor: "#8b5cf6",
      bgColor: "#1a1a1e",
      tickColor: "#333333",
      textColor: "#666666",
      playheadColor: "#ef4444",
      showTimeMarkers: true,
      tickInterval: 1,
      position: "bottom",
      showPlayheadTriangle: true,
      padding: 0,
      borderRadius: 0,
      showShadow: true,
    },
    defaultDuration: 300,
    propSchema: [
      { name: "height", label: "高度", type: "number" },
      { name: "fillColor", label: "填充色", type: "color" },
      { name: "bgColor", label: "背景色", type: "color" },
      { name: "tickColor", label: "刻度颜色", type: "color" },
      { name: "textColor", label: "文字颜色", type: "color" },
      { name: "playheadColor", label: "播放头颜色", type: "color" },
      { name: "showTimeMarkers", label: "显示时间标记(1/0)", type: "number" },
      { name: "tickInterval", label: "刻度间隔(秒)", type: "number" },
      { name: "position", label: "位置(bottom/top)", type: "text" },
      { name: "showPlayheadTriangle", label: "显示播放头三角(1/0)", type: "number" },
      { name: "padding", label: "边距", type: "number" },
      { name: "borderRadius", label: "圆角", type: "number" },
      { name: "showShadow", label: "显示阴影(1/0)", type: "number" },
    ],
  },
];

export function getComponentDef(key: string): ComponentDefinition | undefined {
  return registry.find((c) => c.key === key);
}
