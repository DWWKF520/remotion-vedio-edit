import React from "react";
import { useEditorStore } from "./store";

/**
 * 视频特效统一配置（全局唯一来源）
 *
 * 新增特效步骤：
 *   1. 写组件 src/components/<Name>/index.tsx + manifest.ts（hidden: true）
 *   2. 在 store.ts 加 addXxxClip 方法（加到 overlay 轨道）
 *   3. 在下方 useVideoEffects 返回的数组里追加一项
 *
 * 视频库卡片、属性面板均通过 useVideoEffects() 复用此配置，无需重复定义。
 */
export type VideoEffect = {
  /** 唯一 key */
  key: string;
  /** 按钮文字 */
  label: string;
  /** 鼠标悬停提示 */
  title: string;
  /** 按钮背景色（HEX） */
  color: string;
  /** 图标节点（currentColor 取按钮文字色） */
  icon: React.ReactNode;
  /** 点击应用：传入视频 url 与名称 */
  apply: (url: string, name: string) => void;
};

/** 图片卡片复用的空特效列表（避免每帧新建数组） */
export const EMPTY_EFFECTS: VideoEffect[] = [];

/**
 * 返回当前可用的视频特效列表（apply 已绑定到 store 方法）。
 */
export const useVideoEffects = (): VideoEffect[] => {
  const addCircleShrinkClip = useEditorStore((s) => s.addCircleShrinkClip);
  const addSlideRightClip = useEditorStore((s) => s.addSlideRightClip);

  return [
    {
      key: "circleShrink",
      label: "圆形收缩转场",
      title: "圆形收缩转场（加到Overlay轨道）",
      color: "#007aff",
      icon: (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
        </svg>
      ),
      apply: (url, name) => addCircleShrinkClip(url, name),
    },
    {
      key: "slideRight",
      label: "视频右移渐变",
      title: "视频右移渐变（加到Overlay轨道，左侧可加讲解动画）",
      color: "#34c759",
      icon: (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="5" width="14" height="14" rx="2" />
          <path d="M17 12h4M19 10l2 2-2 2" />
        </svg>
      ),
      apply: (url, name) => addSlideRightClip(url, name),
    },
  ];
};
