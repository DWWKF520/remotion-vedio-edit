import { ImageClip } from "./index";
import { registerComponent } from "../../../editor/registry";
import type { ComponentManifest } from "../../../editor/registry-types";

const manifest: ComponentManifest = {
  key: "imageClip",
  name: "图片片段",
  description:
    "把图片作为可拖入时间线的素材。固定 5 秒时长，支持 Ken Burns 推进效果、淡入淡出、旋转、缩放。",
  icon: "🖼️",
  accentColor: "#34c759",
  hidden: true,
  component: ImageClip as unknown as ComponentManifest["component"],
  defaultProps: {
    src: "",
    fit: "contain",
    positionX: 50,
    positionY: 50,
    scale: 1,
    rotate: 0,
    opacity: 1,
    borderRadius: 0,
    backgroundColor: "transparent",
    showShadow: 0,
    kenBurns: 0,
    fadeIn: 10,
    fadeOut: 10,
  },
  // 固定 5 秒 @ 30fps = 150 帧
  defaultDuration: 150,
  propSchema: [
    { name: "src", label: "图片路径", type: "text" },
    { name: "fit", label: "适配(contain/cover/fill/none)", type: "text" },
    { name: "positionX", label: "水平位置%(0-100)", type: "number" },
    { name: "positionY", label: "垂直位置%(0-100)", type: "number" },
    { name: "scale", label: "缩放(0.1-5)", type: "number" },
    { name: "rotate", label: "旋转角度", type: "number" },
    { name: "opacity", label: "透明度(0-1)", type: "number" },
    { name: "borderRadius", label: "圆角(像素)", type: "number" },
    { name: "backgroundColor", label: "背景色", type: "text" },
    { name: "showShadow", label: "显示投影(1/0)", type: "number" },
    { name: "kenBurns", label: "Ken Burns推进(1/0)", type: "number" },
    { name: "fadeIn", label: "淡入帧数", type: "number" },
    { name: "fadeOut", label: "淡出帧数", type: "number" },
  ],
};

registerComponent(manifest);

export default manifest;
