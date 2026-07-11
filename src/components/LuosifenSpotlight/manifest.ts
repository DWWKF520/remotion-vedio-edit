import { LuosifenSpotlight } from "./index";
import { registerComponent } from "../../editor/registry";
import type { ComponentManifest } from "../../editor/registry-types";

const manifest: ComponentManifest = {
  key: "luosifenSpotlight",
  name: "螺蛳粉短视频",
  description:
    "复刻 7月9日(3).mp4：黑底知危水印 + 白色卡片（碗+滑动条+复选框+红色卡通手光标）+ 字幕条 + 红白标题，依次拖动辣度/臭味滑动条、取消螺蛳勾选、过渡到「产品创新」单碗聚光、再展示 4 款产品并排",
  icon: "🍜",
  accentColor: "#e53935",
  component: LuosifenSpotlight as unknown as ComponentManifest["component"],
  defaultProps: {
    headlineTop: "螺蛳粉门店量追上雪王",
    headlineBottom: "这个臭臭的小吃为啥",
    headlineAccent: "这么强?",
    captions:
      "比如在北方城市,很多品牌都降低了辣度,有的品牌汤底里面,干脆就没有放'螺蛳',也衍生出干捞螺蛳粉,鹿茸菌螺蛳粉,改良成了'融合菜'",
    brandText: "知危",

    spicinessDragStart: 30,
    spicinessDragEnd: 120,
    smellDragStart: 180,
    smellDragEnd: 240,
    uncheckStart: 270,
    uncheckEnd: 330,
    transitionStart: 330,
    productRowStart: 420,
    productStagger: 25,

    bowlImage: "luosifen/螺蛳粉碗.png",
    productImages: "干捞螺蛳粉,骨汤螺蛳粉,鹿茸菌螺蛳粉,麻酱螺蛳粉",
    productNames: "干捞螺蛳粉,骨汤螺蛳粉,鹿茸菌螺蛳粉,麻酱螺蛳粉",

    backgroundColor: "#000000",
    cardColor: "#ffffff",
    textColor: "#1a1a1a",
    accentColor: "#e53935",
    checkboxColor: "#e53935",
    sliderTrackColor: "#d6d6d6",
    sliderHandleColor: "#ffffff",
    sliderHandleBorderColor: "#3a3a3a",
    captionBarColor: "#ffffff",
    watermarkColor: "rgba(255,255,255,0.12)",
  },
  defaultDuration: 582,
  propSchema: [
    { name: "headlineTop", label: "标题第一行", type: "text" },
    { name: "headlineBottom", label: "标题第二行前缀", type: "text" },
    { name: "headlineAccent", label: "标题第二行强调", type: "text" },
    {
      name: "captions",
      label: "字幕列表(逗号分隔)",
      type: "text",
    },
    { name: "brandText", label: "品牌文字(知危)", type: "text" },

    { name: "spicinessDragStart", label: "辣度开始拖动帧", type: "number" },
    { name: "spicinessDragEnd", label: "辣度结束拖动帧", type: "number" },
    { name: "smellDragStart", label: "臭味开始拖动帧", type: "number" },
    { name: "smellDragEnd", label: "臭味结束拖动帧", type: "number" },
    { name: "uncheckStart", label: "复选框点击开始帧", type: "number" },
    { name: "uncheckEnd", label: "复选框取消完成帧", type: "number" },
    { name: "transitionStart", label: "产品创新过渡开始帧", type: "number" },
    { name: "productRowStart", label: "产品并排开始帧", type: "number" },
    { name: "productStagger", label: "产品错开帧", type: "number" },

    { name: "bowlImage", label: "碗图片路径", type: "text" },
    { name: "productImages", label: "产品图片(逗号分隔)", type: "text" },
    { name: "productNames", label: "产品名称(逗号分隔)", type: "text" },

    { name: "backgroundColor", label: "背景色", type: "text" },
    { name: "cardColor", label: "卡片色", type: "text" },
    { name: "textColor", label: "文字色", type: "text" },
    { name: "accentColor", label: "强调色", type: "color" },
    { name: "checkboxColor", label: "复选框主色", type: "color" },
    { name: "sliderTrackColor", label: "滑动条轨道色", type: "text" },
    { name: "sliderHandleColor", label: "滑动条手柄色", type: "text" },
    { name: "sliderHandleBorderColor", label: "手柄边框色", type: "text" },
    { name: "captionBarColor", label: "字幕条色", type: "text" },
    { name: "watermarkColor", label: "水印色", type: "text" },
  ],
};

registerComponent(manifest);

export default manifest;
