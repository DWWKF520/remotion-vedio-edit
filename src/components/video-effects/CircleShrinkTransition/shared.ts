import { interpolate, spring, Easing } from "remotion";

/**
 * 圆形收缩特效的共享计算逻辑
 *
 * 被 CircleShrinkTransition（独立 Composition）和 CircleShrinkEffect（效果栈包装器）
 * 共同使用，确保两种集成方式下动画曲线完全一致。
 */

export type CircleShrinkShape = "circle" | "square" | "rect" | "rounded";
export type CircleShrinkContentMode = "scale" | "crop";

export interface CircleShrinkComputeParams {
  readonly shape: CircleShrinkShape;
  readonly rectAspect: number;
  readonly cornerRadius: number;
  readonly contentMode: CircleShrinkContentMode;
  readonly finalX: number;
  readonly finalY: number;
  readonly finalRadius: number;
  readonly shrinkDuration: number;
  readonly bgDim: number;
}

export interface CircleShrinkState {
  /** 收缩进度 0-1 */
  readonly shrinkProgress: number;
  /** 当前形状中心 X（像素） */
  readonly curX: number;
  /** 当前形状中心 Y（像素） */
  readonly curY: number;
  /** 当前半径/半边长（像素） */
  readonly curRadius: number;
  /** 形状半宽 */
  readonly shapeHalfW: number;
  /** 形状半高 */
  readonly shapeHalfH: number;
  /** 形状圆角 CSS 值 */
  readonly shapeBorderRadius: string;
  /** scale 模式下的视频缩放比 */
  readonly videoScale: number;
  /** 背景变暗进度 0-bgDim */
  readonly dimProgress: number;
  /** 边框弹性缩放 */
  readonly ringScale: number;
}

/**
 * 计算圆形收缩特效的逐帧状态。
 *
 * @param frame  当前帧（相对特效起点）
 * @param fps    合成帧率（用于 spring 物理计算）
 * @param width  画布宽
 * @param height 画布高
 * @param params 特效参数
 */
export const computeCircleShrink = (
  frame: number,
  fps: number,
  width: number,
  height: number,
  params: CircleShrinkComputeParams,
): CircleShrinkState => {
  // 起始超大半径（能覆盖整个画面）
  const maxRadius = Math.sqrt(width * width + height * height) / 2 + 200;

  // 收缩阶段进度：从画面中心直接收缩到最终位置
  const shrinkProgress = interpolate(frame, [0, params.shrinkDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // 计算当前中心位置：起始在画面中心，直接收缩到最终位置
  const startX = width / 2;
  const startY = height / 2;
  const endX = (params.finalX / 100) * width;
  const endY = (params.finalY / 100) * height;

  const curX = interpolate(shrinkProgress, [0, 1], [startX, endX], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const curY = interpolate(shrinkProgress, [0, 1], [startY, endY], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const curRadius = interpolate(shrinkProgress, [0, 1], [maxRadius, params.finalRadius], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 根据形状计算宽高和 borderRadius
  // finalRadius 作为"半宽"基准：circle/square/rounded 时高=宽，rect 时按 rectAspect 拉伸
  const shapeHalfW = params.shape === "rect" ? curRadius * params.rectAspect : curRadius;
  const shapeHalfH = curRadius;
  const shapeBorderRadius =
    params.shape === "circle" ? "50%"
    : params.shape === "rounded" ? `${params.cornerRadius}px`
    : "0px";

  // scale 模式：视频从画布尺寸开始，随形状等比例缩小
  const finalShapeW = params.shape === "rect" ? params.finalRadius * params.rectAspect * 2 : params.finalRadius * 2;
  const finalShapeH = params.finalRadius * 2;
  const videoRatio = width / height;
  const finalShapeRatio = finalShapeW / finalShapeH;
  const finalScale =
    videoRatio > finalShapeRatio ? finalShapeH / height : finalShapeW / width;
  const videoScale = interpolate(shrinkProgress, [0, 1], [1, finalScale], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 背景变暗进度
  const dimProgress = interpolate(frame, [2, params.shrinkDuration + 4], [0, params.bgDim], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 边框弹性出现
  const ringSpring = spring({
    frame: frame - 2,
    fps,
    config: { damping: 10, mass: 0.4, stiffness: 200 },
  });
  const ringScale = 0.8 + 0.2 * Math.min(1, ringSpring);

  return {
    shrinkProgress,
    curX,
    curY,
    curRadius,
    shapeHalfW,
    shapeHalfH,
    shapeBorderRadius,
    videoScale,
    dimProgress,
    ringScale,
  };
};

/**
 * 计算形状外发光的 boxShadow。
 * @param glowIntensity 外发光强度 0-1
 */
export const getCircleShrinkGlow = (glowIntensity: number): string =>
  glowIntensity > 0
    ? `0 0 ${40 * glowIntensity}px rgba(255,255,255,${0.3 * glowIntensity}), 0 0 ${
        80 * glowIntensity
      }px rgba(255,255,255,${0.15 * glowIntensity})`
    : "none";
