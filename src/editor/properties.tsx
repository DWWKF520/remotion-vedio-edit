import React from "react";
import { useEditorStore } from "./store";
import { getComponentDef } from "./registry";

/** 属性面板：编辑选中 clip 的 props */
export const PropertiesPanel: React.FC = () => {
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const clips = useEditorStore((s) => s.clips);
  const updateClipProps = useEditorStore((s) => s.updateClipProps);
  const updateClipTiming = useEditorStore((s) => s.updateClipTiming);

  const clip = selectedClipId ? clips[selectedClipId] : null;
  const def = clip ? getComponentDef(clip.componentKey) : null;

  return (
    <div
      style={{
        width: 260,
        flexShrink: 0,
        background: "#161616",
        borderLeft: "1px solid #222",
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
        Properties
      </div>

      {!clip || !def ? (
        <div style={{ color: "#666" }}>
          Select a clip on the timeline to edit its properties.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>Name</label>
            <div style={{ color: "#fff", fontWeight: 600 }}>{clip.name}</div>
          </div>

          <div>
            <label style={labelStyle}>Component</label>
            <div style={{ color: "#aaa" }}>{def.name}</div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Start (frame)</label>
              <input
                type="number"
                value={clip.start}
                onChange={(e) =>
                  updateClipTiming(
                    clip.id,
                    Number(e.target.value),
                    clip.duration,
                  )
                }
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Duration</label>
              <input
                type="number"
                value={clip.duration}
                onChange={(e) =>
                  updateClipTiming(
                    clip.id,
                    clip.start,
                    Number(e.target.value),
                  )
                }
                style={inputStyle}
              />
            </div>
          </div>

          <div
            style={{
              borderTop: "1px solid #2a2a2a",
              margin: "8px 0",
              paddingTop: 8,
            }}
          >
            <div style={{ ...labelStyle, marginBottom: 8 }}>Props</div>
            {def.propSchema.length === 0 ? (
              <div style={{ color: "#666", fontStyle: "italic" }}>
                This component has no editable props.
              </div>
            ) : (
              def.propSchema.map((field) => (
                <div key={field.name} style={{ marginBottom: 8 }}>
                  <label style={labelStyle}>{field.label}</label>
                  {field.type === "color" ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="color"
                        value={String(clip.props[field.name] ?? "#000000")}
                        onChange={(e) =>
                          updateClipProps(clip.id, {
                            [field.name]: e.target.value,
                          })
                        }
                        style={{
                          width: 36,
                          height: 28,
                          background: "transparent",
                          border: "1px solid #333",
                          borderRadius: 4,
                          cursor: "pointer",
                        }}
                      />
                      <input
                        type="text"
                        value={String(clip.props[field.name] ?? "")}
                        onChange={(e) =>
                          updateClipProps(clip.id, {
                            [field.name]: e.target.value,
                          })
                        }
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </div>
                  ) : field.type === "number" ? (
                    <input
                      type="number"
                      value={Number(clip.props[field.name] ?? 0)}
                      onChange={(e) =>
                        updateClipProps(clip.id, {
                          [field.name]: Number(e.target.value),
                        })
                      }
                      style={inputStyle}
                    />
                  ) : (
                    <input
                      type="text"
                      value={String(clip.props[field.name] ?? "")}
                      onChange={(e) =>
                        updateClipProps(clip.id, {
                          [field.name]: e.target.value,
                        })
                      }
                      style={inputStyle}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  color: "#888",
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0a0a0a",
  border: "1px solid #333",
  borderRadius: 4,
  padding: "4px 6px",
  color: "#fff",
  fontSize: 12,
  outline: "none",
};
