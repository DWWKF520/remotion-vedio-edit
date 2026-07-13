import React, { useState } from "react";
import { registry } from "./registry";
import { useEditorStore } from "./store";
import type { ComponentManifest } from "./registry-types";
import type { Preset } from "./types";
import { VideoLibrary } from "./video-library";

// 字幕类组件 category
const SUBTITLE_CATEGORY = "subtitles";

type Tab = "materials" | "videos" | "subtitles" | "presets";

/** 素材库面板：素材库 + 视频 + 字幕库 + 预设 四个独立 tab */
export const ComponentLibrary: React.FC<{ collapsed: boolean }> = ({
  collapsed,
}) => {
  const addClipFromRegistry = useEditorStore((s) => s.addClipFromRegistry);
  const [tab, setTab] = useState<Tab>("materials");

  const items =
    tab === "materials"
      ? registry.filter(
          (d) => d.category !== SUBTITLE_CATEGORY && !d.hidden,
        )
      : registry.filter((d) => d.category === SUBTITLE_CATEGORY && !d.hidden);

  // 收起状态：窄条仅显示图标
  if (collapsed) {
    return (
      <aside className="flex w-12 flex-shrink-0 flex-col items-center gap-2 border-r border-[var(--separator)] bg-[var(--surface-overlay)] py-3 dark:border-[var(--separator)] dark:bg-[#1c1c1e]/60">
        {tab !== "presets" &&
          items.map((def) => (
            <MaterialButton
              key={def.key}
              def={def}
              onClick={() => addClipFromRegistry(def.key)}
              collapsed
            />
          ))}
      </aside>
    );
  }

  return (
    <aside className="flex w-[200px] flex-shrink-0 flex-col overflow-hidden border-r border-[var(--separator)] bg-[var(--surface-overlay)] text-[#1d1d1f] dark:border-[var(--separator)] dark:bg-[#1c1c1e]/60 dark:text-[#f5f5f7]">
      {/* Tab 切换 */}
      <div className="flex flex-shrink-0 border-b border-[var(--separator)] dark:border-[var(--separator)]">
        <TabBtn
          active={tab === "materials"}
          onClick={() => setTab("materials")}
          label="素材库"
        />
        <TabBtn
          active={tab === "videos"}
          onClick={() => setTab("videos")}
          label="视频"
        />
        <TabBtn
          active={tab === "subtitles"}
          onClick={() => setTab("subtitles")}
          label="字幕库"
        />
        <TabBtn
          active={tab === "presets"}
          onClick={() => setTab("presets")}
          label="预设"
        />
      </div>

      {/* 视频 tab */}
      {tab === "videos" ? (
        <VideoLibrary />
      ) : tab === "presets" ? (
        <PresetPanel />
      ) : (
        /* 组件列表 */
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2.5">
          {items.map((def) => (
            <MaterialCard
              key={def.key}
              def={def}
              onClick={() => addClipFromRegistry(def.key)}
            />
          ))}
          {items.length === 0 && (
            <div className="py-7 text-center text-xs text-[#8e8e93] dark:text-[#8e8e93]">
              暂无组件
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

// ---- 预设面板 ----
const PresetPanel: React.FC = () => {
  const savedPresets = useEditorStore((s) => s.savedPresets);
  const savePreset = useEditorStore((s) => s.savePreset);
  const loadPreset = useEditorStore((s) => s.loadPreset);
  const deletePreset = useEditorStore((s) => s.deletePreset);
  const clipCount = useEditorStore((s) => Object.keys(s.clips).length);

  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");

  const confirmSave = () => {
    const trimmed = name.trim();
    if (trimmed) {
      savePreset(trimmed);
      setName("");
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2.5">
      {/* 保存当前组合 */}
      {isSaving ? (
        <div className="flex gap-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmSave();
              if (e.key === "Escape") {
                setName("");
                setIsSaving(false);
              }
            }}
            placeholder="预设名称..."
            className="min-w-0 flex-1 rounded-md border border-[#007aff]/30 bg-[var(--surface)] px-2 py-1.5 text-xs text-[#1d1d1f] outline-none dark:bg-[#000000]/40 dark:text-[#f5f5f7]"
          />
          <button
            onClick={confirmSave}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[#007aff] text-white transition-colors hover:bg-[#0071e3]"
            title="确认保存"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </button>
          <button
            onClick={() => {
              setName("");
              setIsSaving(false);
            }}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[#e5e5ea] text-[#8e8e93] transition-colors hover:bg-[#d1d1d6] dark:bg-[var(--separator-opaque)] dark:text-[#8e8e93] dark:hover:bg-[#3a3a3c]"
            title="取消"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsSaving(true)}
          disabled={clipCount === 0}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#007aff]/30 bg-[#007aff]/5 py-2.5 text-xs font-semibold text-[#007aff] transition-all hover:border-[#007aff]/40 hover:bg-[#007aff]/8 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#0a84ff]/30 dark:bg-[#0a84ff]/8 dark:text-[#4da2ff] dark:hover:bg-[#0a84ff]/12"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <path d="M17 21v-8H7v8M7 3v5h8" />
          </svg>
          保存当前组合
        </button>
      )}

      {/* 预设列表 */}
      {savedPresets.length === 0 && !isSaving ? (
        <div className="py-7 text-center text-xs text-[#8e8e93] dark:text-[#8e8e93]">
          暂无预设
          <br />
          <span className="text-[10px]">添加 clip 后点击上方按钮保存</span>
        </div>
      ) : (
        savedPresets.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            onLoad={() => loadPreset(preset.id)}
            onDelete={() => deletePreset(preset.id)}
          />
        ))
      )}
    </div>
  );
};

/** 预设卡片：点击加载，右上角删除 */
const PresetCard: React.FC<{
  preset: Preset;
  onLoad: () => void;
  onDelete: () => void;
}> = ({ preset, onLoad, onDelete }) => {
  const clipCount = Object.keys(preset.clips).length;
  const date = new Date(preset.createdAt);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

  return (
    <div
      onClick={onLoad}
      className="group relative cursor-pointer rounded-xl border border-[var(--separator)] bg-[var(--surface)]/50 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#007aff]/30 hover:bg-[#007aff]/5 hover:shadow-md dark:border-[var(--separator)] dark:bg-white/5 dark:hover:border-[#0a84ff]/25 dark:hover:bg-[#0a84ff]/8 dark:hover:shadow-lg"
    >
      {/* 图标 + 名称 */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#007aff]/10 text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#007aff] dark:text-[#4da2ff]">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <path d="M17 21v-8H7v8M7 3v5h8" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            {preset.name}
          </div>
          <div className="text-[10px] text-[#8e8e93] dark:text-[#8e8e93]">
            {clipCount} clips · {preset.width}×{preset.height} · {dateStr}
          </div>
        </div>
      </div>

      {/* 右下角加载提示 */}
      <div className="absolute bottom-2 right-2 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#007aff] shadow-sm transition-transform duration-150 group-hover:scale-110">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>

      {/* 删除按钮（hover 时显示） */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#ff3b30] text-white opacity-0 transition-opacity duration-150 hover:bg-[#ff453a] group-hover:opacity-100"
        title="删除预设"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

/** 收起态：纯图标按钮 */
const MaterialButton: React.FC<{
  def: ComponentManifest;
  onClick: () => void;
  collapsed: boolean;
}> = ({ def, onClick }) => (
  <button
    onClick={onClick}
    title={def.name}
    className="flex h-9 w-9 items-center justify-center rounded-lg text-base transition-transform hover:scale-110"
    style={{ background: `${def.accentColor}1a` }}
  >
    {def.icon}
  </button>
);

/** 展开态：图标 + 名称 + 右下角加号 */
const MaterialCard: React.FC<{
  def: ComponentManifest;
  onClick: () => void;
}> = ({ def, onClick }) => (
  <div
    onClick={onClick}
    className="group relative cursor-pointer rounded-xl border border-[var(--separator)] bg-[var(--surface)]/50 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--separator-opaque)] hover:shadow-md dark:border-[var(--separator)] dark:bg-white/5 dark:hover:border-[var(--separator-opaque)] dark:hover:shadow-lg"
    style={
      {
        "--accent": def.accentColor,
      } as React.CSSProperties
    }
    onMouseEnter={(e) => {
      e.currentTarget.style.background = `${def.accentColor}14`;
      e.currentTarget.style.borderColor = `${def.accentColor}55`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "";
      e.currentTarget.style.borderColor = "";
    }}
  >
    {/* 图标 + 名称 */}
    <div className="flex items-center gap-2">
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-base"
        style={{
          background: `linear-gradient(135deg, ${def.accentColor}33, ${def.accentColor}14)`,
        }}
      >
        {def.icon}
      </div>
      <div className="text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
        {def.name}
      </div>
    </div>

    {/* 右下角加号按钮 */}
    <div
      className="absolute bottom-2 right-2 flex h-[22px] w-[22px] items-center justify-center rounded-full shadow-sm transition-transform duration-150 group-hover:scale-110"
      style={{
        background: `linear-gradient(135deg, ${def.accentColor}, ${def.accentColor}cc)`,
        boxShadow: `0 2px 6px ${def.accentColor}55`,
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </div>
  </div>
);

const TabBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
}> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`flex-1 border-b-2 py-2.5 text-xs transition-all ${
      active
        ? "border-[#007aff] font-semibold text-[#1d1d1f] dark:border-[#0a84ff] dark:text-[#f5f5f7]"
        : "border-transparent font-normal text-[#8e8e93] hover:text-[#48484a] dark:text-[#8e8e93] dark:hover:text-[#aeaeb2]"
    }`}
  >
    {label}
  </button>
);
