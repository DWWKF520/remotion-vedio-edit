import React, { useCallback, useEffect, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { CompositionRenderer } from "./renderer";
import { setPlayerRef, useEditorStore } from "./store";
import { MaskEditorOverlay } from "./MaskEditorOverlay";
import { VideoCropOverlay } from "./VideoCropOverlay";
import type { VideoEffectItem, MaskEffectParams } from "../components/video-effects/VideoEffectStack/types";

/**
 * 预览区：用 @remotion/player 的 <Player> 渲染 CompositionRenderer。
 * - playerRef 通过 module-level 引用暴露给 store，用于 play/pause/seek
 * - frameupdate 事件回调更新 store.currentFrame，驱动时间线播放头
 * - 播放/暂停/seek 由编辑器自己的 UI 控制（见 editor.tsx）
 *
 * 顶部带画幅比例选择器，切换后预览与导出均按该比例。
 */

/** 画幅预设：label 显示，w/h 为导出像素尺寸，比例由 w/h 推导 */
const ASPECT_PRESETS: {
  label: string;
  w: number;
  h: number;
}[] = [
  { label: "16:9 横屏", w: 1920, h: 1080 },
  { label: "9:16 竖屏", w: 1080, h: 1920 },
  { label: "1:1 方形", w: 1080, h: 1080 },
  { label: "4:3 传统", w: 1440, h: 1080 },
  { label: "3:4 竖版", w: 1080, h: 1440 },
  { label: "4:5 人像", w: 1080, h: 1350 },
  { label: "21:9 影院", w: 2560, h: 1080 },
];

export const Preview: React.FC = React.memo(() => {
  const width = useEditorStore((s) => s.width);
  const height = useEditorStore((s) => s.height);
  const totalDuration = useEditorStore((s) => s.totalDuration);
  const fps = useEditorStore((s) => s.fps);
  const onFrameChange = useEditorStore((s) => s.onFrameChange);
  const onPlayStateChanged = useEditorStore((s) => s.onPlayStateChanged);
  const setCanvasSize = useEditorStore((s) => s.setCanvasSize);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const clips = useEditorStore((s) => s.clips);
  const updateClipProps = useEditorStore((s) => s.updateClipProps);

  const selectedClip = selectedClipId ? clips[selectedClipId] : null;
  const isCircleShrink = selectedClip?.componentKey === "circleShrinkTransition";
  const isVideoClip = selectedClip?.componentKey === "videoClip";

  // 查找当前 clip 效果栈中的蒙版效果（用于预览区编辑）
  const effects = Array.isArray(selectedClip?.props.effects)
    ? (selectedClip?.props.effects as VideoEffectItem[])
    : [];
  const maskEffect = effects.find((e) => e.type === "mask");
  const maskEffectId = maskEffect?.id ?? null;
  const maskParams = ((maskEffect?.params as unknown) as MaskEffectParams) ?? { masks: [] };

  const containerRef = useRef<HTMLDivElement>(null);

  const ref = useRef<PlayerRef>(null);
  const callbacksRef = useRef({ onFrameChange, onPlayStateChanged });
  callbacksRef.current = { onFrameChange, onPlayStateChanged };

  // 把 playerRef 注入 store
  useEffect(() => {
    setPlayerRef(ref.current);
    return () => setPlayerRef(null);
  }, []);

  // 订阅 Player 事件，把帧/播放状态变化同步到 store
  useEffect(() => {
    const p = ref.current;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) => {
      callbacksRef.current.onFrameChange(e.detail.frame);
    };
    const onPlay = () => callbacksRef.current.onPlayStateChanged(true);
    const onPause = () => callbacksRef.current.onPlayStateChanged(false);
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    return () => {
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
    };
  }, []); // empty deps — stable event subscription

  // 当前预设值（用于下拉显示），通过宽高匹配
  const currentPresetValue = `${width}x${height}`;
  const matchedPreset = ASPECT_PRESETS.find(
    (p) => `${p.w}x${p.h}` === currentPresetValue,
  );

  // 竖屏画幅时高度优先，横屏时宽度优先
  const isPortrait = height > width;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[#e5e5ea]/40 dark:bg-black">
      {/* 顶部工具栏：画幅比例选择 */}
      <div className="flex h-8 flex-shrink-0 items-center gap-2 border-b border-[var(--separator)] bg-[var(--surface-overlay)] px-3 dark:border-[var(--separator)] dark:bg-[#1c1c1e]/60">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8e8e93] dark:text-[#8e8e93]">
          画幅
        </span>
        <select
          value={matchedPreset ? currentPresetValue : "custom"}
          onChange={(e) => {
            const preset = ASPECT_PRESETS.find(
              (p) => `${p.w}x${p.h}` === e.target.value,
            );
            if (preset) setCanvasSize(preset.w, preset.h);
          }}
          className="rounded-md border border-[var(--separator-opaque)] bg-[var(--surface-sunken)] px-2 py-0.5 text-[11px] text-[#3c3c43] outline-none transition-colors focus:border-[#007aff] dark:border-[var(--separator-opaque)] dark:bg-black/40 dark:text-[#f5f5f7] dark:focus:border-[#0a84ff]"
          title="切换画幅比例（预览和导出均使用）"
        >
          {ASPECT_PRESETS.map((p) => (
            <option key={`${p.w}x${p.h}`} value={`${p.w}x${p.h}`}>
              {p.label} · {p.w}×{p.h}
            </option>
          ))}
          {!matchedPreset && (
            <option value="custom">
              自定义 · {width}×{height}
            </option>
          )}
        </select>
        <span className="text-[10px] text-[#8e8e93] dark:text-[#8e8e93]">
          导出将按此尺寸渲染
        </span>
      </div>

      {/* 预览画布 */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-2">
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-lg border-2 border-[#007aff]/20 shadow-lg shadow-black/10 ring-1 ring-[var(--separator)] dark:shadow-black/40 dark:ring-[var(--separator)]"
          style={{
            aspectRatio: `${width} / ${height}`,
            maxHeight: "100%",
            maxWidth: "100%",
            height: isPortrait ? "100%" : "auto",
            width: isPortrait ? "auto" : "100%",
          }}
        >
          <Player
            ref={ref}
            component={CompositionRenderer}
            durationInFrames={totalDuration}
            fps={fps}
            compositionWidth={width}
            compositionHeight={height}
            style={{ width: "100%", height: "100%" }}
            controls={false}
            loop={false}
            autoPlay={false}
            clickToPlay={false}
          />

          {/* 圆形转场交互控制点 */}
          {isCircleShrink && selectedClip && (
            <CircleHandleOverlay
              clipProps={selectedClip.props as Record<string, number | string>}
              canvasWidth={width}
              canvasHeight={height}
              containerRef={containerRef}
              onUpdate={(patch) => {
                if (selectedClipId) {
                  updateClipProps(selectedClipId, patch);
                }
              }}
            />
          )}

          {/* 蒙版编辑器叠加层 */}
          {isVideoClip && selectedClipId && maskEffectId && (
            <MaskEditorOverlay
              masks={maskParams.masks || []}
              canvasWidth={width}
              canvasHeight={height}
              containerRef={containerRef}
              onChange={(nextMasks) => {
                const nextEffects = effects.map((e) =>
                  e.id === maskEffectId
                    ? { ...e, params: { ...e.params, masks: nextMasks } }
                    : e,
                );
                updateClipProps(selectedClipId, { effects: nextEffects });
              }}
            />
          )}

          {/* 视频拖动裁剪层 */}
          {isVideoClip && selectedClip && selectedClipId && !maskEffectId && (
            <VideoCropOverlay
              canvasWidth={width}
              canvasHeight={height}
              containerRef={containerRef}
              videoWidth={Number(selectedClip.props.videoWidth ?? 1920)}
              videoHeight={Number(selectedClip.props.videoHeight ?? 1080)}
              positionX={Number(selectedClip.props.positionX ?? 50)}
              positionY={Number(selectedClip.props.positionY ?? 50)}
              scale={Number(selectedClip.props.scale ?? 1)}
              fit={String(selectedClip.props.fit ?? "contain")}
              onChange={(patch) => updateClipProps(selectedClipId, patch)}
            />
          )}
        </div>
      </div>
    </div>
  );
});

/**
 * 圆形转场控制点叠加层
 * 选中 circleShrinkTransition 时显示在预览区上，可拖动调整位置和大小
 * 调整的是 finalX / finalY / finalRadius（最终状态）
 */
const CircleHandleOverlay: React.FC<{
  clipProps: Record<string, number | string>;
  canvasWidth: number;
  canvasHeight: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onUpdate: (patch: Record<string, number>) => void;
}> = ({ clipProps, canvasWidth, canvasHeight, containerRef, onUpdate }) => {
  const [dragging, setDragging] = useState<"move" | "resize" | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    origX: number;
    origY: number;
    origRadius: number;
  } | null>(null);

  // 最终圆心坐标（百分比转像素）
  const finalX = (Number(clipProps.finalX) ?? 12) / 100;
  const finalY = (Number(clipProps.finalY) ?? 82) / 100;
  const finalRadius = Number(clipProps.finalRadius) ?? 100;
  const shape = String(clipProps.shape ?? "circle") as "circle" | "square" | "rect" | "rounded";
  const rectAspect = Number(clipProps.rectAspect ?? 1.78);
  const cornerRadius = Number(clipProps.cornerRadius ?? 24);

  // 根据形状计算控制框宽高和圆角
  const shapeHalfW = shape === "rect" ? finalRadius * rectAspect : finalRadius;
  const shapeHalfH = finalRadius;
  const shapeBorderRadius =
    shape === "circle" ? "50%"
    : shape === "rounded" ? `${cornerRadius}px`
    : "0px";

  // 将 overlay 容器对齐到 container 的 content box，与 Player 渲染区域完全一致
  const [box, setBox] = useState({ left: 0, top: 0, width: 0, height: 0 });
  useEffect(() => {
    const updateBox = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const borderLeft = parseFloat(style.borderLeftWidth) || 0;
      const borderTop = parseFloat(style.borderTopWidth) || 0;
      const borderRight = parseFloat(style.borderRightWidth) || 0;
      const borderBottom = parseFloat(style.borderBottomWidth) || 0;
      setBox({
        left: borderLeft,
        top: borderTop,
        width: rect.width - borderLeft - borderRight,
        height: rect.height - borderTop - borderBottom,
      });
    };
    updateBox();
    window.addEventListener("resize", updateBox);
    return () => window.removeEventListener("resize", updateBox);
  }, [containerRef]);

  const scaleX = box.width / canvasWidth;
  const scaleY = box.height / canvasHeight;

  // 把鼠标坐标换算成画布坐标（基于 content box）
  const clientToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const overlay = overlayRef.current;
      if (!overlay) return { x: 0, y: 0 };
      const rect = overlay.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / box.width) * canvasWidth,
        y: ((clientY - rect.top) / box.height) * canvasHeight,
      };
    },
    [box, canvasWidth, canvasHeight],
  );

  const handleMoveStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging("move");
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        origX: finalX * canvasWidth,
        origY: finalY * canvasHeight,
        origRadius: finalRadius,
      };
    },
    [finalX, finalY, finalRadius, canvasWidth, canvasHeight],
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging("resize");
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        origX: finalX * canvasWidth,
        origY: finalY * canvasHeight,
        origRadius: finalRadius,
      };
    },
    [finalX, finalY, finalRadius, canvasWidth, canvasHeight],
  );

  // 全局鼠标移动/松开
  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      const start = dragStartRef.current;
      if (!start) return;
      const mouseCanvas = clientToCanvas(e.clientX, e.clientY);
      const dx = mouseCanvas.x - start.origX;
      const dy = mouseCanvas.y - start.origY;

      if (dragging === "move") {
        const newX = Math.max(0, Math.min(100, ((start.origX + dx) / canvasWidth) * 100));
        const newY = Math.max(0, Math.min(100, ((start.origY + dy) / canvasHeight) * 100));
        onUpdate({ finalX: Math.round(newX * 10) / 10, finalY: Math.round(newY * 10) / 10 });
      } else if (dragging === "resize") {
        const dist = Math.sqrt(dx * dx + dy * dy);
        const newR = Math.max(20, Math.min(Math.max(canvasWidth, canvasHeight) / 2, dist));
        onUpdate({ finalRadius: Math.round(newR) });
      }
    };

    const onUp = () => {
      setDragging(null);
      dragStartRef.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, canvasWidth, canvasHeight, clientToCanvas, onUpdate]);

  // 控制框在 content box 中的像素位置（纯 px，避免 calc 百分比精度问题）
  const centerXPx = finalX * canvasWidth * scaleX;
  const centerYPx = finalY * canvasHeight * scaleY;
  const shapeHalfWPx = shapeHalfW * scaleX;
  const shapeHalfHPx = shapeHalfH * scaleY;

  return (
    <div
      ref={overlayRef}
      className="pointer-events-none absolute z-10"
      style={{
        userSelect: "none",
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
      }}
    >
      {/* 形状控制框 */}
      <div
        className="pointer-events-auto absolute border-2 border-dashed border-[#007aff] cursor-move"
        style={{
          left: centerXPx - shapeHalfWPx,
          top: centerYPx - shapeHalfHPx,
          width: shapeHalfWPx * 2,
          height: shapeHalfHPx * 2,
          borderRadius: shapeBorderRadius,
          boxShadow: "0 0 0 1px rgba(0,122,255,0.3)",
        }}
        onMouseDown={handleMoveStart}
      >
        {/* 右下角缩放手柄 */}
        <div
          className="pointer-events-auto absolute -right-1.5 -bottom-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#007aff] cursor-nwse-resize shadow-sm"
          onMouseDown={handleResizeStart}
          title="拖动调整大小"
        />
        {/* 圆心标记 */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#007aff]"
        />
      </div>

      {/* 提示文字 */}
      <div
        className="pointer-events-none absolute rounded bg-[#007aff] px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm"
        style={{
          left: centerXPx - shapeHalfWPx,
          top: centerYPx - shapeHalfHPx - 22,
        }}
      >
        {shape} · {Math.round(finalX * 100)}%, {Math.round(finalY * 100)}% · r={Math.round(finalRadius)}
      </div>
    </div>
  );
};
