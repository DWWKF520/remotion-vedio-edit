import { LuosifenNarrationClip } from "./index";
import { registerComponent } from "../../../editor/registry";
import type { ComponentManifest } from "../../../editor/registry-types";

const manifest: ComponentManifest = {
  key: "luosifenNarration",
  name: "螺蛳粉解说特效",
  description:
    "16:9 布局下，左上角显示产业关键数据（813亿规模、5.1万家店、15-25元价位），右上角展示产业化时间线（2010→2018），中间区域留空不遮挡人物，使用 GSAP 实现动画",
  icon: "🍜",
  accentColor: "#ff6b35",
  component: LuosifenNarrationClip as unknown as ComponentManifest["component"],
  defaultProps: {
    dataStartFrame: 0,
    timelineStartFrame: 0,
    dataDuration: 180,
    timelineInterval: 45,
    dataCardColor: "rgba(0, 0, 0, 0.75)",
    timelineColor: "rgba(255, 255, 255, 0.15)",
    textColor: "#ffffff",
    accentColor: "#ff6b35",
    cardOpacity: 1,
    timelineOpacity: 1,
    enableGsapAnimation: 1,
    videoWidth: 1920,
    videoHeight: 1080,
  },
  defaultDuration: 2100,
  propSchema: [
    { name: "dataStartFrame", label: "数据卡片起始帧", type: "number" },
    { name: "timelineStartFrame", label: "时间线起始帧", type: "number" },
    { name: "dataDuration", label: "数据卡片持续帧数", type: "number" },
    { name: "timelineInterval", label: "时间线节点切换间隔(帧)", type: "number" },
    { name: "dataCardColor", label: "数据卡片背景色", type: "text" },
    { name: "timelineColor", label: "时间线背景色", type: "text" },
    { name: "textColor", label: "文字颜色", type: "color" },
    { name: "accentColor", label: "高亮颜色", type: "color" },
    { name: "cardOpacity", label: "卡片透明度(0-1)", type: "number" },
    { name: "timelineOpacity", label: "时间线透明度(0-1)", type: "number" },
    { name: "enableGsapAnimation", label: "启用GSAP动画(1/0)", type: "number" },
    { name: "videoWidth", label: "视频宽度(兜底)", type: "number" },
    { name: "videoHeight", label: "视频高度(兜底)", type: "number" },
  ],
};

registerComponent(manifest);

export default manifest;