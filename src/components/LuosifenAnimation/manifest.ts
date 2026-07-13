import { LuosifenAnimation } from "./index";
import { registerComponent } from "../../editor/registry";
import type { ComponentManifest } from "../../editor/registry-types";

const manifest: ComponentManifest = {
  key: "luosifenAnimation",
  name: "螺蛳粉产业数据动画",
  description:
    "把螺蛳粉 5.1 万家店 / 沙县小吃 / 蜜雪冰城 5.5 万家 / 813 亿产业链 的旁白稿做成 7 阶段数据可视化动画。默认透明背景，适合叠加在视频上。",
  icon: "🍜",
  accentColor: "#ff6b35",
  component: LuosifenAnimation as unknown as ComponentManifest["component"],
  defaultProps: {
    bgOpacity: 0,
    bgStart: "#0f0707",
    bgEnd: "#2a1208",
    accentColor: "#ff6b35",
    textColor: "#ffffff",
    fontScale: 1,
    textStroke: 0.8,
    bottomMask: 0.5,
    videoWidth: 1920,
    videoHeight: 1080,
  },
  defaultDuration: 600,
  propSchema: [
    { name: "bgOpacity", label: "背景透明度(0=透明叠加视频)", type: "number" },
    { name: "bgStart", label: "背景渐变-深色", type: "text" },
    { name: "bgEnd", label: "背景渐变-暖色", type: "text" },
    { name: "accentColor", label: "主强调色(螺蛳粉)", type: "color" },
    { name: "textColor", label: "文字颜色", type: "text" },
    { name: "textStroke", label: "文字描边强度(0-1)", type: "number" },
    { name: "bottomMask", label: "底部蒙版强度(0-1)", type: "number" },
    { name: "fontScale", label: "全局字体缩放(0.6-1.4)", type: "number" },
    { name: "videoWidth", label: "视频宽度(兜底)", type: "number" },
    { name: "videoHeight", label: "视频高度(兜底)", type: "number" },
  ],
};

registerComponent(manifest);

export default manifest;
