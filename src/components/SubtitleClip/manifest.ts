import { SubtitleClip } from "../SubtitleClip";
import { registerComponent } from "../../editor/registry";
import type { ComponentManifest } from "../../editor/registry-types";

const manifest: ComponentManifest = {
  key: "subtitle",
  name: "字幕",
  description: "可自定义文本、颜色、大小的字幕条",
  icon: "💬",
  accentColor: "#ec4899",
  category: "subtitles",
  component: SubtitleClip as ComponentManifest["component"],
  defaultProps: {
    text: "在这里输入字幕",
    color: "#ffffff",
    fontSize: 48,
    bgColor: "rgba(0,0,0,0.6)",
    position: "bottom",
  },
  defaultDuration: 90,
  propSchema: [
    { name: "text", label: "字幕文本", type: "text" },
    { name: "color", label: "文字颜色", type: "color" },
    { name: "fontSize", label: "字体大小", type: "number" },
    { name: "bgColor", label: "背景颜色", type: "text" },
    { name: "position", label: "位置(top/middle/bottom)", type: "text" },
  ],
};

registerComponent(manifest);

export default manifest;
