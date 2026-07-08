import React, { useState } from "react";
import { registry } from "./registry";
import { useEditorStore } from "./store";

// 字幕类组件 key
const SUBTITLE_KEYS = ["subtitle", "subtitleTrack"];

const getIcon = (key: string): string => {
  if (key === "helloworld") return "🎬";
  if (key === "subtitle") return "💬";
  if (key === "subtitleTrack") return "📝";
  if (key === "claudeType") return "🤖";
  if (key === "wechat2d") return "💚";
  return "📦";
};

const getAccentColor = (key: string): string => {
  if (key === "helloworld") return "#6366f1";
  if (key === "subtitle") return "#ec4899";
  if (key === "subtitleTrack") return "#f97316";
  if (key === "claudeType") return "#D97757";
  if (key === "wechat2d") return "#07C160";
  return "#8b5cf6";
};

/** 素材库面板：素材库 + 字幕库 两个独立 tab，点击右下角加号添加到轨道 */
export const ComponentLibrary: React.FC<{ collapsed: boolean }> = ({
  collapsed,
}) => {
  const addClipFromRegistry = useEditorStore((s) => s.addClipFromRegistry);
  const [tab, setTab] = useState<"materials" | "subtitles">("materials");

  const items =
    tab === "materials"
      ? registry.filter((d) => !SUBTITLE_KEYS.includes(d.key))
      : registry.filter((d) => SUBTITLE_KEYS.includes(d.key));

  // 收起状态：窄条仅显示图标
  if (collapsed) {
    return (
      <aside className="flex w-12 flex-shrink-0 flex-col items-center gap-2 border-r border-black/5 bg-white/60 py-3 dark:border-white/8 dark:bg-[#161618]/60">
        {items.map((def) => {
          const color = getAccentColor(def.key);
          return (
            <button
              key={def.key}
              onClick={() => addClipFromRegistry(def.key)}
              title={def.name}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-base transition-transform hover:scale-110"
              style={{ background: `${color}1a` }}
            >
              {getIcon(def.key)}
            </button>
          );
        })}
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
      </div>

      {/* 组件列表 */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2.5">
        {items.map((def) => {
          const color = getAccentColor(def.key);
          return (
            <div
              key={def.key}
              onClick={() => addClipFromRegistry(def.key)}
              className="group relative cursor-pointer rounded-xl border border-black/5 bg-white/50 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-black/10 hover:shadow-lg dark:border-white/5 dark:bg-white/[0.03] dark:hover:border-white/10 dark:hover:shadow-black/30"
              style={
                {
                  "--accent": color,
                } as React.CSSProperties
              }
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${color}14`;
                e.currentTarget.style.borderColor = `${color}55`;
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
                    background: `linear-gradient(135deg, ${color}33, ${color}14)`,
                  }}
                >
                  {getIcon(def.key)}
                </div>
                <div className="text-xs font-semibold text-slate-800 dark:text-gray-200">
                  {def.name}
                </div>
              </div>

              {/* 右下角加号按钮 */}
              <div
                className="absolute bottom-2 right-2 flex h-[22px] w-[22px] items-center justify-center rounded-full shadow-sm transition-transform duration-150 group-hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                  boxShadow: `0 2px 6px ${color}55`,
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
        })}
        {items.length === 0 && (
          <div className="py-7 text-center text-xs text-slate-400 dark:text-gray-500">
            暂无组件
          </div>
        )}
      </div>
    </aside>
  );
};

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
