import { Wechat2DRender } from "./";
import { registerComponent } from "../../../editor/registry";
import type { ComponentManifest } from "../../../editor/registry-types";

const manifest: ComponentManifest = {
  key: "wechat2d",
  name: "微信二维码",
  description: "微信风格二维码渲染，支持扫描线、呼吸光效、中心Logo",
  icon: "💚",
  accentColor: "#07C160",
  component: Wechat2DRender as ComponentManifest["component"],
  defaultProps: {
    qrSize: 400,
    fgColor: "#1a1a1a",
    bgColor: "#ffffff",
    wechatColor: "#07C160",
    logoText: "微信",
    logoFontSize: 20,
    moduleCount: 33,
    seed: 42,
    dataLevel: 1,
    showScanLine: 1,
    showGlow: 1,
    hintText: "长按识别二维码",
    hintColor: "#07C160",
    hintFontSize: 16,
    borderRadius: 12,
    showBorder: 1,
  },
  defaultDuration: 300,
  propSchema: [
    { name: "qrSize", label: "二维码尺寸", type: "number" },
    { name: "fgColor", label: "前景色", type: "color" },
    { name: "bgColor", label: "背景色", type: "color" },
    { name: "wechatColor", label: "微信主题色", type: "color" },
    { name: "logoText", label: "Logo文字", type: "text" },
    { name: "logoFontSize", label: "Logo字体大小", type: "number" },
    { name: "moduleCount", label: "模块数量(密度)", type: "number" },
    { name: "seed", label: "随机种子", type: "number" },
    { name: "dataLevel", label: "数据密度(0-3)", type: "number" },
    { name: "showScanLine", label: "扫描线(1/0)", type: "number" },
    { name: "showGlow", label: "呼吸光效(1/0)", type: "number" },
    { name: "hintText", label: "提示文字", type: "text" },
    { name: "hintColor", label: "提示文字颜色", type: "color" },
    { name: "hintFontSize", label: "提示文字大小", type: "number" },
    { name: "borderRadius", label: "圆角", type: "number" },
    { name: "showBorder", label: "白色边框(1/0)", type: "number" },
  ],
};

registerComponent(manifest);

export default manifest;
