import { ZoomReveal } from "./index";
import { registerComponent } from "../../../editor/registry";
import type { ComponentManifest } from "../../../editor/registry-types";

const manifest: ComponentManifest = {
  key: "zoomReveal",
  name: "缩放揭示",
  description:
    "参考 GSAP 滚动揭示 demo：上层覆盖图向镜头方向冲过去（scale+translateZ+perspective）并淡出，底层图同时轻微放大，形成「穿越封面 → 揭示底图」的过渡。原版用鼠标滚动驱动，这里改用时间轴（视频帧）驱动。",
  icon: "🎬",
  accentColor: "#6366f1",
  component: ZoomReveal as unknown as ComponentManifest["component"],
  defaultProps: {
    coverSrc:
      "https://assets-global.website-files.com/63ec206c5542613e2e5aa784/643312a6bc4ac122fc4e3afa_main%20home.webp",
    revealSrc:
      "https://images.unsplash.com/photo-1589848315097-ba7b903cc1cc?q=80&w=2070&auto=format&fit=crop",
    coverScale: 2,
    coverZ: 350,
    revealScale: 1.1,
    perspective: 500,
    startFrame: 0,
    revealDuration: 0,
    coverFadeStart: 0.6,
    easePower: 1,
    backgroundColor: "#0a0a0a",
    videoWidth: 1920,
    videoHeight: 1080,
  },
  defaultDuration: 150,
  propSchema: [
    { name: "coverSrc", label: "覆盖图地址（被揭开）", type: "text" },
    { name: "revealSrc", label: "底图地址（揭示出）", type: "text" },
    { name: "coverScale", label: "覆盖图最终缩放", type: "number" },
    { name: "coverZ", label: "覆盖图Z位移（冲向镜头）", type: "number" },
    { name: "revealScale", label: "底图最终缩放", type: "number" },
    { name: "perspective", label: "透视距离(px)", type: "number" },
    { name: "startFrame", label: "揭示起始帧", type: "number" },
    { name: "revealDuration", label: "揭示持续帧(0=整段)", type: "number" },
    { name: "coverFadeStart", label: "覆盖图淡出起点(0-1)", type: "number" },
    { name: "easePower", label: "缓动强度(1/2/3)", type: "number" },
    { name: "backgroundColor", label: "背景色（transparent=透明）", type: "text" },
    { name: "videoWidth", label: "视频宽度（兜底）", type: "number" },
    { name: "videoHeight", label: "视频高度（兜底）", type: "number" },
  ],
};

registerComponent(manifest);

export default manifest;
