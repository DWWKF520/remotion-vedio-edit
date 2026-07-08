import { LightSpotlight } from "./index";
import { registerComponent } from "../../editor/registry";
import type { ComponentManifest } from "../../editor/registry-types";

const manifest: ComponentManifest = {
  key: "lightSpotlight",
  name: "聚光灯扫字",
  description: "顶部灯泡左右摆动，灯光扫到的文字从暗色点亮，呈现聚光灯扫字动画",
  icon: "🔦",
  accentColor: "#fbbf24",
  component: LightSpotlight as unknown as ComponentManifest["component"],
  defaultProps: {
    labelText: "vibe-motion",
    swingAngleDegrees: 30,
    swingCycleSeconds: 4,
    lampScale: 1,
    glowOpacity: 0.6,
    maskColor: "#2a2a2a",
    textColor: "#fbbf24",
    backgroundColor: "#0a0a0a",
    videoWidth: 1920,
    videoHeight: 1080,
  },
  defaultDuration: 300,
  propSchema: [
    { name: "labelText", label: "文字内容", type: "text" },
    { name: "swingAngleDegrees", label: "摆动幅度(度)", type: "number" },
    { name: "swingCycleSeconds", label: "摆动周期(秒)", type: "number" },
    { name: "lampScale", label: "灯泡缩放", type: "number" },
    { name: "glowOpacity", label: "光晕透明度(0-1)", type: "number" },
    { name: "maskColor", label: "暗色文字颜色", type: "color" },
    { name: "textColor", label: "亮色文字颜色", type: "color" },
    { name: "backgroundColor", label: "背景色（transparent=透明）", type: "text" },
    { name: "videoWidth", label: "视频宽度（兜底）", type: "number" },
    { name: "videoHeight", label: "视频高度（兜底）", type: "number" },
  ],
};

registerComponent(manifest);

export default manifest;
