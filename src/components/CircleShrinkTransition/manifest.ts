import { CircleShrinkTransition } from "./index";
import { registerComponent } from "../../editor/registry";
import type { ComponentManifest } from "../../editor/registry-types";

const manifest: ComponentManifest = {
  key: "circleShrinkTransition",
  name: "圆形收缩转场",
  description:
    "视频被圆形框住，然后缩小飞到左下角的转场效果。类似博主出镜转场，圆形高亮+白色边框+外发光。",
  icon: "⭕",
  accentColor: "#007aff",
  hidden: true,
  component: CircleShrinkTransition as unknown as ComponentManifest["component"],
  defaultProps: {
    src: "",
    contentMode: "scale",
    focusX: 20,
    focusY: 75,
    focusRadius: 220,
    finalX: 12,
    finalY: 82,
    finalRadius: 100,
    shrinkDuration: 18,
    flyDelay: 6,
    flyDuration: 30,
    borderWidth: 5,
    borderColor: "#ffffff",
    glowIntensity: 0.8,
    bgDim: 0.4,
    bgVideoOpacity: 1,
    objectFit: "cover",
    volume: 1,
    muted: 0,
    startFrom: 0,
  },
  // 默认 2 秒（60 帧 @30fps），用户可以拉长时间保持小圆形画面
  defaultDuration: 60,
  propSchema: [
    { name: "src", label: "视频路径", type: "text" },
    { name: "contentMode", label: "内容模式(scale/crop)", type: "text" },
    { name: "objectFit", label: "填充方式(cover/contain)", type: "text" },
    { name: "focusX", label: "聚焦点X%(0-100)", type: "number" },
    { name: "focusY", label: "聚焦点Y%(0-100)", type: "number" },
    { name: "focusRadius", label: "聚焦半径(像素)", type: "number" },
    { name: "finalX", label: "最终位置X%(0-100)", type: "number" },
    { name: "finalY", label: "最终位置Y%(0-100)", type: "number" },
    { name: "finalRadius", label: "最终半径(像素)", type: "number" },
    { name: "shrinkDuration", label: "收缩动画帧数", type: "number" },
    { name: "flyDelay", label: "飞行延迟帧数", type: "number" },
    { name: "flyDuration", label: "飞行动画帧数", type: "number" },
    { name: "borderWidth", label: "边框宽度(像素)", type: "number" },
    { name: "borderColor", label: "边框颜色", type: "text" },
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
