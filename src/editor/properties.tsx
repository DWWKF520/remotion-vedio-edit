import React, { useRef, useState } from "react";
import { useEditorStore } from "./store";
import { getComponentDef } from "./registry";
import { useVideoEffects } from "./video-effects";
import { EFFECT_LIST } from "./types";
import type { ClipEffect, EffectType } from "./types";
import { EFFECT_META_LIST, getEffectMeta } from "../components/video-effects/VideoEffectStack/registry";
import type { VideoEffectItem, EffectType as StackEffectType } from "../components/video-effects/VideoEffectStack/types";
import { nanoid } from "./nanoid";
import { gsap, useGSAP } from "./gsap-setup";

/** 属性面板：编辑选中 clip 的 props，支持收起为窄条 */
export const PropertiesPanel: React.FC<{ collapsed: boolean }> = ({
  collapsed,
}) => {
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const clips = useEditorStore((s) => s.clips);
  const updateClipProps = useEditorStore((s) => s.updateClipProps);
  const updateClipTiming = useEditorStore((s) => s.updateClipTiming);
  const updateClipEffect = useEditorStore((s) => s.updateClipEffect);

  const clip = selectedClipId ? clips[selectedClipId] : null;
  const def = clip ? getComponentDef(clip.componentKey) : null;
  // 视频特效列表（对所有含视频 src 的 clip 显示应用入口，支持叠加）
  const videoEffects = useVideoEffects();
  const hasVideoSrc =
    !!clip &&
    typeof clip.props.src === "string" &&
    clip.props.src.length > 0;
  const videoSrc = hasVideoSrc ? String(clip.props.src) : "";

  // 效果栈：仅对 videoClip 组件显示
  const isVideoClip = clip?.componentKey === "videoClip";
  const clipEffects: VideoEffectItem[] = Array.isArray(clip?.props.effects)
    ? (clip.props.effects as VideoEffectItem[])
    : [];

  const asideRef = useRef<HTMLElement>(null);

  // 折叠/展开切换时，新侧栏从右侧滑入（替代原瞬时切换）
  useGSAP(
    () => {
      gsap.from(asideRef.current, {
        opacity: 0,
        x: 16,
        duration: 0.3,
        ease: "power3.out",
      });
    },
    { scope: asideRef, dependencies: [collapsed], revertOnUpdate: true },
  );

  // 收起状态：窄条仅显示图标提示
  if (collapsed) {
    return (
      <aside ref={asideRef} className="flex w-12 flex-shrink-0 flex-col items-center gap-2 border-l border-[var(--separator)] bg-[var(--surface-overlay)] py-3 dark:border-[var(--separator)] dark:bg-[#1c1c1e]/60">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-[#8e8e93] dark:text-[#8e8e93]"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
        {clip && (
          <div className="mt-1 px-1 text-center text-[9px] leading-tight text-[#8e8e93] dark:text-[#8e8e93]">
            {clip.name.slice(0, 4)}
          </div>
        )}
      </aside>
    );
  }

  return (
    <aside ref={asideRef} className="flex w-[260px] flex-shrink-0 flex-col overflow-hidden border-l border-[var(--separator)] bg-[var(--surface-overlay)] text-[#1d1d1f] dark:border-[var(--separator)] dark:bg-[#1c1c1e]/60 dark:text-[#f5f5f7]">
      <div className="overflow-y-auto p-4 text-xs">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#8e8e93] dark:text-[#8e8e93]">
          属性 / Properties
        </div>

        {!clip || !def ? (
          <div className="text-[#8e8e93] dark:text-[#8e8e93]">
            在时间线上选择一个片段以编辑其属性。
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <label className={labelClass}>名称</label>
              <div className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                {clip.name}
              </div>
            </div>

            <div>
              <label className={labelClass}>组件</label>
              <div className="text-[#8e8e93] dark:text-[#aeaeb2]">
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

            <div className="border-t border-[var(--separator)] pt-2 dark:border-[var(--separator)]">
              <div className={`${labelClass} mb-2`}>动画效果</div>
              <EffectPicker
                label="入场"
                effect={clip.enterEffect}
                onChange={(e) => updateClipEffect(clip.id, "enter", e)}
              />
              <EffectPicker
                label="出场"
                effect={clip.exitEffect}
                onChange={(e) => updateClipEffect(clip.id, "exit", e)}
              />
            </div>

            {/* 叠加效果栈：仅对 videoClip 显示，支持多层叠加，后加的作用在前一个效果之上 */}
            {isVideoClip && (
              <div className="border-t border-[var(--separator)] pt-2 dark:border-[var(--separator)]">
                <div className={`${labelClass} mb-2 flex items-center justify-between`}>
                  <span>叠加效果</span>
                  <span className="text-[9px] text-[#8e8e93] dark:text-[#8e8e93]">
                    共 {clipEffects.length} 层
                  </span>
                </div>

                {/* 已添加的效果列表 */}
                {clipEffects.length > 0 && (
                  <div className="mb-2 flex flex-col gap-1">
                    {clipEffects.map((eff, idx) => {
                      return (
                        <EffectStackItem
                          key={eff.id}
                          effect={eff}
                          index={idx}
                          total={clipEffects.length}
                          onRemove={() => {
                            const next = clipEffects.filter((e) => e.id !== eff.id);
                            updateClipProps(clip.id, { effects: next });
                          }}
                          onMoveUp={() => {
                            if (idx === 0) return;
                            const next = [...clipEffects];
                            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                            updateClipProps(clip.id, { effects: next });
                          }}
                          onMoveDown={() => {
                            if (idx === clipEffects.length - 1) return;
                            const next = [...clipEffects];
                            [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                            updateClipProps(clip.id, { effects: next });
                          }}
                          onParamChange={(paramName, value) => {
                            const next = clipEffects.map((e) =>
                              e.id === eff.id
                                ? { ...e, params: { ...e.params, [paramName]: value } }
                                : e,
                            );
                            updateClipProps(clip.id, { effects: next });
                          }}
                        />
                      );
                    })}
                  </div>
                )}

                {/* 添加效果按钮 */}
                <AddEffectButton
                  onAdd={(type) => {
                    const meta = getEffectMeta(type);
                    if (!meta) return;
                    const newEffect: VideoEffectItem = {
                      id: nanoid(),
                      type,
                      params: JSON.parse(JSON.stringify(meta.defaultParams)),
                    };
                    const next = [...clipEffects, newEffect];
                    updateClipProps(clip.id, { effects: next });
                  }}
                />

                <div className="mt-1.5 text-[9px] text-[#8e8e93] dark:text-[#8e8e93]">
                  按顺序叠加，下层先应用，上层后应用
                </div>
              </div>
            )}

            {/* 视频特效：对所有含视频 src 的 clip 显示，作为独立 clip 加到轨道 */}
            {hasVideoSrc && videoSrc && videoEffects.length > 0 && (
              <div className="border-t border-[var(--separator)] pt-2 dark:border-[var(--separator)]">
                <div className={`${labelClass} mb-2`}>视频特效（独立片段）</div>
                <div className="flex flex-wrap gap-1.5">
                  {videoEffects.map((e) => (
                    <button
                      key={e.key}
                      onClick={() => e.apply(videoSrc, clip.name, clip.duration)}
                      title={e.title}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-white shadow-sm transition-transform hover:scale-105"
                      style={{ background: e.color }}
                    >
                      {e.icon}
                      <span>{e.label}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 text-[9px] text-[#8e8e93] dark:text-[#8e8e93]">
                  点击将当前视频作为独立特效片段加到轨道
                </div>
              </div>
            )}

            <div className="border-t border-[var(--separator)] pt-2 dark:border-[var(--separator)]">
              <div className={`${labelClass} mb-2`}>属性 Props</div>
              {def.propSchema.length === 0 ? (
                <div className="italic text-[#8e8e93] dark:text-[#8e8e93]">
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
                          className="h-7 w-9 cursor-pointer rounded border border-[var(--separator-opaque)] bg-transparent dark:border-[var(--separator-opaque)]"
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
                    ) : field.type === "select" ? (
                      <select
                        value={String(clip.props[field.name] ?? "")}
                        onChange={(e) =>
                          updateClipProps(clip.id, {
                            [field.name]: e.target.value,
                          })
                        }
                        className={`${selectClass} cursor-pointer`}
                      >
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
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
  "mb-1 block text-[10px] uppercase tracking-wide text-[#8e8e93] dark:text-[#8e8e93]";

const inputClass =
  "w-full rounded-lg border border-[var(--separator-opaque)] bg-[var(--surface-sunken)] px-2 py-1.5 text-xs text-[#1d1d1f] outline-none transition-all focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/15 dark:border-[var(--separator-opaque)] dark:bg-black/40 dark:text-[#f5f5f7] dark:focus:border-[#0a84ff] dark:focus:ring-[#0a84ff]/15";

const selectClass =
  "w-full rounded-lg border border-[var(--separator-opaque)] bg-[var(--surface-sunken)] px-2 py-1.5 text-xs text-[#1d1d1f] outline-none transition-all focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/15 dark:border-[var(--separator-opaque)] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:focus:border-[#0a84ff] dark:focus:ring-[#0a84ff]/15";

/** 效果选择器：下拉选效果类型 + 数字输入持续帧数 */
const EffectPicker: React.FC<{
  label: string;
  effect?: ClipEffect;
  onChange: (effect: ClipEffect | null) => void;
}> = ({ label, effect, onChange }) => {
  const currentType: EffectType = effect?.type ?? "none";
  const currentDuration = effect?.duration ?? 15;
  const disabled = currentType === "none";

  return (
    <div className="mb-2">
      <label className={labelClass}>{label}</label>
      <div className="flex gap-1.5">
        <select
          value={currentType}
          onChange={(e) => {
            const type = e.target.value as EffectType;
            if (type === "none") {
              onChange(null);
            } else {
              onChange({ type, duration: currentDuration });
            }
          }}
          className={`${selectClass} flex-1 cursor-pointer`}
        >
          {EFFECT_LIST.map((m) => (
            <option key={m.type} value={m.type}>
              {m.icon} {m.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          value={currentDuration}
          disabled={disabled}
          onChange={(e) => {
            const duration = Math.max(1, Math.round(Number(e.target.value)));
            if (currentType !== "none") {
              onChange({ type: currentType, duration });
            }
          }}
          className={`${inputClass} w-14 disabled:opacity-40`}
          title="持续帧数"
        />
      </div>
    </div>
  );
};

/** 效果栈中的单个效果项（可展开编辑参数） */
const EffectStackItem: React.FC<{
  effect: VideoEffectItem;
  index: number;
  total: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onParamChange: (paramName: string, value: unknown) => void;
}> = ({ effect, index, total, onRemove, onMoveUp, onMoveDown, onParamChange }) => {
  const [expanded, setExpanded] = useState(false);
  const meta = getEffectMeta(effect.type);

  if (!meta) return null;

  return (
    <div className="overflow-hidden rounded-md border border-[var(--separator-opaque)] dark:border-[var(--separator-opaque)]">
      {/* 头部 */}
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer transition-colors hover:bg-[var(--surface-sunken)] dark:hover:bg-black/30"
        onClick={() => setExpanded((v) => !v)}
      >
        <span
          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-white text-[10px] font-semibold"
          style={{ background: meta.color }}
          title={meta.label}
        >
          {index + 1}
        </span>
        <span className="flex-1 truncate text-[11px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
          {meta.label}
        </span>
        {/* 上移/下移/删除按钮 */}
        <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="flex h-5 w-5 items-center justify-center rounded text-[#8e8e93] hover:bg-[var(--surface-sunken)] dark:hover:bg-black/40 disabled:opacity-30 disabled:cursor-not-allowed"
            title="上移一层"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="flex h-5 w-5 items-center justify-center rounded text-[#8e8e93] hover:bg-[var(--surface-sunken)] dark:hover:bg-black/40 disabled:opacity-30 disabled:cursor-not-allowed"
            title="下移一层"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <button
            onClick={onRemove}
            className="flex h-5 w-5 items-center justify-center rounded text-[#ff3b30] hover:bg-[#ff3b30]/10"
            title="删除效果"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* 展开箭头 */}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-[#8e8e93] transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {/* 展开的参数编辑区 */}
      {expanded && (
        <div className="border-t border-[var(--separator-opaque)] bg-[var(--surface-sunken)]/50 p-2 dark:border-[var(--separator-opaque)] dark:bg-black/20">
          {effect.type === "mask" && (
            <div className="mb-2 rounded bg-[#ff9500]/10 p-1.5 text-[10px] text-[#ff9500] dark:bg-[#ff9500]/15">
              <div className="font-medium">在预览区编辑蒙版</div>
              <div className="mt-0.5 text-[9px] opacity-90">
                选中本效果后，在左侧预览区使用工具栏绘制矩形/圆形/自定义蒙版，支持框选、拖拽调整、羽化和透明度。
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            {meta.paramSchema.map((field) => (
              <div key={field.name}>
                <label className="mb-0.5 block text-[9px] uppercase tracking-wide text-[#8e8e93] dark:text-[#8e8e93]">
                  {field.label}
                </label>
                {field.type === "color" ? (
                  <div className="flex gap-1 items-center">
                    <input
                      type="color"
                      value={String(effect.params[field.name] ?? "#000000")}
                      onChange={(e) => onParamChange(field.name, e.target.value)}
                      className="h-6 w-8 cursor-pointer rounded border border-[var(--separator-opaque)] bg-transparent dark:border-[var(--separator-opaque)]"
                    />
                    <input
                      type="text"
                      value={String(effect.params[field.name] ?? "")}
                      onChange={(e) => onParamChange(field.name, e.target.value)}
                      className={`${inputClass} flex-1 !py-1 !text-[10px]`}
                    />
                  </div>
                ) : field.type === "select" ? (
                  <select
                    value={String(effect.params[field.name] ?? "")}
                    onChange={(e) => onParamChange(field.name, e.target.value)}
                    className={`${selectClass} !py-1 !text-[10px] cursor-pointer w-full`}
                  >
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "number" ? (
                  <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={0.01}
                    value={Number(effect.params[field.name] ?? 0)}
                    onChange={(e) => onParamChange(field.name, Number(e.target.value))}
                    className={`${inputClass} !py-1 !text-[10px] w-full`}
                  />
                ) : (
                  <input
                    type="text"
                    value={String(effect.params[field.name] ?? "")}
                    onChange={(e) => onParamChange(field.name, e.target.value)}
                    className={`${inputClass} !py-1 !text-[10px] w-full`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/** 添加效果按钮（下拉选择要添加的效果类型） */
const AddEffectButton: React.FC<{
  onAdd: (type: StackEffectType) => void;
}> = ({ onAdd }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-[var(--separator-opaque)] bg-[var(--surface-sunken)]/50 px-2 py-1.5 text-[10px] font-medium text-[#007aff] transition-colors hover:border-[#007aff]/40 hover:bg-[#007aff]/5 dark:border-[var(--separator-opaque)] dark:text-[#4da2ff] dark:hover:border-[#0a84ff]/40 dark:hover:bg-[#0a84ff]/10"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        添加效果
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-lg border border-[var(--separator-opaque)] bg-[var(--surface-overlay)] shadow-lg dark:border-[var(--separator-opaque)] dark:bg-[#2c2c2e]">
            {EFFECT_META_LIST.map((m) => (
              <button
                key={m.type}
                onClick={() => {
                  onAdd(m.type);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[10px] font-medium text-[#1d1d1f] transition-colors hover:bg-[var(--surface-sunken)] dark:text-[#f5f5f7] dark:hover:bg-black/30"
              >
                <span
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-white"
                  style={{ background: m.color }}
                >
                  {m.icon}
                </span>
                <span className="flex-1 truncate">{m.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
