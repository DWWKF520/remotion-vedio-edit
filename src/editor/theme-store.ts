import { create } from "zustand";

export type Theme = "light" | "dark";

const STORAGE_KEY = "video-editor-theme";

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
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  toggleLeft: () => void;
  toggleRight: () => void;
}

// 初始化时同步一次 DOM（与 index.html 内联脚本保持一致）
const initialTheme = getInitialTheme();
applyThemeToDom(initialTheme);

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: initialTheme,
  leftCollapsed: false,
  rightCollapsed: false,
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
}));
