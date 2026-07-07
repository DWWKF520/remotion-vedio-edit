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

/** 组件库面板：素材库 + 字幕库 两个 tab */
export const ComponentLibrary: React.FC = () => {
  const addClipFromRegistry = useEditorStore((s) => s.addClipFromRegistry);
  const [tab, setTab] = useState<"materials" | "subtitles">("materials");

  const items =
    tab === "materials"
      ? registry.filter((d) => !SUBTITLE_KEYS.includes(d.key))
      : registry.filter((d) => SUBTITLE_KEYS.includes(d.key));

  return (
    <div
      style={{
        width: 200,
        flexShrink: 0,
        background: "#161618",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        color: "#ddd",
        fontSize: 12,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Tab 切换 */}
      <div
        style={{
          display: "flex",
          flexShrink: 0,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
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
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {items.map((def) => {
          const color = getAccentColor(def.key);
          return (
            <div
              key={def.key}
              onClick={() => addClipFromRegistry(def.key)}
              style={{
                position: "relative",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10,
                padding: "12px 10px 10px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${color}12`;
                e.currentTarget.style.borderColor = `${color}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
              }}
            >
              {/* 图标 + 名称 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: `linear-gradient(135deg, ${color}25, ${color}10)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {getIcon(def.key)}
                </div>
                <div style={{ fontWeight: 600, fontSize: 12, color: "#e0e0e0" }}>
                  {def.name}
                </div>
              </div>

              {/* 右下角加号按钮 */}
              <div
                style={{
                  position: "absolute",
                  right: 8,
                  bottom: 8,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 2px 6px ${color}40`,
                  transition: "transform 0.15s",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div
            style={{
              color: "#555",
              textAlign: "center",
              padding: "30px 0",
              fontSize: 11,
            }}
          >
            暂无组件
          </div>
        )}
      </div>
    </div>
  );
};

const TabBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
}> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1,
      padding: "10px 0",
      background: "transparent",
      border: "none",
      borderBottom: active
        ? "2px solid #8b5cf6"
        : "2px solid transparent",
      color: active ? "#e0e0e0" : "#666",
      fontWeight: active ? 600 : 400,
      fontSize: 12,
      cursor: "pointer",
      transition: "all 0.2s",
    }}
  >
    {label}
  </button>
);
