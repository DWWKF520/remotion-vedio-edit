import { SpeakingPerson } from "./index";
import { registerComponent } from "../../editor/registry";
import type { ComponentManifest } from "../../editor/registry-types";

const manifest: ComponentManifest = {
  key: "speakingPerson",
  name: "人物开口说话",
  description:
    "使用 public/uploads 下 4 张图片循环切换，模拟人物说话时嘴巴开合的效果",
  icon: "🗣️",
  accentColor: "#f472b6",
  component: SpeakingPerson as unknown as ComponentManifest["component"],
  defaultProps: {
    switchInterval: 6,
    imageScale: 1,
    positionX: 50,
    positionY: 50,
    borderRadius: 0,
    backgroundColor: "#1a1a22",
    showShadow: 1,
    cycleOrder: "1,2,3,4",
    enterAnimation: 1,
    videoWidth: 1920,
    videoHeight: 1080,
  },
  defaultDuration: 180,
  propSchema: [
    {
      name: "switchInterval",
      label: "嘴巴切换间隔(帧)",
      type: "number",
    },
    {
      name: "imageScale",
      label: "图片缩放(0.1-2.0)",
      type: "number",
    },
    {
      name: "positionX",
      label: "水平位置%(0-100)",
      type: "number",
    },
    {
      name: "positionY",
      label: "垂直位置%(0-100)",
      type: "number",
    },
    {
      name: "borderRadius",
      label: "圆角(像素)",
      type: "number",
    },
    {
      name: "backgroundColor",
      label: "背景色(transparent=透明)",
      type: "text",
    },
    { name: "showShadow", label: "显示投影(1/0)", type: "number" },
    {
      name: "cycleOrder",
      label: "循环顺序(逗号分隔1-4)",
      type: "text",
    },
    { name: "enterAnimation", label: "入场动画(1/0)", type: "number" },
    { name: "videoWidth", label: "视频宽度(兜底)", type: "number" },
    { name: "videoHeight", label: "视频高度(兜底)", type: "number" },
  ],
};

registerComponent(manifest);

export default manifest;
