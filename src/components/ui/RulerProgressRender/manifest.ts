import { RulerProgressRender } from "./";
import { registerComponent } from "../../../editor/registry";
import type { ComponentManifest } from "../../../editor/registry-types";

const manifest: ComponentManifest = {
  key: "rulerProgress",
  name: "标尺进度条",
  description: "底部时间标尺进度条，带刻度、时间标记和播放头指示器",
  icon: "📏",
  accentColor: "#8b5cf6",
  component: RulerProgressRender as ComponentManifest["component"],
  defaultProps: {
    height: 40,
    fillColor: "#8b5cf6",
    bgColor: "#1a1a1e",
    tickColor: "#333333",
    textColor: "#666666",
    playheadColor: "#ef4444",
    showTimeMarkers: true,
    tickInterval: 1,
    position: "bottom",
    showPlayheadTriangle: true,
    padding: 0,
    borderRadius: 0,
    showShadow: true,
  },
  defaultDuration: 300,
  propSchema: [
    { name: "height", label: "高度", type: "number" },
    { name: "fillColor", label: "填充色", type: "color" },
    { name: "bgColor", label: "背景色", type: "color" },
    { name: "tickColor", label: "刻度颜色", type: "color" },
    { name: "textColor", label: "文字颜色", type: "color" },
    { name: "playheadColor", label: "播放头颜色", type: "color" },
    { name: "showTimeMarkers", label: "显示时间标记(1/0)", type: "number" },
    { name: "tickInterval", label: "刻度间隔(秒)", type: "number" },
    { name: "position", label: "位置(bottom/top)", type: "text" },
    { name: "showPlayheadTriangle", label: "显示播放头三角(1/0)", type: "number" },
    { name: "padding", label: "边距", type: "number" },
    { name: "borderRadius", label: "圆角", type: "number" },
    { name: "showShadow", label: "显示阴影(1/0)", type: "number" },
  ],
};

registerComponent(manifest);

export default manifest;
