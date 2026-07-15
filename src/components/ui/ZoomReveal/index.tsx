import React, { useRef } from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { gsap, useGSAP } from "../../../editor/gsap-setup";

/**
 * 缩放揭示（Zoom Reveal）—— GSAP timeline 版
 *
 * 参考 GSAP ScrollTrigger 经典 demo（codepen.io/GreenSock/pen/YzbPYMx）：
 *   - 原版用「鼠标滚动」驱动 ScrollTrigger.scrub 把 timeline 进度绑到滚动条
 *   - 这里改用「时间轴（视频帧）」驱动：把 useCurrentFrame() 映射成 0..1 进度，
 *     喂给一个 paused 的 gsap.timeline，用 tl.progress(p) 同步推进
 *
 * 确定性策略（避免导出抖动）：
 *   1. timeline 必须 { paused: true }，绝不让 GSAP 自己跑 rAF
 *   2. 每帧由 useCurrentFrame 触发重渲染 → useGSAP 里 tl.progress(帧映射值)
 *   3. 被 GSAP 管理的属性（transform/opacity）React 不再重复设置，避免互相覆盖
 *   4. timeline 只在动画参数变化时重建；frame 变化只 seek，不重建
 *
 * 视觉：上层 cover 图向镜头方向「冲过去」（scale+translateZ+perspective）并淡出，
 *       底层 reveal 图同时轻微放大，形成「穿越封面 → 揭示底图」的过渡。
 */
export const ZoomReveal: React.FC<{
  /** 上层覆盖图（会被冲过去 / 揭开） */
  readonly coverSrc?: string;
  /** 底层揭示图（cover 揭开后露出） */
  readonly revealSrc?: string;
  /** 覆盖图最终缩放（原版 2） */
  readonly coverScale?: number;
  /** 覆盖图最终 Z 位移（原版 350，配合 perspective 产生「冲向镜头」） */
  readonly coverZ?: number;
  /** 底层图最终缩放（原版 1.1） */
  readonly revealScale?: number;
  /** 透视距离 px（原版 500） */
  readonly perspective?: number;
  /** 揭示动画起始帧 */
  readonly startFrame?: number;
  /** 揭示动画持续帧数（0 = 整个片段） */
  readonly revealDuration?: number;
  /** 覆盖图开始淡出的进度点（0-1，1 表示不淡出，靠 scale/Z 自然揭开） */
  readonly coverFadeStart?: number;
  /** 缓动强度：1=power1 2=power2 3=power3（对应 GSAP ease） */
  readonly easePower?: number;
  /** 背景色（透明传 transparent） */
  readonly backgroundColor?: string;
  /** 视频宽度（兜底） */
  readonly videoWidth?: number;
  /** 视频高度（兜底） */
  readonly videoHeight?: number;
}> = ({
  coverSrc = "https://assets-global.website-files.com/63ec206c5542613e2e5aa784/643312a6bc4ac122fc4e3afa_main%20home.webp",
  revealSrc = "https://images.unsplash.com/photo-1589848315097-ba7b903cc1cc?q=80&w=2070&auto=format&fit=crop",
  coverScale = 2,
  coverZ = 350,
  revealScale = 1.1,
  perspective = 500,
  startFrame = 0,
  revealDuration = 0,
  coverFadeStart = 0.6,
  easePower = 1,
  backgroundColor = "#0a0a0a",
  videoWidth = 1920,
  videoHeight = 1080,
}) => {
  const frame = useCurrentFrame();
  const vcfg = useVideoConfig();
  const width = vcfg.width || videoWidth;
  const height = vcfg.height || videoHeight;

  // 揭示动画的有效持续帧数：0 表示铺满整个片段
  const animDuration =
    revealDuration && revealDuration > 0 ? revealDuration : Math.max(1, vcfg.durationInFrames);

  // GSAP ease 字符串映射
  const easeName =
    easePower >= 3 ? "power3.inOut" : easePower === 2 ? "power2.inOut" : "power1.inOut";
  // 淡出段长度（timeline 归一化时长 1 内）
  const fadeDur = Math.max(0.001, 1 - coverFadeStart);

  const containerRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  // ① 创建 timeline（仅在动画参数变化时重建，不含 frame）
  useGSAP(
    () => {
      if (!coverRef.current || !revealRef.current) return;
      const tl = gsap
        .timeline({ paused: true, defaults: { ease: easeName } })
        // cover：scale + z 全程（duration 1，起始 0）
        .to(coverRef.current, { scale: coverScale, z: coverZ, duration: 1 }, 0)
        // cover：opacity 仅在 coverFadeStart → 1 段淡出
        .to(coverRef.current, { opacity: 0, duration: fadeDur }, coverFadeStart)
        // reveal：scale 全程，与 cover 同步（起始 0）
        .to(revealRef.current, { scale: revealScale, duration: 1 }, 0);
      tlRef.current = tl;
      return () => {
        tl.kill();
        tlRef.current = null;
      };
    },
    { scope: containerRef, dependencies: [coverScale, coverZ, revealScale, coverFadeStart, easeName, fadeDur] },
  );

  // ② 每帧 seek：把 Remotion 帧映射成 0..1 进度，喂给 paused timeline
  useGSAP(
    () => {
      if (!tlRef.current) return;
      const p = interpolate(frame, [startFrame, startFrame + animDuration], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      tlRef.current.progress(p);
    },
    { dependencies: [frame, startFrame, animDuration] },
  );

  const safeSrc = React.useCallback((src: string) => {
    if (!src) return src;
    if (/^(https?:|data:|blob:)/i.test(src)) return src;
    const [p, query] = src.split("?");
    const encodedPath = p.split("/").map((seg) => encodeURI(seg)).join("/");
    return query ? `${encodedPath}?${query}` : encodedPath;
  }, []);

  return (
    <AbsoluteFill
      ref={containerRef}
      style={{
        background: backgroundColor === "transparent" ? "transparent" : backgroundColor,
        overflow: "hidden",
      }}
    >
      {/* 底层揭示图（z-index 1）—— 对应原版 .section.hero，scale 交由 GSAP 管 */}
      <div
        ref={revealRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          overflow: "hidden",
          willChange: "transform",
        }}
      >
        {revealSrc ? (
          <Img
            src={safeSrc(revealSrc)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center center",
              display: "block",
            }}
          />
        ) : (
          <Placeholder label="REVEAL" color="#1e3a5f" width={width} height={height} />
        )}
      </div>

      {/* 上层覆盖图（z-index 2, perspective）—— 对应原版 .image-container */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          perspective: `${perspective}px`,
          overflow: "hidden",
        }}
      >
        {/* coverRef：transform/opacity 交由 GSAP 管，React 不设置这两个属性 */}
        <div
          ref={coverRef}
          style={{
            width: "100%",
            height: "100%",
            willChange: "transform, opacity",
          }}
        >
          {coverSrc ? (
            <Img
              src={safeSrc(coverSrc)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center center",
                display: "block",
              }}
            />
          ) : (
            <Placeholder label="COVER" color="#5f1e3a" width={width} height={height} />
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Placeholder: React.FC<{ label: string; color: string; width: number; height: number }> = ({
  label,
  color,
  width,
  height,
}) => (
  <div
    style={{
      width: "100%",
      height: "100%",
      background: `linear-gradient(135deg, ${color} 0%, rgba(0,0,0,0.85) 100%)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "rgba(255,255,255,0.5)",
      fontSize: Math.min(width, height) * 0.05,
      fontWeight: 700,
      letterSpacing: 2,
    }}
  >
    {label}
  </div>
);
