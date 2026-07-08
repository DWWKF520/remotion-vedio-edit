import { SalaryCompare } from "../SalaryCompare";
import { registerComponent } from "../../editor/registry";
import type { ComponentManifest } from "../../editor/registry-types";

const manifest: ComponentManifest = {
  key: "salaryCompare",
  name: "中美收入对比",
  description:
    "科普可视化：月薪1万美元在中国算什么水平 + 中美购买力分品类对比（全球化商品/本地服务/食住行）",
  icon: "💰",
  accentColor: "#fbbf24",
  component: SalaryCompare as ComponentManifest["component"],
  defaultProps: {
    accentColor: "#fbbf24",
    chinaColor: "#dc2626",
    backgroundColor: "#0a0e1a",
    usdToCny: 7.2,
    fontSize: 1,
    title1: "月薪 1 万美元",
    title2: "在中国是什么水平？",
  },
  defaultDuration: 600,
  propSchema: [
    { name: "accentColor", label: "强调色（美元/收入）", type: "color" },
    { name: "chinaColor", label: "中国主题色", type: "color" },
    { name: "backgroundColor", label: "背景色", type: "color" },
    { name: "usdToCny", label: "USD → CNY 汇率", type: "number" },
    { name: "fontSize", label: "整体字体缩放(0.8-1.2)", type: "number" },
    { name: "title1", label: "主标题第一行", type: "text" },
    { name: "title2", label: "主标题第二行", type: "text" },
  ],
};

registerComponent(manifest);

export default manifest;
