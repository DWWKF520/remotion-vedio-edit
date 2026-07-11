import { LuosifenAnimation } from "./index";
import { registerComponent } from "../../editor/registry";
import type { ComponentManifest } from "../../editor/registry-types";

const manifest: ComponentManifest = {
  key: "luosifenAnimation",
  name: "螺蛳粉动画",
  description:
    "复刻 demo：北方背景 + 螺蛳粉碗 + 辣度/臭味 spring 滑动条 + 自动取消勾选 + 4 个产品依次淡入",
  icon: "🍜",
  accentColor: "#e53935",
  component: LuosifenAnimation as unknown as ComponentManifest["component"],
  defaultProps: {
    titleText: "知危",
    spicinessLabel: "辣度",
    spicinessIcon: "🌶️",
    smellLabel: "臭味",
    smellIcon: "🧄",
    checkboxLabel: "螺蛳",
    product1Name: "干捞螺蛳粉",
    product2Name: "骨汤螺蛳粉",
    product3Name: "鹿茸菌螺蛳粉",
    product4Name: "麻酱螺蛳粉",

    spicinessStartFrame: 30,
    smellStartFrame: 60,
    checkboxUncheckFrame: 120,
    product1Delay: 150,
    product2Delay: 180,
    product3Delay: 210,
    product4Delay: 240,

    springDamping: 200,
    springStiffness: 200,

    backgroundColor: "#000000",
    titleColor: "#ffffff",
    textColor: "#ffffff",
    sliderTrackColor: "rgba(255,255,255,0.4)",
    sliderHandleColor: "#ffffff",
    sliderHandleBorderColor: "#333333",
    checkboxColor: "#e53935",

    bowlTop: 80,
    bowlSize: 280,
    sliderLeft: 100,
    sliderTrackWidth: 260,
    productTop: 640,
    productSize: 160,
  },
  defaultDuration: 280,
  propSchema: [
    { name: "titleText", label: "标题", type: "text" },
    { name: "spicinessLabel", label: "辣度标签", type: "text" },
    { name: "spicinessIcon", label: "辣度图标(emoji)", type: "text" },
    { name: "smellLabel", label: "臭味标签", type: "text" },
    { name: "smellIcon", label: "臭味图标(emoji)", type: "text" },
    { name: "checkboxLabel", label: "复选框标签", type: "text" },
    { name: "product1Name", label: "产品1名称", type: "text" },
    { name: "product2Name", label: "产品2名称", type: "text" },
    { name: "product3Name", label: "产品3名称", type: "text" },
    { name: "product4Name", label: "产品4名称", type: "text" },

    { name: "spicinessStartFrame", label: "辣度滑动起始帧", type: "number" },
    { name: "smellStartFrame", label: "臭味滑动起始帧", type: "number" },
    { name: "checkboxUncheckFrame", label: "复选框取消帧", type: "number" },
    { name: "product1Delay", label: "产品1延迟帧", type: "number" },
    { name: "product2Delay", label: "产品2延迟帧", type: "number" },
    { name: "product3Delay", label: "产品3延迟帧", type: "number" },
    { name: "product4Delay", label: "产品4延迟帧", type: "number" },

    { name: "springDamping", label: "弹簧阻尼", type: "number" },
    { name: "springStiffness", label: "弹簧刚度", type: "number" },

    { name: "backgroundColor", label: "画布底色", type: "text" },
    { name: "titleColor", label: "标题颜色", type: "text" },
    { name: "textColor", label: "文字颜色", type: "text" },
    { name: "sliderTrackColor", label: "滑动条轨道色", type: "text" },
    { name: "sliderHandleColor", label: "滑动条手柄色", type: "text" },
    { name: "sliderHandleBorderColor", label: "手柄边框色", type: "text" },
    { name: "checkboxColor", label: "复选框主色", type: "color" },

    { name: "bowlTop", label: "碗顶距(px)", type: "number" },
    { name: "bowlSize", label: "碗尺寸(px)", type: "number" },
    { name: "sliderLeft", label: "滑动条左边距(px)", type: "number" },
    { name: "sliderTrackWidth", label: "滑动条宽度(px)", type: "number" },
    { name: "productTop", label: "产品顶距(px)", type: "number" },
    { name: "productSize", label: "产品图尺寸(px)", type: "number" },
  ],
};

registerComponent(manifest);

export default manifest;
