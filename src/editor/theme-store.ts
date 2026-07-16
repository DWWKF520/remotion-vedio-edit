import { create } from "zustand";

export type Theme = "light" | "dark";

const STORAGE_KEY = "video-editor-theme";
const TIMELINE_HEIGHT_KEY = "video-editor-timeline-height";

/** 时间轴高度上下限（VS Code 底栏风格的伸缩范围） */
export const TIMELINE_MIN_HEIGHT = 120;
export const TIMELINE_COLLAPSED_HEIGHT = 120;
export const TIMELINE_DEFAULT_HEIGHT = 300;

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* ignore */
  }
  // 默认深色（专业剪辑护眼风）
  return "dark";
}

function getInitialTimelineHeight(): number {
  if (typeof window === "undefined") return TIMELINE_DEFAULT_HEIGHT;
  try {
    const raw = localStorage.getItem(TIMELINE_HEIGHT_KEY);
    if (raw) {
      const h = parseInt(raw, 10);
      if (!Number.isNaN(h)) {
        const maxH = Math.floor(window.innerHeight * 0.8);
        return Math.max(TIMELINE_MIN_HEIGHT, Math.min(maxH, h));
      }
    }
  } catch {
    /* ignore */
  }
  return TIMELINE_DEFAULT_HEIGHT;
}

function clampTimelineHeight(h: number): number {
  if (typeof window === "undefined") return Math.max(TIMELINE_MIN_HEIGHT, h);
  const maxH = Math.floor(window.innerHeight * 0.8);
  return Math.max(TIMELINE_MIN_HEIGHT, Math.min(maxH, h));
}

function applyThemeToDom(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

interface ThemeStore {
  theme: Theme;
  /** 左侧素材面板是否收起 */
  leftCollapsed: boolean;
  /** 右侧属性面板是否收起 */
  rightCollapsed: boolean;
  /** 时间轴高度（像素，VS Code 底栏风格可伸缩） */
  timelineHeight: number;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  toggleLeft: () => void;
  toggleRight: () => void;
  setTimelineHeight: (h: number) => void;
}

// 初始化时同步一次 DOM（与 index.html 内联脚本保持一致）
const initialTheme = getInitialTheme();
applyThemeToDom(initialTheme);

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: initialTheme,
  leftCollapsed: false,
  rightCollapsed: false,
  timelineHeight: getInitialTimelineHeight(),
  toggleTheme: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    applyThemeToDom(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    set({ theme: next });
  },
  setTheme: (t) => {
    applyThemeToDom(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
    set({ theme: t });
  },
  toggleLeft: () => set((s) => ({ leftCollapsed: !s.leftCollapsed })),
  toggleRight: () => set((s) => ({ rightCollapsed: !s.rightCollapsed })),
  setTimelineHeight: (h) => {
    const clamped = clampTimelineHeight(h);
    try {
      localStorage.setItem(TIMELINE_HEIGHT_KEY, String(clamped));
    } catch {
      /* ignore */
    }
    set({ timelineHeight: clamped });
  },
}));
