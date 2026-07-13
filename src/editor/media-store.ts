/**
 * 媒体库（IndexedDB 存储视频/图片等本地文件）
 *
 * 设计：
 * - 纯前端，不依赖后端
 * - IndexedDB 存文件 Blob（视频体积大，不能放 localStorage）
 * - localStorage 存元数据（id、文件名、大小、类型、时长、缩略图等）
 * - 读取时用 URL.createObjectURL(blob) 生成 blob: URL 给 <Video> 使用
 *
 * 为什么不用 File System Access API？
 *   - 兼容性差（Safari 不支持）
 *   - 权限弹窗用户体验不好
 *   - IndexedDB + Blob 兼容性最好，Remotion 的 <Video> 支持 blob URL
 */

import { nanoid } from "./nanoid";

export interface MediaItem {
  id: string;
  name: string;
  type: "video" | "image" | "audio";
  mimeType: string;
  size: number; // bytes
  duration?: number; // 秒（视频/音频）
  width?: number;
  height?: number;
  createdAt: number;
  /** blob: URL，运行时生成（持久化时不存，加载时再生成） */
  url?: string;
}

const DB_NAME = "video-editor-media";
const DB_VERSION = 1;
const STORE_NAME = "files";
const META_KEY = "video-editor-meta";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function loadMeta(): MediaItem[] {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as MediaItem[]) : [];
  } catch {
    return [];
  }
}

function saveMeta(items: MediaItem[]): void {
  try {
    // 只存元数据，不存 URL
    const clean = items.map((m) => {
      const { url: _url, ...rest } = m;
      void _url;
      return rest;
    });
    localStorage.setItem(META_KEY, JSON.stringify(clean));
  } catch {
    // 忽略
  }
}

/**
 * 存文件到 IndexedDB 并返回元数据
 */
export async function addMediaFile(file: File): Promise<MediaItem> {
  const id = nanoid();
  const db = await openDB();

  // 存 Blob
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put({ id, blob: file, name: file.name });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  // 探测类型
  const type = file.type.startsWith("video/")
    ? "video"
    : file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("audio/")
        ? "audio"
        : "video"; // 默认当视频

  const meta: MediaItem = {
    id,
    name: file.name,
    type,
    mimeType: file.type,
    size: file.size,
    createdAt: Date.now(),
  };

  // 对于视频/图片，探测分辨率和时长
  if (type === "video" || type === "audio") {
    const probe = await probeMedia(file, type as "video" | "audio");
    if (probe.duration) meta.duration = probe.duration;
    if (probe.width) meta.width = probe.width;
    if (probe.height) meta.height = probe.height;
  } else if (type === "image") {
    const probe = await probeImage(file);
    if (probe.width) meta.width = probe.width;
    if (probe.height) meta.height = probe.height;
  }

  // 更新元数据列表
  const list = loadMeta();
  list.unshift(meta);
  saveMeta(list);

  return meta;
}

/**
 * 获取文件 Blob 并生成 blob: URL
 */
export async function getMediaUrl(id: string): Promise<string | null> {
  try {
    const db = await openDB();
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        const val = req.result as { blob: Blob } | undefined;
        resolve(val?.blob ?? null);
      };
      req.onerror = () => reject(req.error);
    });
    if (!blob) return null;
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/**
 * 删除媒体
 */
export async function deleteMedia(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // 忽略
  }
  const list = loadMeta().filter((m) => m.id !== id);
  saveMeta(list);
}

/**
 * 列出所有媒体元数据
 */
export function listMedia(): MediaItem[] {
  return loadMeta();
}

/**
 * 探测视频/音频的时长和分辨率
 */
function probeMedia(
  file: File,
  kind: "video" | "audio",
): Promise<{ duration?: number; width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el =
      kind === "video" ? document.createElement("video") : document.createElement("audio");
    el.src = url;
    el.muted = true;
    el.preload = "metadata";

    let resolved = false;
    const done = (data: { duration?: number; width?: number; height?: number }) => {
      if (resolved) return;
      resolved = true;
      URL.revokeObjectURL(url);
      resolve(data);
    };

    el.addEventListener("loadedmetadata", () => {
      done({
        duration: el.duration,
        width: kind === "video" ? (el as HTMLVideoElement).videoWidth : undefined,
        height: kind === "video" ? (el as HTMLVideoElement).videoHeight : undefined,
      });
    });
    el.addEventListener("error", () => done({}));
    // 超时 5s
    setTimeout(() => done({}), 5000);
  });
}

/**
 * 探测图片分辨率
 */
function probeImage(file: File): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({});
    };
    img.src = url;
  });
}
