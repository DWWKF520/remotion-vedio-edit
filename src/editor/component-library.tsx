import React from "react";
import { registry } from "./registry";
import { useEditorStore } from "./store";

/** 组件库面板：列出所有可用组件，点击添加到时间线 */
export const ComponentLibrary: React.FC = () => {
  const addClipFromRegistry = useEditorStore((s) => s.addClipFromRegistry);

  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        background: "#161616",
        borderRight: "1px solid #222",
        padding: 16,
        color: "#ddd",
        fontSize: 12,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          marginBottom: 12,
          textTransform: "uppercase",
          color: "#888",
          fontSize: 11,
          letterSpacing: 1,
        }}
      >
        Components
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {registry.map((def) => (
          <button
            key={def.key}
            onClick={() => addClipFromRegistry(def.key)}
            style={{
              textAlign: "left",
              background: "#1f1f1f",
              border: "1px solid #2a2a2a",
              borderRadius: 6,
              padding: 10,
              color: "#ddd",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#262626";
              e.currentTarget.style.borderColor = "#3a3a3a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#1f1f1f";
              e.currentTarget.style.borderColor = "#2a2a2a";
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{def.name}</div>
            <div style={{ color: "#888", fontSize: 10, lineHeight: 1.4 }}>
              {def.description}
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 10,
                color: "#4ade80",
              }}
            >
              + Add to timeline
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
