import { VideoClip } from "./index";
import { registerComponent } from "../../../editor/registry";
import type { ComponentManifest } from "../../../editor/registry-types";

const manifest: ComponentManifest = {
  key: "videoClip",
  name: "视频片段",
  description:
    "把 .mp4 / .webm 视频文件作为可拖入时间线的素材。默认指向 /uploads/智谱清言.mp4（5.13s），可改 src 切换其他视频。",
  icon: "🎬",
  accentColor: "#8b5cf6",
  hidden: true,
  component: VideoClip as unknown as ComponentManifest["component"],
  defaultProps: {
    src: "/uploads/智谱清言.mp4",
    volume: 1,
    muted: 0,
    playbackRate: 1,
    startFrom: 0,
    fit: "contain",
    backgroundColor: "#000000",
    positionX: 50,
    positionY: 50,
    scale: 1,
    borderRadius: 0,
    showShadow: 1,
    videoWidth: 1920,
    videoHeight: 1080,
    effects: [],
  },
  // 5.13s @ 30fps = 154 帧，对应默认视频
  defaultDuration: 154,
  propSchema: [
    { name: "src", label: "视频路径(/uploads/xxx.mp4 或 URL)", type: "text" },
    { name: "volume", label: "音量(0-1)", type: "number" },
    { name: "muted", label: "静音(1/0)", type: "number" },
    { name: "playbackRate", label: "播放速率(0.25-4)", type: "number" },
    { name: "startFrom", label: "从第几秒开始截取", type: "number" },
    {
      name: "fit",
      label: "适配方式(contain/cover/fill)",
      type: "text",
    },
    { name: "backgroundColor", label: "背景色(transparent=透明)", type: "text" },
    { name: "positionX", label: "水平位置%(0-100)", type: "number" },
    { name: "positionY", label: "垂直位置%(0-100)", type: "number" },
    { name: "scale", label: "画面缩放(0.1-2)", type: "number" },
    { name: "borderRadius", label: "圆角(像素)", type: "number" },
    { name: "showShadow", label: "显示投影(1/0)", type: "number" },
    { name: "videoWidth", label: "视频宽度(兜底)", type: "number" },
    { name: "videoHeight", label: "视频高度(兜底)", type: "number" },
  ],
};

registerComponent(manifest);

export default manifest;
