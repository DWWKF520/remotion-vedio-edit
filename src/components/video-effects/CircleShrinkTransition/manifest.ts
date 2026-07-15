import { CircleShrinkTransition } from "./index";
import { registerComponent } from "../../../editor/registry";
import type { ComponentManifest } from "../../../editor/registry-types";

const manifest: ComponentManifest = {
  key: "circleShrinkTransition",
  name: "形状收缩转场",
  description:
    "视频被形状（圆形/正方形/长方形/圆角方形）框住，然后缩小到目标位置的转场效果。支持鼠标拖动调整位置和大小。",
  icon: "⭕",
  accentColor: "#007aff",
  hidden: true,
  component: CircleShrinkTransition as unknown as ComponentManifest["component"],
  defaultProps: {
    src: "",
    shape: "circle",
    rectAspect: 1.78,
    cornerRadius: 24,
    contentMode: "scale",
    finalX: 12,
    finalY: 82,
    finalRadius: 100,
    shrinkDuration: 18,
    borderWidth: 5,
    borderColor: "#FFFFFF00",
    glowIntensity: 0.8,
    bgDim: 0.4,
    bgVideoOpacity: 0,
    objectFit: "cover",
    volume: 1,
    muted: 0,
    startFrom: 0,
  },
  defaultDuration: 60,
  propSchema: [
    { name: "src", label: "视频路径", type: "text" },
    { name: "shape", label: "形状", type: "select", options: [
      { label: "圆形", value: "circle" },
      { label: "正方形", value: "square" },
      { label: "长方形", value: "rect" },
      { label: "圆角方形", value: "rounded" },
    ]},
    { name: "rectAspect", label: "长方形宽高比(仅rect)", type: "number" },
    { name: "cornerRadius", label: "圆角半径(仅rounded)", type: "number" },
    { name: "contentMode", label: "内容模式", type: "select", options: [
      { label: "缩放(scale)", value: "scale" },
      { label: "裁剪(crop)", value: "crop" },
    ]},
    { name: "objectFit", label: "填充方式", type: "select", options: [
      { label: "填满(cover)", value: "cover" },
      { label: "完整(contain)", value: "contain" },
    ]},
    { name: "finalX", label: "目标位置X%(0-100)", type: "number" },
    { name: "finalY", label: "目标位置Y%(0-100)", type: "number" },
    { name: "finalRadius", label: "形状半径/半宽(=缩小后视频大小)", type: "number" },
    { name: "shrinkDuration", label: "收缩动画帧数", type: "number" },
    { name: "borderWidth", label: "边框宽度(像素)", type: "number" },
    { name: "borderColor", label: "边框颜色", type: "color" },
    { name: "glowIntensity", label: "外发光强度(0-1)", type: "number" },
    { name: "bgDim", label: "背景变暗(0-1)", type: "number" },
    { name: "bgVideoOpacity", label: "底层视频显示(0-1)", type: "number" },
    { name: "volume", label: "音量(0-1)", type: "number" },
    { name: "muted", label: "静音(1/0)", type: "number" },
    { name: "startFrom", label: "视频起始(秒)", type: "number" },
  ],
};

registerComponent(manifest);

export default manifest;