import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
  spring,
} from "remotion";

/**
 * 圆形收缩转场 · Circle Shrink Transition
 *
 * 两种内容模式：
 *   - "scale" 整体缩放：视频完整缩小后放进圆圈，飞向角落
 *   - "crop"  局部裁剪：圆形是取景窗，框住视频局部（比如人脸）后飞走
 */

export const CircleShrinkTransition: React.FC<{
  /** 视频地址 */
  readonly src?: string;
  /** 内容模式：scale=整体缩放进圆圈，crop=局部裁剪框住 */
  readonly contentMode?: "scale" | "crop";
  /** 聚焦点 X（百分比 0-100）—— crop 模式下圆形收缩到哪里 */
  readonly focusX?: number;
  /** 聚焦点 Y（百分比 0-100） */
  readonly focusY?: number;
  /** 收缩后圆形半径（像素） */
  readonly focusRadius?: number;
  /** 最终位置 X（百分比 0-100） */
  readonly finalX?: number;
  /** 最终位置 Y（百分比 0-100） */
  readonly finalY?: number;
  /** 最终圆形半径（像素） */
  readonly finalRadius?: number;
  /** 收缩动画持续帧数 */
  readonly shrinkDuration?: number;
  /** 移动动画延迟帧数（收缩完成后等多久开始飞） */
  readonly flyDelay?: number;
  /** 移动动画持续帧数 */
  readonly flyDuration?: number;
  /** 圆环边框宽度（像素），0 表示无边框 */
  readonly borderWidth?: number;
  /** 圆环边框颜色 */
  readonly borderColor?: string;
  /** 圆环外发光强度 0-1 */
  readonly glowIntensity?: number;
  /** 背景是否变暗 0-1（突出圆形主体） */
  readonly bgDim?: number;
  /** 底层全屏视频是否显示 0-1（0=完全透明，只有圆圈有内容） */
  readonly bgVideoOpacity?: number;
  /** 视频填充方式：cover=填满(可能裁剪)，contain=完整显示(可能留白) */
  readonly objectFit?: "cover" | "contain";
  /** 视频音量 0-1 */
  readonly volume?: number;
  /** 是否静音 */
  readonly muted?: number;
  /** 视频从第几秒开始 */
  readonly startFrom?: number;
  /** 视频宽度（兜底） */
  readonly videoWidth?: number;
  /** 视频高度（兜底） */
  readonly videoHeight?: number;
}> = ({
  src = "",
  contentMode = "scale",
  focusX = 20,
  focusY = 75,
  focusRadius = 220,
  finalX = 12,
  finalY = 82,
  finalRadius = 100,
  shrinkDuration = 18,
  flyDelay = 6,
  flyDuration = 30,
  borderWidth = 5,
  borderColor = "#ffffff",
  glowIntensity = 0.8,
  bgDim = 0.4,
  bgVideoOpacity = 1,
  objectFit = "cover",
  volume = 1,
  muted = 0,
  startFrom = 0,
  videoWidth = 1920,
  videoHeight = 1080,
}) => {
  const frame = useCurrentFrame();
  const { width: vw, height: vh } = useVideoConfig();
  const width = vw || videoWidth;
  const height = vh || videoHeight;

  // 阶段时间点
  const shrinkEnd = shrinkDuration;
  const flyStart = shrinkEnd + flyDelay;
  const flyEnd = flyStart + flyDuration;

  // 起始超大半径（能覆盖整个画面）
  const maxRadius = Math.sqrt(width * width + height * height) / 2 + 200;

  // 收缩阶段进度
  const shrinkProgress = interpolate(frame, [0, shrinkDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // 飞行阶段进度
  const flyProgress = interpolate(frame, [flyStart, flyEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  // 计算当前圆心和半径
  // scale 模式：起始在画面中心；crop 模式：也是中心，但内部视频偏移逻辑不同
  const startX = width / 2;
  const startY = height / 2;
  const endX1 = (focusX / 100) * width;
  const endY1 = (focusY / 100) * height;
  const endX2 = (finalX / 100) * width;
  const endY2 = (finalY / 100) * height;

  const shrinkX = interpolate(shrinkProgress, [0, 1], [startX, endX1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shrinkY = interpolate(shrinkProgress, [0, 1], [startY, endY1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shrinkR = interpolate(shrinkProgress, [0, 1], [maxRadius, focusRadius], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const flyX = interpolate(flyProgress, [0, 1], [endX1, endX2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const flyY = interpolate(flyProgress, [0, 1], [endY1, endY2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const flyR = interpolate(flyProgress, [0, 1], [focusRadius, finalRadius], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const inShrink = frame < shrinkEnd;
  const curX = inShrink ? shrinkX : flyX;
  const curY = inShrink ? shrinkY : flyY;
  const curRadius = inShrink ? shrinkR : flyR;

  // 背景变暗进度
  const dimProgress = interpolate(frame, [2, shrinkDuration + 4], [0, bgDim], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 圆环弹性出现
  const ringSpring = spring({
    frame: frame - 2,
    fps: 30,
    config: { damping: 10, mass: 0.4, stiffness: 200 },
  });
  const ringScale = 0.8 + 0.2 * Math.min(1, ringSpring);

  const safeSrc = React.useMemo(() => {
    if (!src) return src;
    if (/^(https?:|data:|blob:)/i.test(src)) return src;
    const [p, query] = src.split("?");
    const encodedPath = p
      .split("/")
      .map((seg) => encodeURI(seg))
      .join("/");
    return query ? `${encodedPath}?${query}` : encodedPath;
  }, [src]);

  if (!src) {
    return (
      <AbsoluteFill style={{ background: "#111" }}>
        <div style={{ color: "#888", fontSize: 14, textAlign: "center", paddingTop: 100 }}>
          请设置视频 src
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* 底层全屏视频（变暗） */}
      <div style={{ position: "absolute", inset: 0, opacity: bgVideoOpacity }}>
        <OffthreadVideo
          startFrom={Math.floor(startFrom * 30)}
          src={safeSrc}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          volume={muted ? 0 : volume}
          muted={muted > 0}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `rgba(0,0,0,${dimProgress})`,
            pointerEvents: "none",
          }}
        />
      </div>

      {/* 上层圆形高亮视频 */}
      <div
        style={{
          position: "absolute",
          left: curX - curRadius,
          top: curY - curRadius,
          width: curRadius * 2,
          height: curRadius * 2,
          borderRadius: "50%",
          overflow: "hidden",
          boxShadow:
            glowIntensity > 0
              ? `0 0 ${40 * glowIntensity}px rgba(255,255,255,${0.3 * glowIntensity}), 0 0 ${
                  80 * glowIntensity
                }px rgba(255,255,255,${0.15 * glowIntensity})`
              : "none",
        }}
      >
        {contentMode === "scale" ? (
          // 缩放模式：视频跟着圆形一起等比缩小
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <OffthreadVideo
              startFrom={Math.floor(startFrom * 30)}
              src={safeSrc}
              style={{
                width: "100%",
                height: "100%",
                objectFit,
              }}
              volume={0}
              muted
            />
          </div>
        ) : (
          // 裁剪模式：视频尺寸=画布尺寸，通过偏移让聚焦点对齐圆心
          <div
            style={{
              position: "absolute",
              width,
              height,
              left: -(curX - curRadius),
              top: -(curY - curRadius),
            }}
          >
            <OffthreadVideo
              startFrom={Math.floor(startFrom * 30)}
              src={safeSrc}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              volume={0}
              muted
            />
          </div>
        )}

        {/* 白色圆环边框 */}
        {borderWidth > 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `${borderWidth}px solid ${borderColor}`,
              boxShadow: `inset 0 0 ${borderWidth * 2}px rgba(255,255,255,0.2)`,
              transform: `scale(${ringScale})`,
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};
