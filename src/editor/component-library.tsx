import React, { useState } from "react";
import { registry } from "./registry";
import { useEditorStore } from "./store";
import type { ComponentManifest } from "./registry-types";
import type { Preset } from "./types";

// 字幕类组件 category
const SUBTITLE_CATEGORY = "subtitles";

type Tab = "materials" | "subtitles" | "presets";

/** 素材库面板：素材库 + 字幕库 + 预设 三个独立 tab */
export const ComponentLibrary: React.FC<{ collapsed: boolean }> = ({
  collapsed,
}) => {
  const addClipFromRegistry = useEditorStore((s) => s.addClipFromRegistry);
  const [tab, setTab] = useState<Tab>("materials");

  const items =
    tab === "materials"
      ? registry.filter((d) => d.category !== SUBTITLE_CATEGORY)
      : registry.filter((d) => d.category === SUBTITLE_CATEGORY);

  // 收起状态：窄条仅显示图标
  if (collapsed) {
    return (
      <aside className="flex w-12 flex-shrink-0 flex-col items-center gap-2 border-r border-black/5 bg-white/60 py-3 dark:border-white/8 dark:bg-[#161618]/60">
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
    <aside className="flex w-[200px] flex-shrink-0 flex-col overflow-hidden border-r border-black/5 bg-white/60 text-slate-800 dark:border-white/8 dark:bg-[#161618]/60 dark:text-gray-200">
      {/* Tab 切换 */}
      <div className="flex flex-shrink-0 border-b border-black/5 dark:border-white/5">
        <TabBtn
          active={tab === "materials"}
          onClick={() => setTab("materials")}
          label="素材库"
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

      {/* 预设 tab */}
      {tab === "presets" ? (
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
            <div className="py-7 text-center text-xs text-slate-400 dark:text-gray-500">
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
            className="min-w-0 flex-1 rounded-md border border-violet-400/50 bg-white/80 px-2 py-1.5 text-xs text-slate-800 outline-none dark:bg-black/30 dark:text-gray-200"
          />
          <button
            onClick={confirmSave}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-violet-500 text-white transition-colors hover:bg-violet-600"
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
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-slate-200 text-slate-500 transition-colors hover:bg-slate-300 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20"
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
          className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-violet-400/40 bg-violet-50/50 py-2.5 text-xs font-semibold text-violet-600 transition-all hover:border-violet-400 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-violet-400/30 dark:bg-violet-500/5 dark:text-violet-300 dark:hover:bg-violet-500/10"
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
        <div className="py-7 text-center text-xs text-slate-400 dark:text-gray-500">
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
      className="group relative cursor-pointer rounded-xl border border-black/5 bg-white/50 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-violet-50/30 hover:shadow-lg dark:border-white/5 dark:bg-white/[0.03] dark:hover:border-violet-400/30 dark:hover:bg-violet-500/5 dark:hover:shadow-black/30"
    >
      {/* 图标 + 名称 */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400/30 to-violet-500/10 text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-500 dark:text-violet-300">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <path d="M17 21v-8H7v8M7 3v5h8" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-slate-800 dark:text-gray-200">
            {preset.name}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-gray-500">
            {clipCount} clips · {preset.width}×{preset.height} · {dateStr}
          </div>
        </div>
      </div>

      {/* 右下角加载提示 */}
      <div className="absolute bottom-2 right-2 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-600 shadow-sm transition-transform duration-150 group-hover:scale-110">
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
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/90 text-white opacity-0 transition-opacity duration-150 hover:bg-red-600 group-hover:opacity-100"
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
    className="group relative cursor-pointer rounded-xl border border-black/5 bg-white/50 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-black/10 hover:shadow-lg dark:border-white/5 dark:bg-white/[0.03] dark:hover:border-white/10 dark:hover:shadow-black/30"
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
      <div className="text-xs font-semibold text-slate-800 dark:text-gray-200">
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
        ? "border-violet-500 font-semibold text-slate-800 dark:border-violet-400 dark:text-gray-100"
        : "border-transparent font-normal text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300"
    }`}
  >
    {label}
  </button>
);
