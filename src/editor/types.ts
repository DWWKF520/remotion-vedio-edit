// 编辑器核心类型定义

/** 动画效果类型 */
export type EffectType =
  | "none"
  | "fade"
  | "slide-left"
  | "slide-right"
  | "slide-up"
  | "slide-down"
  | "zoom-in"
  | "zoom-out"
  | "bounce"
  | "rotate";

/** 单个动画效果 */
export interface ClipEffect {
  type: EffectType;
  /** 持续帧数 */
  duration: number;
}

/** 效果元数据（用于 UI 展示） */
export interface EffectMeta {
  type: EffectType;
  label: string;
  icon: string;
}

/** 所有可选效果列表 */
export const EFFECT_LIST: EffectMeta[] = [
  { type: "none", label: "无", icon: "∅" },
  { type: "fade", label: "淡入淡出", icon: "◉" },
  { type: "slide-left", label: "左滑", icon: "←" },
  { type: "slide-right", label: "右滑", icon: "→" },
  { type: "slide-up", label: "上滑", icon: "↑" },
  { type: "slide-down", label: "下滑", icon: "↓" },
  { type: "zoom-in", label: "缩放进入", icon: "⊕" },
  { type: "zoom-out", label: "缩放退出", icon: "⊖" },
  { type: "bounce", label: "弹入", icon: "✦" },
  { type: "rotate", label: "旋转", icon: "⟳" },
];

/** 单个组件实例在时间线上的片段 */
export interface Clip {
  id: string;
  /** 引用 registry 中注册的组件 key */
  componentKey: string;
  /** 显示名 */
  name: string;
  /** 起始帧（相对整个时间线） */
  start: number;
  /** 持续帧数 */
  duration: number;
  /**
   * 组件内容源偏移（帧）。
   * 表示组件内部 useCurrentFrame() 应从第几帧开始播放。
   * 分割/向前裁剪时会被设置，让后半段接着前半段播放，而不是从头开始。
   * 默认 0。
   */
  sourceStart?: number;
  /** 入场动画 */
  enterEffect?: ClipEffect;
  /** 出场动画 */
  exitEffect?: ClipEffect;
  /** 透传给 Remotion 组件的 props */
  props: Record<string, unknown>;
}

/** 轨道 */
export interface Track {
  id: string;
  name: string;
  /** 轨道类型，用于分组与样式 */
  kind: "overlay" | "background";
  /** 该轨道上的 clip id 列表（顺序即渲染顺序，靠后的在上方） */
  clipIds: string[];
  /** 是否锁定 */
  locked: boolean;
  /** 是否静音/隐藏（预览时跳过） */
  muted: boolean;
}

export interface EditorState {
  tracks: Track[];
  clips: Record<string, Clip>;
  /** 当前选中的 clip id */
  selectedClipId: string | null;
  /** 当前播放头帧位置 */
  currentFrame: number;
  /** 总时长（帧） */
  totalDuration: number;
  /** FPS */
  fps: number;
  /** 画布尺寸 */
  width: number;
  height: number;
  /** 时间线缩放（每帧多少像素） */
  pxPerFrame: number;
}

/** 保存的 clip 组合预设，可重新加载到时间线 */
export interface Preset {
  id: string;
  name: string;
  createdAt: number;
  tracks: Track[];
  clips: Record<string, Clip>;
  width: number;
  height: number;
  fps: number;
}
