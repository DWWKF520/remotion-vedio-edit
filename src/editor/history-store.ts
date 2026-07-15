import { create } from "zustand";
import { useEditorStore, recomputePreviewDuration } from "./store";
import type { Clip, Track } from "./types";

/**
 * 全局 Undo / Redo 历史栈。
 *
 * 设计要点：
 * - 只追踪 `tracks` 与 `clips`（核心数据），忽略 `currentFrame` / `selectedClipId` /
 *   `isPlaying` 等瞬态 UI 状态。
 * - 通过 zustand subscribe 监听 editor store 变化，配合 200ms 防抖把一次拖拽过程中
 *   产生的多次 set 调用合并为一条历史记录。
 * - 在 undo/redo 写回 editor 时设置 suppressPush 标志，避免回写触发订阅再压栈。
 */

interface Snapshot {
  tracks: Track[];
  clips: Record<string, Clip>;
}

interface HistoryStore {
  past: Snapshot[];
  future: Snapshot[];
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

const MAX_HISTORY = 50;
const DEBOUNCE_MS = 200;

// 回写 editor 时为 true，订阅监听到变化直接 return，不再压栈
let suppressPush = false;
// 一次连续变更（拖拽）的起始状态，仅在首次变化时捕获
let pendingPrev: Snapshot | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function cloneSnapshot(s: {
  tracks: Track[];
  clips: Record<string, Clip>;
}): Snapshot {
  return {
    tracks: JSON.parse(JSON.stringify(s.tracks)) as Track[],
    clips: JSON.parse(JSON.stringify(s.clips)) as Record<string, Clip>,
  };
}

/** 将快照写回 editor store，并在同步批处理期间抑制订阅压栈 */
function applySnapshot(snap: Snapshot): void {
  suppressPush = true;
  const cur = useEditorStore.getState();
  const selectedStillExists =
    !!cur.selectedClipId && !!snap.clips[cur.selectedClipId];
  useEditorStore.setState({
    tracks: JSON.parse(JSON.stringify(snap.tracks)) as Track[],
    clips: JSON.parse(JSON.stringify(snap.clips)) as Record<string, Clip>,
    totalDuration: recomputePreviewDuration(snap.tracks, snap.clips),
    selectedClipId: selectedStillExists ? cur.selectedClipId : null,
  });
  // 当前同步批处理结束后恢复监听
  setTimeout(() => {
    suppressPush = false;
  }, 0);
}

function pushHistory(prev: Snapshot): void {
  const cur = useHistoryStore.getState();
  const past = [...cur.past, prev].slice(-MAX_HISTORY);
  useHistoryStore.setState({
    past,
    future: [],
    canUndo: true,
    canRedo: false,
  });
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return;
    const present = cloneSnapshot(useEditorStore.getState());
    const newPast = past.slice(0, -1);
    const prev = past[past.length - 1]!;
    applySnapshot(prev);
    set({
      past: newPast,
      future: [present, ...future],
      canUndo: newPast.length > 0,
      canRedo: true,
    });
  },

  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return;
    const present = cloneSnapshot(useEditorStore.getState());
    const [next, ...restFuture] = future;
    applySnapshot(next);
    set({
      past: [...past, present],
      future: restFuture,
      canUndo: true,
      canRedo: restFuture.length > 0,
    });
  },
}));

let initialized = false;
/**
 * 初始化历史监听（幂等，多次调用安全）。
 * 应在编辑器挂载后调用一次。
 */
export function initHistory(): void {
  if (initialized) return;
  initialized = true;

  useEditorStore.subscribe((state, prevState) => {
    if (state.tracks === prevState.tracks && state.clips === prevState.clips) {
      return;
    }
    if (suppressPush) return;

    // 仅在连续变更的首次捕获起始状态，后续拖拽帧复用同一个起点
    if (!pendingPrev) {
      pendingPrev = cloneSnapshot(prevState);
    }

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const prev = pendingPrev;
      pendingPrev = null;
      debounceTimer = null;
      if (prev) pushHistory(prev);
    }, DEBOUNCE_MS);
  });
}
