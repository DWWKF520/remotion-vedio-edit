import React, { useCallback, useEffect, useState } from "react";
import type { Mask, MaskShape } from "../components/video-effects/VideoEffectStack/types";
import { nanoid } from "./nanoid";

type DrawTool = MaskShape | "select";
type DragMode = "move" | "resize-nw" | "resize-ne" | "resize-sw" | "resize-se" | "resize-n" | "resize-s" | "resize-w" | "resize-e" | null;

interface DragState {
  mode: Exclude<DragMode, null>;
  startX: number;
  startY: number;
  origMask: Mask;
}

interface MaskEditorOverlayProps {
  masks: Mask[];
  onChange: (masks: Mask[]) => void;
  canvasWidth: number;
  canvasHeight: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const HANDLE_SIZE = 8;
const MIN_MASK_SIZE = 20;

/**
 * 蒙版编辑器叠加层
 *
 * 功能：
 * - 矩形 / 圆形 / 自定义 三种蒙版绘制工具
 * - 框选创建、拖拽移动、边缘/角点调整大小
 * - 羽化、透明度、反相参数调节
 * - 撤销 / 重做（Ctrl+Z / Ctrl+Y）
 * - 删除选中蒙版（Delete / Backspace）
 */
export const MaskEditorOverlay: React.FC<MaskEditorOverlayProps> = ({
  masks,
  onChange,
  canvasWidth,
  canvasHeight,
  containerRef,
}) => {
  const [tool, setTool] = useState<DrawTool>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Mask[][]>([masks]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [drawingBox, setDrawingBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // 历史栈：当外部 masks 变化时，如果和当前历史记录不一致则追加
  useEffect(() => {
    const current = history[historyIndex];
    if (JSON.stringify(current) !== JSON.stringify(masks)) {
      const next = history.slice(0, historyIndex + 1);
      next.push(masks);
      setHistory(next);
      setHistoryIndex(next.length - 1);
    }
  }, [masks]);

  const commit = useCallback(
    (nextMasks: Mask[]) => {
      onChange(nextMasks);
    },
    [onChange],
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const idx = historyIndex - 1;
      setHistoryIndex(idx);
      onChange(history[idx]);
      setSelectedId(null);
    }
  }, [history, historyIndex, onChange]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const idx = historyIndex + 1;
      setHistoryIndex(idx);
      onChange(history[idx]);
      setSelectedId(null);
    }
  }, [history, historyIndex, onChange]);

  const getScale = useCallback((): { scaleX: number; scaleY: number } => {
    const el = containerRef.current;
    if (!el) return { scaleX: 1, scaleY: 1 };
    return {
      scaleX: el.clientWidth / canvasWidth,
      scaleY: el.clientHeight / canvasHeight,
    };
  }, [containerRef, canvasWidth, canvasHeight]);

  const clientToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const borderLeft = parseFloat(style.borderLeftWidth) || 0;
      const borderTop = parseFloat(style.borderTopWidth) || 0;
      const scaleX = canvasWidth / el.clientWidth;
      const scaleY = canvasHeight / el.clientHeight;
      return {
        x: (clientX - rect.left - borderLeft) * scaleX,
        y: (clientY - rect.top - borderTop) * scaleY,
      };
    },
    [containerRef, canvasWidth, canvasHeight],
  );

  const hitTest = useCallback(
    (x: number, y: number): { mask: Mask; mode: DragMode } | null => {
      // 从后往前命中测试（后渲染的在上方）
      for (let i = masks.length - 1; i >= 0; i--) {
        const m = masks[i];
        const handle = getHandleAt(x, y, m);
        if (handle) {
          return { mask: m, mode: handle };
        }
        if (pointInMask(x, y, m)) {
          return { mask: m, mode: "move" };
        }
      }
      return null;
    },
    [masks],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const { x, y } = clientToCanvas(e.clientX, e.clientY);

      if (tool === "select") {
        const hit = hitTest(x, y);
        if (hit) {
          setSelectedId(hit.mask.id);
          setDragState({
            mode: hit.mode || "move",
            startX: x,
            startY: y,
            origMask: hit.mask,
          });
        } else {
          setSelectedId(null);
          // 在 select 模式下点击空白处也允许框选创建新蒙版
          setDrawingBox({ x, y, width: 0, height: 0 });
        }
      } else {
        // 绘制模式
        setSelectedId(null);
        setDrawingBox({ x, y, width: 0, height: 0 });
      }
    },
    [tool, clientToCanvas, hitTest],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const { x, y } = clientToCanvas(e.clientX, e.clientY);

      if (drawingBox) {
        const next = normalizeBox(drawingBox.x, drawingBox.y, x, y, canvasWidth, canvasHeight);
        setDrawingBox(next);
        return;
      }

      if (dragState) {
        const dx = x - dragState.startX;
        const dy = y - dragState.startY;
        const updated = updateMaskByDrag(dragState.origMask, dragState.mode, dx, dy, canvasWidth, canvasHeight);
        const nextMasks = masks.map((m) => (m.id === updated.id ? updated : m));
        commit(nextMasks);
      }
    },
    [drawingBox, dragState, masks, commit, clientToCanvas, canvasWidth, canvasHeight],
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (drawingBox) {
        const { x, y } = clientToCanvas(e.clientX, e.clientY);
        const box = normalizeBox(drawingBox.x, drawingBox.y, x, y, canvasWidth, canvasHeight);
        if (box.width >= MIN_MASK_SIZE && box.height >= MIN_MASK_SIZE) {
          const newMask: Mask = createMaskFromBox(tool === "select" ? "rect" : tool, box);
          const next = [...masks, newMask];
          commit(next);
          setSelectedId(newMask.id);
          setTool("select");
        }
        setDrawingBox(null);
      }
      setDragState(null);
    },
    [drawingBox, tool, masks, commit, clientToCanvas, canvasWidth, canvasHeight],
  );

  useEffect(() => {
    if (!dragState && !drawingBox) return;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, drawingBox, handleMouseMove, handleMouseUp]);

  // 快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        const next = masks.filter((m) => m.id !== selectedId);
        commit(next);
        setSelectedId(null);
      } else if (e.key === "Escape") {
        setSelectedId(null);
        setDrawingBox(null);
        setDragState(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [masks, selectedId, undo, redo, commit]);

  const selectedMask = masks.find((m) => m.id === selectedId) || null;

  const updateSelectedParam = useCallback(
    (patch: Partial<Mask>) => {
      if (!selectedId) return;
      const next = masks.map((m) => (m.id === selectedId ? { ...m, ...patch } : m));
      commit(next);
    },
    [masks, selectedId, commit],
  );

  const { scaleX, scaleY } = getScale();

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-10"
      style={{ userSelect: "none" }}
      onMouseDown={handleMouseDown}
    >
      {/* 蒙版视觉预览（半透明覆盖层） */}
      {masks.map((m) => (
        <MaskPreview key={m.id} mask={m} scaleX={scaleX} scaleY={scaleY} selected={m.id === selectedId} />
      ))}

      {/* 绘制中的框 */}
      {drawingBox && (
        <div
          className="pointer-events-none absolute border-2 border-dashed border-[#007aff] bg-[#007aff]/10"
          style={boxToStyle(drawingBox, scaleX, scaleY)}
        />
      )}

      {/* 选中蒙版的调整手柄 */}
      {selectedMask && <MaskHandles mask={selectedMask} scaleX={scaleX} scaleY={scaleY} />}

      {/* 工具栏 */}
      <MaskToolbar
        tool={tool}
        onToolChange={setTool}
        selectedMask={selectedMask}
        onParamChange={updateSelectedParam}
        onDelete={() => {
          if (selectedId) {
            const next = masks.filter((m) => m.id !== selectedId);
            commit(next);
            setSelectedId(null);
          }
        }}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={undo}
        onRedo={redo}
      />
    </div>
  );
};

/** 单个蒙版视觉预览 */
const MaskPreview: React.FC<{
  mask: Mask;
  scaleX: number;
  scaleY: number;
  selected: boolean;
}> = ({ mask, scaleX, scaleY, selected }) => {
  const style = boxToStyle(mask, scaleX, scaleY);
  const opacity = mask.opacity ?? 1;

  return (
    <div
      className={`pointer-events-auto absolute overflow-hidden ${selected ? "ring-1 ring-[#007aff]" : ""}`}
      style={{
        ...style,
        background: `rgba(0,122,255,${0.15 * opacity})`,
        boxShadow: `inset 0 0 0 1px rgba(0,122,255,${0.6 * opacity})`,
        borderRadius: mask.type === "circle" ? "50%" : (mask.cornerRadius ?? 0) * scaleX,
      }}
      title={`${mask.type} mask`}
    >
      <svg width={style.width} height={style.height} className="absolute inset-0 opacity-0">
        <defs>
          <filter id={`preview-feather-${mask.id}`}>
            <feGaussianBlur stdDeviation={(mask.feather ?? 0) / 2} />
          </filter>
        </defs>
      </svg>
    </div>
  );
};

/** 调整手柄 */
const MaskHandles: React.FC<{ mask: Mask; scaleX: number; scaleY: number }> = ({ mask, scaleX, scaleY }) => {
  const x = mask.x * scaleX;
  const y = mask.y * scaleY;
  const w = mask.width * scaleX;
  const h = mask.height * scaleY;
  const s = HANDLE_SIZE;
  const hs = s / 2;

  const handles = [
    { pos: { left: x - hs, top: y - hs }, cursor: "nwse-resize", key: "resize-nw" },
    { pos: { left: x + w / 2 - hs, top: y - hs }, cursor: "ns-resize", key: "resize-n" },
    { pos: { left: x + w - hs, top: y - hs }, cursor: "nesw-resize", key: "resize-ne" },
    { pos: { left: x + w - hs, top: y + h / 2 - hs }, cursor: "ew-resize", key: "resize-e" },
    { pos: { left: x + w - hs, top: y + h - hs }, cursor: "nwse-resize", key: "resize-se" },
    { pos: { left: x + w / 2 - hs, top: y + h - hs }, cursor: "ns-resize", key: "resize-s" },
    { pos: { left: x - hs, top: y + h - hs }, cursor: "nesw-resize", key: "resize-sw" },
    { pos: { left: x - hs, top: y + h / 2 - hs }, cursor: "ew-resize", key: "resize-w" },
  ];

  return (
    <>
      {handles.map((h) => (
        <div
          key={h.key}
          className="pointer-events-auto absolute z-20 rounded-full border-2 border-white bg-[#007aff] shadow-sm"
          style={{
            left: h.pos.left,
            top: h.pos.top,
            width: s,
            height: s,
            cursor: h.cursor as React.CSSProperties["cursor"],
          }}
          data-handle={h.key}
        />
      ))}
    </>
  );
};

/** 工具栏 */
const MaskToolbar: React.FC<{
  tool: DrawTool;
  onToolChange: (t: DrawTool) => void;
  selectedMask: Mask | null;
  onParamChange: (patch: Partial<Mask>) => void;
  onDelete: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}> = ({ tool, onToolChange, selectedMask, onParamChange, onDelete, canUndo, canRedo, onUndo, onRedo }) => {
  const tools: { key: DrawTool; label: string; icon: React.ReactNode }[] = [
    { key: "select", label: "选择", icon: <CursorIcon /> },
    { key: "rect", label: "矩形", icon: <RectIcon /> },
    { key: "circle", label: "圆形", icon: <CircleIcon /> },
    { key: "custom", label: "自定义", icon: <PathIcon /> },
  ];

  return (
    <div
      className="pointer-events-auto absolute left-3 top-3 flex flex-col gap-2 rounded-xl border border-[var(--separator-opaque)] bg-[var(--surface-overlay)]/95 p-2 shadow-lg backdrop-blur-sm dark:border-[var(--separator-opaque)] dark:bg-[#1c1c1e]/95"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* 绘制工具 */}
      <div className="flex flex-col gap-1">
        {tools.map((t) => (
          <button
            key={t.key}
            onClick={() => onToolChange(t.key)}
            title={t.label}
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-[11px] transition-colors ${
              tool === t.key
                ? "bg-[#007aff] text-white"
                : "text-[#8e8e93] hover:bg-[var(--surface-sunken)] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]"
            }`}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className="h-px w-full bg-[var(--separator-opaque)]" />

      {/* 撤销/重做 */}
      <div className="flex flex-col gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="撤销 Ctrl+Z"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#8e8e93] transition-colors hover:bg-[var(--surface-sunken)] disabled:opacity-30 dark:hover:text-[#f5f5f7]"
        >
          <UndoIcon />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="重做 Ctrl+Y"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#8e8e93] transition-colors hover:bg-[var(--surface-sunken)] disabled:opacity-30 dark:hover:text-[#f5f5f7]"
        >
          <RedoIcon />
        </button>
      </div>

      <div className="h-px w-full bg-[var(--separator-opaque)]" />

      {/* 选中蒙版参数 */}
      {selectedMask && (
        <div className="flex flex-col gap-2 px-0.5">
          <div>
            <label className="mb-0.5 block text-[8px] uppercase tracking-wide text-[#8e8e93]">羽化</label>
            <input
              type="number"
              min={0}
              max={200}
              value={selectedMask.feather}
              onChange={(e) => onParamChange({ feather: Number(e.target.value) })}
              className="w-full rounded border border-[var(--separator-opaque)] bg-[var(--surface-sunken)] px-1 py-0.5 text-[10px] outline-none focus:border-[#007aff] dark:border-[var(--separator-opaque)] dark:bg-black/40"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[8px] uppercase tracking-wide text-[#8e8e93]">透明度</label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={selectedMask.opacity}
              onChange={(e) => onParamChange({ opacity: Number(e.target.value) })}
              className="w-full rounded border border-[var(--separator-opaque)] bg-[var(--surface-sunken)] px-1 py-0.5 text-[10px] outline-none focus:border-[#007aff] dark:border-[var(--separator-opaque)] dark:bg-black/40"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-1 text-[10px] text-[#1d1d1f] dark:text-[#f5f5f7]">
            <input
              type="checkbox"
              checked={selectedMask.invert}
              onChange={(e) => onParamChange({ invert: e.target.checked })}
              className="h-3 w-3"
            />
            反相
          </label>
          {selectedMask.type === "rect" && (
            <div>
              <label className="mb-0.5 block text-[8px] uppercase tracking-wide text-[#8e8e93]">圆角</label>
              <input
                type="number"
                min={0}
                value={selectedMask.cornerRadius ?? 0}
                onChange={(e) => onParamChange({ cornerRadius: Number(e.target.value) })}
                className="w-full rounded border border-[var(--separator-opaque)] bg-[var(--surface-sunken)] px-1 py-0.5 text-[10px] outline-none focus:border-[#007aff] dark:border-[var(--separator-opaque)] dark:bg-black/40"
              />
            </div>
          )}
          <button
            onClick={onDelete}
            className="mt-1 flex items-center justify-center gap-1 rounded bg-[#ff3b30]/10 px-1.5 py-1 text-[10px] text-[#ff3b30] transition-colors hover:bg-[#ff3b30]/20"
          >
            删除
          </button>
        </div>
      )}
    </div>
  );
};

// ---- helpers ----

function normalizeBox(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  canvasWidth: number,
  canvasHeight: number,
): { x: number; y: number; width: number; height: number } {
  const x = Math.max(0, Math.min(canvasWidth, Math.min(startX, endX)));
  const y = Math.max(0, Math.min(canvasHeight, Math.min(startY, endY)));
  const maxX = Math.max(0, Math.min(canvasWidth, Math.max(startX, endX)));
  const maxY = Math.max(0, Math.min(canvasHeight, Math.max(startY, endY)));
  return { x, y, width: maxX - x, height: maxY - y };
}

function createMaskFromBox(type: MaskShape, box: { x: number; y: number; width: number; height: number }): Mask {
  return {
    id: nanoid(),
    type,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    feather: 0,
    opacity: 1,
    invert: false,
    cornerRadius: type === "rect" ? 0 : undefined,
    path: type === "custom" ? defaultCustomPath(box.width, box.height) : undefined,
  };
}

function defaultCustomPath(w: number, h: number): string {
  // 默认星形路径
  const cx = w / 2;
  const cy = h / 2;
  const outer = Math.min(w, h) / 2;
  const inner = outer * 0.4;
  let d = "";
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    d += (i === 0 ? "M" : "L") + ` ${x} ${y}`;
  }
  return d + " Z";
}

function boxToStyle(
  box: { x: number; y: number; width: number; height: number },
  scaleX: number,
  scaleY: number,
): React.CSSProperties {
  return {
    left: box.x * scaleX,
    top: box.y * scaleY,
    width: box.width * scaleX,
    height: box.height * scaleY,
  };
}

function pointInMask(x: number, y: number, mask: Mask): boolean {
  const { x: mx, y: my, width, height, type } = mask;
  if (x < mx || x > mx + width || y < my || y > my + height) return false;
  if (type === "circle") {
    const cx = mx + width / 2;
    const cy = my + height / 2;
    const rx = width / 2;
    const ry = height / 2;
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  }
  return true;
}

function getHandleAt(x: number, y: number, mask: Mask): DragMode {
  const { x: mx, y: my, width: w, height: h } = mask;
  const s = HANDLE_SIZE / 2; // 像素容差，已经缩放过？这里用画布像素
  const near = (v: number, target: number) => Math.abs(v - target) <= s;

  const onLeft = near(x, mx);
  const onRight = near(x, mx + w);
  const onTop = near(y, my);
  const onBottom = near(y, my + h);

  if (onTop && onLeft) return "resize-nw";
  if (onTop && onRight) return "resize-ne";
  if (onBottom && onLeft) return "resize-sw";
  if (onBottom && onRight) return "resize-se";
  if (onTop) return "resize-n";
  if (onBottom) return "resize-s";
  if (onLeft) return "resize-w";
  if (onRight) return "resize-e";
  return null;
}

function updateMaskByDrag(mask: Mask, mode: Exclude<DragMode, null>, dx: number, dy: number, canvasWidth: number, canvasHeight: number): Mask {
  const next = { ...mask };
  const min = MIN_MASK_SIZE;

  switch (mode) {
    case "move": {
      next.x = Math.max(0, Math.min(canvasWidth - mask.width, mask.x + dx));
      next.y = Math.max(0, Math.min(canvasHeight - mask.height, mask.y + dy));
      break;
    }
    case "resize-nw": {
      const newX = Math.min(mask.x + mask.width - min, mask.x + dx);
      const newY = Math.min(mask.y + mask.height - min, mask.y + dy);
      next.width = mask.x + mask.width - newX;
      next.height = mask.y + mask.height - newY;
      next.x = newX;
      next.y = newY;
      break;
    }
    case "resize-ne": {
      const newY = Math.min(mask.y + mask.height - min, mask.y + dy);
      next.width = Math.max(min, mask.width + dx);
      next.height = mask.y + mask.height - newY;
      next.y = newY;
      break;
    }
    case "resize-sw": {
      const newX = Math.min(mask.x + mask.width - min, mask.x + dx);
      next.width = mask.x + mask.width - newX;
      next.height = Math.max(min, mask.height + dy);
      next.x = newX;
      break;
    }
    case "resize-se": {
      next.width = Math.max(min, mask.width + dx);
      next.height = Math.max(min, mask.height + dy);
      break;
    }
    case "resize-n": {
      const newY = Math.min(mask.y + mask.height - min, mask.y + dy);
      next.height = mask.y + mask.height - newY;
      next.y = newY;
      break;
    }
    case "resize-s": {
      next.height = Math.max(min, mask.height + dy);
      break;
    }
    case "resize-w": {
      const newX = Math.min(mask.x + mask.width - min, mask.x + dx);
      next.width = mask.x + mask.width - newX;
      next.x = newX;
      break;
    }
    case "resize-e": {
      next.width = Math.max(min, mask.width + dx);
      break;
    }
  }

  // 边界约束
  next.x = Math.max(0, Math.min(canvasWidth - next.width, next.x));
  next.y = Math.max(0, Math.min(canvasHeight - next.height, next.y));
  next.width = Math.max(min, Math.min(canvasWidth - next.x, next.width));
  next.height = Math.max(min, Math.min(canvasHeight - next.y, next.height));

  return next;
}

// ---- icons ----
function CursorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36z" />
    </svg>
  );
}
function RectIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="14" rx="2" />
    </svg>
  );
}
function CircleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
function PathIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
function UndoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
    </svg>
  );
}
function RedoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13" />
    </svg>
  );
}
