import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * 人物开口说话组件
 *
 * 使用 public/uploads 下的 4 张人物图片，按帧循环切换，模拟嘴巴开合的说话效果：
 * - (1).png / (2).png / (3).png / 生成说话图片做动画.png
 * - 可配置每张图停留的帧数（嘴巴切换速度）
 * - 可配置图片缩放、位置、圆角
 * - 可配置循环播放顺序（用逗号分隔 1-4 的序号）
 * - 可选入场淡入 / 缩放动画
 */

const IMAGE_BASE = "/uploads/生成说话图片做动画";

// 4 张图片的实际文件名（带空格和中文，需 encodeURI 编码）
// 序号：4 = 无编号的 "生成说话图片做动画.png"，1/2/3 = 带 (n) 后缀
const IMAGE_FILES: Record<1 | 2 | 3 | 4, string> = {
  1: `${IMAGE_BASE} (1).png`,
  2: `${IMAGE_BASE} (2).png`,
  3: `${IMAGE_BASE} (3).png`,
  4: `${IMAGE_BASE}.png`,
};

function parseOrder(order: string): Array<1 | 2 | 3 | 4> {
  const result: Array<1 | 2 | 3 | 4> = [];
  const parts = order
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const p of parts) {
    const n = Number(p);
    if (n === 1 || n === 2 || n === 3 || n === 4) {
      result.push(n);
    }
  }
  // 兜底：若解析为空，使用默认顺序 1,2,3,4
  return result.length > 0 ? result : [1, 2, 3, 4];
}

export const SpeakingPerson: React.FC<{
  /** 嘴巴切换间隔（帧），越小越快。建议 4-12 帧 */
  readonly switchInterval?: number;
  /** 图片缩放（0.1 - 2.0） */
  readonly imageScale?: number;
  /** 水平位置百分比（0-100，50=居中） */
  readonly positionX?: number;
  /** 垂直位置百分比（0-100，50=居中） */
  readonly positionY?: number;
  /** 圆角（像素） */
  readonly borderRadius?: number;
  /** 背景色（transparent=透明） */
  readonly backgroundColor?: string;
  /** 是否显示投影 1/0 */
  readonly showShadow?: number;
  /** 循环顺序，逗号分隔 1-4，如 "1,2,3,4" 或 "4,1,3,2" */
  readonly cycleOrder?: string;
  /** 入场动画 1/0（淡入+缩放） */
  readonly enterAnimation?: number;
  /** 视频宽度（兜底） */
  readonly videoWidth?: number;
  /** 视频高度（兜底） */
  readonly videoHeight?: number;
}> = ({
  switchInterval = 6,
  imageScale = 1,
  positionX = 50,
  positionY = 50,
  borderRadius = 0,
  backgroundColor = "#1a1a22",
  showShadow = 1,
  cycleOrder = "1,2,3,4",
  enterAnimation = 1,
  videoWidth = 1920,
  videoHeight = 1080,
}) => {
  const frame = useCurrentFrame();
  const vcfg = useVideoConfig();

  const width = vcfg.width || videoWidth;
  const height = vcfg.height || videoHeight;

  const interval = Math.max(1, Math.floor(switchInterval));
  const order = useMemo(() => parseOrder(cycleOrder), [cycleOrder]);

  // 当前帧对应的图片序号
  const currentIndex = Math.floor(frame / interval) % order.length;
  const currentSlot = order[currentIndex];
  const imageSrc = useMemo(
    () => encodeURI(IMAGE_FILES[currentSlot]),
    [currentSlot],
  );

  // 入场动画：缩放 + 淡入
  const enterProgress = enterAnimation
    ? spring({
        frame,
        fps: vcfg.fps,
        config: { damping: 200 },
      })
    : 1;
  const enterScale = interpolate(enterProgress, [0, 1], [0.92, 1]);
  const enterOpacity = interpolate(enterProgress, [0, 1], [0, 1]);

  // 图片自适应缩放：保持原图比例，撑到画面高度的 80%
  const maxH = height * 0.85 * imageScale;
  const maxW = width * 0.85 * imageScale;

  return (
    <AbsoluteFill
      style={{
        background:
          backgroundColor === "transparent" ? "transparent" : backgroundColor,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: `${positionX}%`,
          top: `${positionY}%`,
          transform: `translate(-50%, -50%) scale(${enterScale})`,
          opacity: enterOpacity,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Img
          src={imageSrc}
          alt="speaking-person"
          style={{
            maxWidth: maxW,
            maxHeight: maxH,
            width: "auto",
            height: "auto",
            objectFit: "contain",
            borderRadius,
            filter: showShadow
              ? "drop-shadow(0 12px 32px rgba(0,0,0,0.35))"
              : "none",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
