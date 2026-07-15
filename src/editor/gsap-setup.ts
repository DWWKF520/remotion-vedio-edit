/**
 * GSAP 统一注册模块（仅限编辑器 UI 使用）
 *
 * 架构约束：
 * - GSAP 基于 requestAnimationFrame 的实时时间轴，非确定性
 * - Remotion 合成需要逐帧确定性渲染（useCurrentFrame）
 * - 因此 GSAP 仅用于 src/editor 下的 UI 动画，严禁用于 src/components
 *   下的 Remotion 合成组件，否则导出视频会出现动画抖动/错位
 *
 * 使用方式：
 *   import { gsap, useGSAP } from "./gsap-setup";
 */
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

// 模块级注册，确保只执行一次
gsap.registerPlugin(useGSAP);

// 与项目现有 Apple 动效曲线对齐（见 index.css cubic-bezier(0.32, 0.72, 0, 1)）
gsap.defaults({
  ease: "power2.out",
  duration: 0.25,
});

export { gsap, useGSAP };
