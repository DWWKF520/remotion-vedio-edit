import { SlideRightTransition } from "./index";
import { registerComponent } from "../../../editor/registry";
import type { ComponentManifest } from "../../../editor/registry-types";

const manifest: ComponentManifest = {
  key: "slideRightTransition",
  name: "视频右移渐变",
  description:
    "视频向右移动并缩小，左边缘叠加颜色渐变蒙版与背景平滑过渡，左侧露出区域可叠加讲解动画。",
  icon: "➡️",
  accentColor: "#34c759",
  hidden: true,
  component: SlideRightTransition as unknown as ComponentManifest["component"],
  defaultProps: {
    src: "",
    slideDistance: 35,
    slideDuration: 20,
    finalScale: 0.72,
    scaleOrigin: "left",
    bgColor: "#0a0a1a",
    bgGradient: "",
    gradientColor: "#0a0a1a",
    gradientWidth: 18,
    gradientOpacity: 1,
    borderRadius: 16,
    shadow: 0.5,
    videoOpacity: 1,
    objectFit: "cover",
    volume: 1,
    muted: 0,
    startFrom: 0,
    playbackRate: 1,
  },
  defaultDuration: 90,
  propSchema: [
    { name: "src", label: "视频路径(/uploads/xxx.mp4)", type: "text" },
    { name: "slideDistance", label: "右移距离%(0-100)", type: "number" },
    { name: "slideDuration", label: "滑动帧数", type: "number" },
    { name: "finalScale", label: "最终缩放(0.1-2)", type: "number" },
    {
      name: "scaleOrigin",
      label: "缩放原点",
      type: "select",
      options: [
        { label: "左边缘(left)", value: "left" },
        { label: "中心(center)", value: "center" },
        { label: "右边缘(right)", value: "right" },
      ],
    },
    { name: "bgColor", label: "背景色(transparent=透明)", type: "text" },
    { name: "bgGradient", label: "背景渐变CSS(优先)", type: "text" },
    { name: "gradientColor", label: "渐变蒙版颜色", type: "color" },
    { name: "gradientWidth", label: "渐变蒙版宽度%(0-50)", type: "number" },
    { name: "gradientOpacity", label: "渐变蒙版透明度(0-1)", type: "number" },
    { name: "borderRadius", label: "圆角(像素)", type: "number" },
    { name: "shadow", label: "投影强度(0-1)", type: "number" },
    { name: "videoOpacity", label: "视频透明度(0-1)", type: "number" },
    {
      name: "objectFit",
      label: "填充方式",
      type: "select",
      options: [
        { label: "填满(cover)", value: "cover" },
        { label: "完整(contain)", value: "contain" },
      ],
    },
    { name: "volume", label: "音量(0-1)", type: "number" },
    { name: "muted", label: "静音(1/0)", type: "number" },
    { name: "startFrom", label: "视频起始(秒)", type: "number" },
    { name: "playbackRate", label: "播放速率(0.25-4)", type: "number" },
  ],
};

registerComponent(manifest);

export default manifest;
