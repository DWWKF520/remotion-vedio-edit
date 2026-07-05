import React from "react";
import { registry } from "./registry";
import { useEditorStore } from "./store";

/** 组件库面板：列出所有可用组件，点击添加到时间线 */
export const ComponentLibrary: React.FC = () => {
  const addClipFromRegistry = useEditorStore((s) => s.addClipFromRegistry);

  return (
    <div
      style={{
        width: 200,
        flexShrink: 0,
        background: "#161618",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        padding: 0,
        color: "#ddd",
        fontSize: 12,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          padding: "12px 14px 8px",
          textTransform: "uppercase",
          color: "#888",
          fontSize: 10,
          letterSpacing: 1.2,
          flexShrink: 0,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        素材库
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: "8px 10px",
        }}
      >
        {registry.map((def) => (
          <button
            key={def.key}
            onClick={() => addClipFromRegistry(def.key)}
            style={{
              textAlign: "left",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 8,
              padding: 10,
              color: "#ddd",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(139,92,246,0.08)";
              e.currentTarget.style.borderColor = "rgba(139,92,246,0.2)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                {def.key === "helloworld" ? "🎬" : def.key === "subtitle" ? "💬" : "📦"}
              </div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{def.name}</div>
            </div>
            <div style={{ color: "#666", fontSize: 10, lineHeight: 1.4, marginBottom: 4 }}>
              {def.description}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "#8b5cf6",
                fontWeight: 500,
              }}
            >
              + 添加到时间线
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
