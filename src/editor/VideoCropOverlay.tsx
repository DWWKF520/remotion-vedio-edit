import React, { useCallback, useEffect, useRef, useState } from "react";

interface VideoCropOverlayProps {
  canvasWidth: number;
  canvasHeight: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  videoWidth: number;
  videoHeight: number;
  positionX: number;
  positionY: number;
  scale: number;
  fit: string;
  onChange: (patch: { positionX?: number; positionY?: number; scale?: number }) => void;
}

/**
 * 视频裁剪拖动叠加层（剪映风格）
 *
 * - 在预览区内拖拽视频，调整 positionX / positionY
 * - 滚轮缩放，保持比例
 * - 显示视频边界框和当前位置/缩放信息
 * - 双击重置
 */
export const VideoCropOverlay: React.FC<VideoCropOverlayProps> = ({
  canvasWidth,
  canvasHeight,
  containerRef,
  videoWidth,
  videoHeight,
  positionX,
  positionY,
  scale,
  fit,
  onChange,
}) => {
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; origX: number; origY: number } | null>(null);

  const getScale = useCallback(() => {
    const el = containerRef.current;
    if (!el) return 1;
    return el.clientWidth / canvasWidth;
  }, [containerRef, canvasWidth]);

  const clientToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const s = canvasWidth / el.clientWidth;
      return { x: (clientX - rect.left) * s, y: (clientY - rect.top) * s };
    },
    [containerRef, canvasWidth],
  );

  // 计算视频在容器中的实际像素尺寸（按 fit 模式）
  const canvasRatio = canvasWidth / canvasHeight;
  const videoRatio = videoWidth / videoHeight || 1;
  let baseWidth = canvasWidth;
  let baseHeight = canvasHeight;
  if (fit === "contain") {
    if (videoRatio > canvasRatio) {
      baseHeight = canvasWidth / videoRatio;
    } else {
      baseWidth = canvasHeight * videoRatio;
    }
  } else if (fit === "cover") {
    if (videoRatio > canvasRatio) {
      baseWidth = canvasHeight * videoRatio;
    } else {
      baseHeight = canvasWidth / videoRatio;
    }
  }

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const { x, y } = clientToCanvas(e.clientX, e.clientY);
      setDragging(true);
      dragStartRef.current = { mouseX: x, mouseY: y, origX: positionX, origY: positionY };
    },
    [clientToCanvas, positionX, positionY],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.02 : 0.02;
      const nextScale = Math.max(0.1, Math.min(3, scale + delta));
      onChange({ scale: Math.round(nextScale * 100) / 100 });
    },
    [scale, onChange],
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const start = dragStartRef.current;
      if (!start) return;
      const { x, y } = clientToCanvas(e.clientX, e.clientY);
      const dx = ((x - start.mouseX) / canvasWidth) * 100;
      const dy = ((y - start.mouseY) / canvasHeight) * 100;
      onChange({
        positionX: Math.round((start.origX + dx) * 10) / 10,
        positionY: Math.round((start.origY + dy) * 10) / 10,
      });
    };
    const onUp = () => {
      setDragging(false);
      dragStartRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, clientToCanvas, canvasWidth, canvasHeight, onChange]);

  const s = getScale();
  const vw = baseWidth * scale * s;
  const vh = baseHeight * scale * s;
  const cx = canvasWidth * (positionX / 100) * s;
  const cy = canvasHeight * (positionY / 100) * s;

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-0 cursor-move"
      style={{ userSelect: "none" }}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      onDoubleClick={() => onChange({ positionX: 50, positionY: 50, scale: 1 })}
      title="拖拽移动，滚轮缩放，双击重置"
    >
      {/* 视频边界框提示 */}
      <div
        className="pointer-events-none absolute border-2 border-dashed border-[#007aff]/70"
        style={{
          left: cx - vw / 2,
          top: cy - vh / 2,
          width: vw,
          height: vh,
        }}
      />

      {/* 信息标签 */}
      <div className="pointer-events-none absolute right-2 top-2 rounded bg-black/60 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
        X:{positionX.toFixed(1)} Y:{positionY.toFixed(1)} S:{scale.toFixed(2)}
      </div>
    </div>
  );
};
