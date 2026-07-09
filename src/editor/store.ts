import { create } from "zustand";
import type { PlayerRef } from "@remotion/player";
import { nanoid } from "./nanoid";
import type { Clip, Track } from "./types";
import { getComponentDef } from "./registry";

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const DEFAULT_FPS = 30;
const DEFAULT_TOTAL = 600; // 20s @ 30fps（预览时间线的最小长度，导出时会用真实最大值）
const DEFAULT_PX_PER_FRAME = 4;

function makeTrack(name: string, kind: Track["kind"]): Track {
  return { id: nanoid(), name, kind, clipIds: [], locked: false, muted: false };
}

/**
 * 计算所有 clip 中最大的 end (start + duration)。
 * 用于导出视频的真实时长（不包含尾部黑屏）。
 */
export function computeMaxEnd(
  tracks: Track[],
  clips: Record<string, Clip>,
): number {
  let max = 0;
  for (const track of tracks) {
    for (const cid of track.clipIds) {
      const c = clips[cid];
      if (c) max = Math.max(max, c.start + c.duration);
    }
  }
  return max;
}

/**
 * 预览时间线长度：至少 DEFAULT_TOTAL，否则跟随 clip 最大结束时间。
 */
function recomputePreviewDuration(
  tracks: Track[],
  clips: Record<string, Clip>,
): number {
  return Math.max(DEFAULT_TOTAL, computeMaxEnd(tracks, clips));
}

// Player 实例引用（module-level，不参与渲染，避免无限更新）
let playerRef: PlayerRef | null = null;
export function setPlayerRef(ref: PlayerRef | null): void {
  playerRef = ref;
}
export function getPlayerRef(): PlayerRef | null {
  return playerRef;
}

interface EditorStore {
  tracks: Track[];
  clips: Record<string, Clip>;
  selectedClipId: string | null;
  currentFrame: number;
  isPlaying: boolean;
  totalDuration: number;
  fps: number;
  width: number;
  height: number;
  pxPerFrame: number;

  addClipFromRegistry: (componentKey: string) => void;
  addClip: (componentKey: string, trackId: string) => void;
  removeClip: (clipId: string) => void;
  selectClip: (clipId: string | null) => void;
  updateClipProps: (clipId: string, props: Record<string, unknown>) => void;
  updateClipTiming: (clipId: string, start: number, duration: number) => void;
  moveClipToTrack: (clipId: string, targetTrackId: string) => void;
  addTrack: (kind?: Track["kind"]) => void;
  removeTrack: (trackId: string) => void;
  /** 在指定帧位置将 clip 分割成两段（剪映风格 split） */
  splitClip: (clipId: string, atFrame: number) => void;
  /** 向前裁剪：删除 clip 从开始到 toFrame 的部分（保留后半段） */
  trimClipStart: (clipId: string, toFrame: number) => void;
  /** 向后裁剪：删除 clip 从 fromFrame 到结尾的部分（保留前半段） */
  trimClipEnd: (clipId: string, fromFrame: number) => void;

  // 播放控制（操作 Player 实例）
  setCurrentFrame: (frame: number) => void;
  onFrameChange: (frame: number) => void; // 由 Player frameupdate 事件回调
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  onPlayStateChanged: (playing: boolean) => void;

  setPxPerFrame: (px: number) => void;
  toggleTrackLocked: (trackId: string) => void;
  toggleTrackMuted: (trackId: string) => void;
  /** 设置画布尺寸（同时影响预览和导出） */
  setCanvasSize: (width: number, height: number) => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  tracks: [
    makeTrack("Background", "background"),
    makeTrack("Overlay 1", "overlay"),
  ],
  clips: {},
  selectedClipId: null,
  currentFrame: 0,
  isPlaying: false,
  totalDuration: DEFAULT_TOTAL,
  fps: DEFAULT_FPS,
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  pxPerFrame: DEFAULT_PX_PER_FRAME,

  addClipFromRegistry: (componentKey) => {
    const state = get();
    const target =
      state.tracks.find((t) => t.kind === "overlay") ?? state.tracks[0];
    if (!target) return;
    get().addClip(componentKey, target.id);
  },

  addClip: (componentKey, trackId) => {
    const def = getComponentDef(componentKey);
    if (!def) return;
    const state = get();
    const track = state.tracks.find((t) => t.id === trackId);
    if (!track) return;

    let start = 0;
    for (const cid of track.clipIds) {
      const c = state.clips[cid];
      if (c && c.start + c.duration > start) start = c.start + c.duration;
    }

    const clip: Clip = {
      id: nanoid(),
      componentKey,
      name: def.name,
      start,
      duration: def.defaultDuration,
      props: { ...def.defaultProps },
    };

    set((s) => {
      const newTracks = s.tracks.map((t) =>
        t.id === trackId ? { ...t, clipIds: [...t.clipIds, clip.id] } : t,
      );
      const newClips = { ...s.clips, [clip.id]: clip };
      return {
        clips: newClips,
        tracks: newTracks,
        totalDuration: recomputePreviewDuration(newTracks, newClips),
        selectedClipId: clip.id,
      };
    });
  },

  removeClip: (clipId) =>
    set((s) => {
      const { [clipId]: _removed, ...rest } = s.clips;
      void _removed;
      const newTracks = s.tracks.map((t) => ({
        ...t,
        clipIds: t.clipIds.filter((id) => id !== clipId),
      }));
      return {
        clips: rest,
        tracks: newTracks,
        selectedClipId:
          s.selectedClipId === clipId ? null : s.selectedClipId,
        totalDuration: recomputePreviewDuration(newTracks, rest),
      };
    }),

  selectClip: (clipId) => set({ selectedClipId: clipId }),

  updateClipProps: (clipId, props) =>
    set((s) => {
      const c = s.clips[clipId];
      if (!c) return s;
      return {
        clips: {
          ...s.clips,
          [clipId]: { ...c, props: { ...c.props, ...props } },
        },
      };
    }),

  updateClipTiming: (clipId, start, duration) =>
    set((s) => {
      const c = s.clips[clipId];
      if (!c) return s;
      const next = {
        ...c,
        start: Math.max(0, start),
        duration: Math.max(1, duration),
      };
      const newClips = { ...s.clips, [clipId]: next };
      return {
        clips: newClips,
        totalDuration: recomputePreviewDuration(s.tracks, newClips),
      };
    }),

  moveClipToTrack: (clipId, targetTrackId) =>
    set((s) => {
      const newTracks = s.tracks.map((t) => {
        if (t.id === targetTrackId) {
          return t.clipIds.includes(clipId)
            ? t
            : { ...t, clipIds: [...t.clipIds, clipId] };
        }
        return { ...t, clipIds: t.clipIds.filter((id) => id !== clipId) };
      });
      return {
        tracks: newTracks,
        totalDuration: recomputePreviewDuration(newTracks, s.clips),
      };
    }),

  splitClip: (clipId, atFrame) =>
    set((s) => {
      const c = s.clips[clipId];
      if (!c) return s;
      const end = c.start + c.duration;
      // 分割点必须严格落在 clip 内部
      if (atFrame <= c.start || atFrame >= end) return s;

      // 找到 clip 所在轨道
      const track = s.tracks.find((t) => t.clipIds.includes(clipId));
      if (!track) return s;

      const origSourceStart = c.sourceStart ?? 0;
      const leftDuration = atFrame - c.start;

      // 原 clip 缩短为前半段（sourceStart 不变，组件仍从原内容起点播放）
      const leftClip: Clip = { ...c, duration: leftDuration };

      // 新 clip 为后半段：组件内容接着前半段，sourceStart 偏移 leftDuration
      const rightClip: Clip = {
        ...c,
        id: nanoid(),
        start: atFrame,
        duration: end - atFrame,
        sourceStart: origSourceStart + leftDuration,
        props: JSON.parse(JSON.stringify(c.props)) as Record<string, unknown>,
      };

      const newClips = {
        ...s.clips,
        [clipId]: leftClip,
        [rightClip.id]: rightClip,
      };

      // 在轨道 clipIds 中，原 clip 之后插入新 clip
      const newTracks = s.tracks.map((t) => {
        if (t.id !== track.id) return t;
        const idx = t.clipIds.indexOf(clipId);
        const nextIds = [...t.clipIds];
        nextIds.splice(idx + 1, 0, rightClip.id);
        return { ...t, clipIds: nextIds };
      });

      return {
        clips: newClips,
        tracks: newTracks,
        selectedClipId: rightClip.id,
        totalDuration: recomputePreviewDuration(newTracks, newClips),
      };
    }),

  trimClipStart: (clipId, toFrame) =>
    set((s) => {
      const c = s.clips[clipId];
      if (!c) return s;
      const end = c.start + c.duration;
      // toFrame 必须严格落在 clip 内部（保留至少 1 帧的后半段）
      if (toFrame <= c.start || toFrame >= end) return s;
      // 裁掉前半段后，组件内容源要相应偏移，避免后半段从头播放
      const origSourceStart = c.sourceStart ?? 0;
      const next: Clip = {
        ...c,
        start: toFrame,
        duration: end - toFrame,
        sourceStart: origSourceStart + (toFrame - c.start),
      };
      const newClips = { ...s.clips, [clipId]: next };
      return {
        clips: newClips,
        totalDuration: recomputePreviewDuration(s.tracks, newClips),
      };
    }),

  trimClipEnd: (clipId, fromFrame) =>
    set((s) => {
      const c = s.clips[clipId];
      if (!c) return s;
      const end = c.start + c.duration;
      // fromFrame 必须严格落在 clip 内部（保留至少 1 帧的前半段）
      if (fromFrame <= c.start || fromFrame >= end) return s;
      // 只裁掉尾部，前半段内容从原起点播放，sourceStart 不变
      const next: Clip = {
        ...c,
        duration: fromFrame - c.start,
      };
      const newClips = { ...s.clips, [clipId]: next };
      return {
        clips: newClips,
        totalDuration: recomputePreviewDuration(s.tracks, newClips),
      };
    }),

  addTrack: (kind = "overlay") =>
    set((s) => ({
      tracks: [
        ...s.tracks,
        makeTrack(
          `${kind === "background" ? "Background" : "Overlay"} ${s.tracks.length + 1}`,
          kind,
        ),
      ],
    })),

  removeTrack: (trackId) =>
    set((s) => {
      const track = s.tracks.find((t) => t.id === trackId);
      if (!track) return s;
      const newClips = { ...s.clips };
      for (const cid of track.clipIds) delete newClips[cid];
      const newTracks = s.tracks.filter((t) => t.id !== trackId);
      return {
        tracks: newTracks,
        clips: newClips,
        selectedClipId: track.clipIds.includes(s.selectedClipId ?? "")
          ? null
          : s.selectedClipId,
        totalDuration: recomputePreviewDuration(newTracks, newClips),
      };
    }),

  // seek：调用 Player 实例
  setCurrentFrame: (frame) => {
    const total = get().totalDuration;
    const clamped = Math.max(0, Math.min(total - 1, Math.round(frame)));
    if (playerRef) {
      playerRef.seekTo(clamped);
    } else {
      // Player 未挂载时直接更新状态（initial mount）
      set({ currentFrame: clamped });
    }
  },

  // 由 Player frameupdate 事件回调（不调 seekTo，避免循环）
  onFrameChange: (frame) => set({ currentFrame: frame }),

  play: () => {
    playerRef?.play();
  },
  pause: () => {
    playerRef?.pause();
  },
  togglePlay: () => {
    if (!playerRef) return;
    if (playerRef.isPlaying()) {
      playerRef.pause();
    } else {
      playerRef.play();
    }
  },
  onPlayStateChanged: (playing) => set({ isPlaying: playing }),

  setPxPerFrame: (px) => set({ pxPerFrame: Math.max(0.5, Math.min(20, px)) }),

  toggleTrackLocked: (trackId) =>
    set((s) => ({
      tracks: s.tracks.map((t) =>
        t.id === trackId ? { ...t, locked: !t.locked } : t,
      ),
    })),

  toggleTrackMuted: (trackId) =>
    set((s) => ({
      tracks: s.tracks.map((t) =>
        t.id === trackId ? { ...t, muted: !t.muted } : t,
      ),
    })),

  setCanvasSize: (width, height) =>
    set({
      width: Math.max(2, Math.round(width)),
      height: Math.max(2, Math.round(height)),
    }),
}));
