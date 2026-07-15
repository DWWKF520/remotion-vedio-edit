import { interpolate, Easing } from "remotion";

/**
 * 右移渐变特效的共享计算逻辑
 *
 * 被 SlideRightTransition（独立 Composition）和 SlideRightEffect（效果栈包装器）
 * 共同使用，确保两种集成方式下动画曲线完全一致。
 */

export interface SlideRightComputeParams {
  readonly slideDistance: number;
  readonly slideDuration: number;
  readonly finalScale: number;
  readonly gradientColor: string;
  readonly gradientOpacity: number;
  readonly borderRadius: number;
  readonly shadow: number;
}

export interface SlideRightState {
  /** 滑动进度 0-1 */
  readonly slideProgress: number;
  /** 视频水平位移（像素） */
  readonly offsetX: number;
  /** 视频缩放比 */
  readonly videoScale: number;
  /** 渐变蒙版透明度 */
  readonly maskOpacity: number;
  /** 视频圆角（像素） */
  readonly radius: number;
  /** 投影强度 */
  readonly shadowStrength: number;
  /** 渐变蒙版 CSS background 值 */
  readonly maskGradient: string;
}

/** 把 #RRGGBB 转成 rgba(r,g,b,a)。非 hex 输入退化为纯色 + transparent 关键字。 */
export const toRgba = (hex: string, alpha: number): string => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (m) {
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  // 退化：无法解析时，用 transparent 占位（可能略带灰边）
  return alpha === 0 ? "transparent" : hex;
};

/**
 * 计算右移渐变特效的逐帧状态。
 *
 * @param frame  当前帧（相对特效起点）
 * @param width  画布宽
 * @param params 特效参数
 */
export const computeSlideRight = (
  frame: number,
  width: number,
  params: SlideRightComputeParams,
): SlideRightState => {
  // 滑动进度 0 -> 1（缓出）
  const slideProgress = interpolate(frame, [0, params.slideDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // 视频水平位移（像素）
  const offsetX = (params.slideDistance / 100) * width * slideProgress;

  // 视频缩放：1 -> finalScale
  const videoScale = interpolate(slideProgress, [0, 1], [1, params.finalScale], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 左边缘渐变蒙版淡入
  const maskOpacity = interpolate(
    frame,
    [0, Math.max(1, params.slideDuration * 0.6)],
    [0, params.gradientOpacity],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // 圆角淡入（开始满屏无圆角，滑动后出现）
  const radius = interpolate(slideProgress, [0, 1], [0, params.borderRadius], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 投影随滑动进度增强
  const shadowStrength = params.shadow * slideProgress;

  // 渐变蒙版 CSS：左端为 gradientColor 实色，右端为同色 0 透明，避免灰边
  const maskGradient = `linear-gradient(to right, ${toRgba(
    params.gradientColor,
    1,
  )} 0%, ${toRgba(params.gradientColor, 0)} 100%)`;

  return {
    slideProgress,
    offsetX,
    videoScale,
    maskOpacity,
    radius,
    shadowStrength,
    maskGradient,
  };
};

/** 缩放原点映射 */
export const SLIDE_RIGHT_TRANSFORM_ORIGIN_MAP: Record<string, string> = {
  left: "left center",
  center: "center center",
  right: "right center",
};
