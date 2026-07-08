import { SubtitleTrack } from "../SubtitleTrack";
import { registerComponent } from "../../editor/registry";
import type { ComponentManifest } from "../../editor/registry-types";

const manifest: ComponentManifest = {
  key: "subtitleTrack",
  name: "字幕轨道",
  description: "通过编程式文本批量管理多段字幕（每行：起始秒-结束秒: 文本）",
  icon: "📝",
  accentColor: "#f97316",
  category: "subtitles",
  component: SubtitleTrack as ComponentManifest["component"],
  defaultProps: {
    subtitlesText:
      "0-3: 欢迎观看\n3-6: 这是字幕轨道组件\n6-10: 可以通过编程批量添加字幕",
    color: "#ffffff",
    fontSize: 48,
    bgColor: "rgba(0,0,0,0.6)",
    position: "bottom",
    animation: "slide",
  },
  defaultDuration: 300,
  propSchema: [
    {
      name: "subtitlesText",
      label: "字幕列表（每行：起始秒-结束秒: 文本）",
      type: "textarea",
    },
    { name: "color", label: "文字颜色", type: "color" },
    { name: "fontSize", label: "字体大小", type: "number" },
    { name: "bgColor", label: "背景颜色", type: "text" },
    { name: "position", label: "位置(top/middle/bottom)", type: "text" },
    { name: "animation", label: "动画(slide/fade/none)", type: "text" },
  ],
};

registerComponent(manifest);

export default manifest;
