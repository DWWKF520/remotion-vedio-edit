import React from "react";
import { useEditorStore } from "./store";
import { getComponentDef } from "./registry";

/** 属性面板：编辑选中 clip 的 props，支持收起为窄条 */
export const PropertiesPanel: React.FC<{ collapsed: boolean }> = ({
  collapsed,
}) => {
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const clips = useEditorStore((s) => s.clips);
  const updateClipProps = useEditorStore((s) => s.updateClipProps);
  const updateClipTiming = useEditorStore((s) => s.updateClipTiming);

  const clip = selectedClipId ? clips[selectedClipId] : null;
  const def = clip ? getComponentDef(clip.componentKey) : null;

  // 收起状态：窄条仅显示图标提示
  if (collapsed) {
    return (
      <aside className="flex w-12 flex-shrink-0 flex-col items-center gap-2 border-l border-black/5 bg-white/60 py-3 dark:border-white/8 dark:bg-[#161618]/60">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-slate-400 dark:text-gray-500"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
        {clip && (
          <div className="mt-1 px-1 text-center text-[9px] leading-tight text-slate-400 dark:text-gray-500">
            {clip.name.slice(0, 4)}
          </div>
        )}
      </aside>
    );
  }

  return (
    <aside className="flex w-[260px] flex-shrink-0 flex-col overflow-hidden border-l border-black/5 bg-white/60 text-slate-800 dark:border-white/8 dark:bg-[#161618]/60 dark:text-gray-200">
      <div className="overflow-y-auto p-4 text-xs">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">
          属性 / Properties
        </div>

        {!clip || !def ? (
          <div className="text-slate-400 dark:text-gray-500">
            在时间线上选择一个片段以编辑其属性。
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <label className={labelClass}>名称</label>
              <div className="font-semibold text-slate-800 dark:text-white">
                {clip.name}
              </div>
            </div>

            <div>
              <label className={labelClass}>组件</label>
              <div className="text-slate-500 dark:text-gray-400">
                {def.name}
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className={labelClass}>起始帧</label>
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
                  className={inputClass}
                />
              </div>
              <div className="flex-1">
                <label className={labelClass}>时长</label>
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
                  className={inputClass}
                />
              </div>
            </div>

            <div className="border-t border-black/5 pt-2 dark:border-white/8">
              <div className={`${labelClass} mb-2`}>属性 Props</div>
              {def.propSchema.length === 0 ? (
                <div className="italic text-slate-400 dark:text-gray-500">
                  此组件没有可编辑属性。
                </div>
              ) : (
                def.propSchema.map((field) => (
                  <div key={field.name} className="mb-2">
                    <label className={labelClass}>{field.label}</label>
                    {field.type === "color" ? (
                      <div className="flex gap-1.5 items-center">
                        <input
                          type="color"
                          value={String(clip.props[field.name] ?? "#000000")}
                          onChange={(e) =>
                            updateClipProps(clip.id, {
                              [field.name]: e.target.value,
                            })
                          }
                          className="h-7 w-9 cursor-pointer rounded border border-black/10 bg-transparent dark:border-white/10"
                        />
                        <input
                          type="text"
                          value={String(clip.props[field.name] ?? "")}
                          onChange={(e) =>
                            updateClipProps(clip.id, {
                              [field.name]: e.target.value,
                            })
                          }
                          className={`${inputClass} flex-1`}
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
                        className={inputClass}
                      />
                    ) : field.type === "textarea" ? (
                      <textarea
                        value={String(clip.props[field.name] ?? "")}
                        onChange={(e) =>
                          updateClipProps(clip.id, {
                            [field.name]: e.target.value,
                          })
                        }
                        rows={8}
                        className={`${inputClass} resize-y min-h-[120px] font-mono leading-relaxed`}
                        placeholder={
                          field.name === "subtitlesText"
                            ? "0-3: 第一句字幕\n3-6: 第二句字幕\n6-10: 第三句字幕"
                            : ""
                        }
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
                        className={inputClass}
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

const labelClass =
  "mb-1 block text-[10px] uppercase tracking-wide text-slate-400 dark:text-gray-500";

const inputClass =
  "w-full rounded border border-black/10 bg-slate-50 px-1.5 py-1 text-xs text-slate-800 outline-none transition-colors focus:border-violet-500 dark:border-white/10 dark:bg-black/30 dark:text-gray-100 dark:focus:border-violet-400";
