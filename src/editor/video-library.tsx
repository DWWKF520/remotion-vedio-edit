import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore } from "./store";

/**
 * 媒体库面板：
 * - 上传本地视频/图片到 public/uploads/（通过 /api/upload/media）
 * - 视频/图片 切换 tab
 * - 显示已上传媒体列表
 * - 点击「添加到轨道」：视频加到 Background，图片加到 Overlay（固定 5s）
 * - 支持删除
 */

interface MediaItem {
  name: string;
  fileName: string;
  url: string;
  type: "video" | "image";
  size: number;
  mtime: number;
  duration?: number;
  width?: number;
  height?: number;
}

type MediaTab = "video" | "image";

export const VideoLibrary: React.FC = () => {
  const [tab, setTab] = useState<MediaTab>("video");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addVideoClip = useEditorStore((s) => s.addVideoClip);
  const addImageClip = useEditorStore((s) => s.addImageClip);
  const fps = useEditorStore((s) => s.fps);

  const loadList = useCallback(async () => {
    try {
      const res = await fetch("/api/upload/list");
      if (!res.ok) return;
      const data = (await res.json()) as { files: MediaItem[] };
      setItems(data.files || []);
    } catch {
      // 离线时静默
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const filteredItems = items.filter((m) => m.type === tab);

  const handleFiles = useCallback(
    async (fileList: FileList | File[], targetType: MediaTab) => {
      const files = Array.from(fileList).filter((f) => {
        if (targetType === "video") {
          return (
            f.type.startsWith("video/") ||
            /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(f.name)
          );
        }
        return (
          f.type.startsWith("image/") ||
          /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(f.name)
        );
      });
      if (files.length === 0) {
        alert(targetType === "video" ? "请选择视频文件" : "请选择图片文件");
        return;
      }

      for (const file of files) {
        setLoading(file.name);
        try {
          const formData = new FormData();
          formData.append("file", file, file.name);
          const res = await fetch("/api/upload/media", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt || "上传失败");
          }
          await loadList();
        } catch (e) {
          alert(`上传 ${file.name} 失败：${e instanceof Error ? e.message : String(e)}`);
        } finally {
          setLoading(null);
        }
      }
    },
    [loadList],
  );

  const handleDelete = useCallback(
    async (url: string, name: string) => {
      if (!confirm(`确定删除「${name}」吗？删除后无法恢复。`)) return;
      try {
        const res = await fetch("/api/upload/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (res.ok) {
          await loadList();
        }
      } catch (e) {
        alert(`删除失败：${e instanceof Error ? e.message : String(e)}`);
      }
    },
    [loadList],
  );

  const handleAddToTimeline = useCallback(
    (item: MediaItem) => {
      if (item.type === "video") {
        const durationFrames = item.duration
          ? Math.ceil(item.duration * fps)
          : 300;
        addVideoClip(item.url, durationFrames, item.name);
      } else {
        addImageClip(item.url, item.name);
      }
    },
    [addVideoClip, addImageClip, fps],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) {
        handleFiles(e.dataTransfer.files, tab);
      }
    },
    [handleFiles, tab],
  );

  const acceptType = tab === "video" ? "video/*" : "image/*";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* 子 tab：视频 / 图片 */}
      <div className="flex flex-shrink-0 border-b border-[var(--separator)] px-2 dark:border-[var(--separator)]">
        <SubTabBtn
          active={tab === "video"}
          onClick={() => setTab("video")}
          label="视频"
        />
        <SubTabBtn
          active={tab === "image"}
          onClick={() => setTab("image")}
          label="图片"
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2.5">
        {/* 上传区域 */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 transition-all ${
            isDragging
              ? "border-[#007aff] bg-[#007aff]/8 dark:border-[#0a84ff] dark:bg-[#0a84ff]/10"
              : "border-[#007aff]/30 bg-[#007aff]/5 hover:border-[#007aff]/50 hover:bg-[#007aff]/8 dark:border-[#0a84ff]/30 dark:bg-[#0a84ff]/8 dark:hover:bg-[#0a84ff]/12"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptType}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) {
                handleFiles(e.target.files, tab);
                e.target.value = "";
              }
            }}
          />
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform group-hover:scale-110 ${
              isDragging ? "scale-110" : ""
            }`}
            style={{ background: "linear-gradient(135deg, #007aff33, #007aff14)" }}
          >
            {tab === "video" ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#007aff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="dark:stroke-[#4da2ff]"
              >
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#007aff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="dark:stroke-[#4da2ff]"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            )}
          </div>
          <div className="text-[11px] font-semibold text-[#007aff] dark:text-[#4da2ff]">
            {loading ? `上传中：${loading}...` : `点击或拖拽${tab === "video" ? "视频" : "图片"}`}
          </div>
          <div className="text-[9px] text-[#8e8e93] dark:text-[#8e8e93]">
            {tab === "video"
              ? "支持 MP4 · WebM · MOV · MKV"
              : "支持 JPG · PNG · GIF · WebP"}
          </div>
        </div>

        {/* 媒体列表 */}
        {filteredItems.length === 0 && !loading && (
          <div className="py-7 text-center text-xs text-[#8e8e93] dark:text-[#8e8e93]">
            暂无{tab === "video" ? "视频" : "图片"}
            <br />
            <span className="text-[10px]">点击上方按钮选择本地文件</span>
          </div>
        )}

        {filteredItems.map((item) => (
          <MediaItemCard
            key={item.url}
            item={item}
            onAdd={() => handleAddToTimeline(item)}
            onDelete={() => handleDelete(item.url, item.name)}
          />
        ))}
      </div>
    </div>
  );
};

const SubTabBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
}> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`relative px-3 py-2 text-xs font-medium transition-colors ${
      active
        ? "text-[#007aff] dark:text-[#4da2ff]"
        : "text-[#8e8e93] hover:text-[#1d1d1f] dark:text-[#8e8e93] dark:hover:text-[#f5f5f7]"
    }`}
  >
    {label}
    {active && (
      <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-[#007aff] dark:bg-[#0a84ff]" />
    )}
  </button>
);

/** 单个媒体卡片 */
const MediaItemCard: React.FC<{
  item: MediaItem;
  onAdd: () => void;
  onDelete: () => void;
}> = ({ item, onAdd, onDelete }) => {
  const [thumb, setThumb] = useState<string | null>(null);

  // 生成缩略图
  useEffect(() => {
    let cancelled = false;

    if (item.type === "image") {
      // 图片直接用本身作缩略图
      setThumb(item.url);
      return;
    }

    // 视频：截第一帧
    const video = document.createElement("video");
    video.src = item.url;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "metadata";

    const onLoaded = () => {
      if (cancelled) return;
      video.currentTime = Math.min(0.5, (video.duration || 1) * 0.1);
    };
    const onSeeked = () => {
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      const w = video.videoWidth || 320;
      const h = video.videoHeight || 180;
      const ratio = Math.min(160 / w, 90 / h, 1);
      canvas.width = Math.max(1, Math.floor(w * ratio));
      canvas.height = Math.max(1, Math.floor(h * ratio));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setThumb(canvas.toDataURL("image/jpeg", 0.7));
    };

    video.addEventListener("loadeddata", onLoaded);
    video.addEventListener("seeked", onSeeked);

    return () => {
      cancelled = true;
      video.removeEventListener("loadeddata", onLoaded);
      video.removeEventListener("seeked", onSeeked);
      video.src = "";
    };
  }, [item.url, item.type]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return "";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-[var(--separator)] bg-[var(--surface)]/50 transition-all hover:-translate-y-0.5 hover:border-[#007aff]/30 hover:bg-[#007aff]/5 hover:shadow-md dark:border-[var(--separator)] dark:bg-white/5 dark:hover:border-[#0a84ff]/25 dark:hover:bg-[#0a84ff]/8 dark:hover:shadow-lg">
      {/* 缩略图区域 */}
      <div
        className="relative h-24 w-full bg-[#000]/80"
        style={{
          aspectRatio: "16 / 9",
          backgroundImage: thumb ? `url(${thumb})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {!thumb && (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-3xl opacity-40">
              {item.type === "video" ? "🎬" : "🖼️"}
            </div>
          </div>
        )}
        {/* 时长角标（仅视频） */}
        {item.type === "video" && item.duration !== undefined && item.duration > 0 && (
          <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {formatDuration(item.duration)}
          </div>
        )}
        {/* 类型标签 */}
        <div className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
          {item.type === "video" ? "视频" : "图片"}
        </div>
      </div>

      {/* 信息区 */}
      <div className="flex items-center justify-between gap-2 p-2">
        <div className="min-w-0 flex-1">
          <div
            className="truncate text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
            title={item.name}
          >
            {item.name}
          </div>
          <div className="text-[10px] text-[#8e8e93] dark:text-[#8e8e93]">
            {formatSize(item.size)}
            {item.width && item.height
              ? ` · ${item.width}×${item.height}`
              : ""}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={onAdd}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-[#34c759] text-white shadow-sm transition-transform hover:scale-110 dark:bg-[#30d158]"
          title={`添加到${item.type === "video" ? "视频" : "图片"}轨道`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ff3b30] text-white shadow-sm transition-transform hover:scale-110"
          title="删除"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
