import { HelloWorld } from "./";
import { registerComponent } from "../../../editor/registry";
import type { ComponentManifest } from "../../../editor/registry-types";

const manifest: ComponentManifest = {
  key: "helloworld",
  name: "Hello World",
  description: "完整示例：Logo + 标题 + 字幕",
  icon: "🎬",
  accentColor: "#6366f1",
  component: HelloWorld as ComponentManifest["component"],
  defaultProps: {
    titleText: "Welcome to Remotion",
    titleColor: "#000000",
    logoColor1: "#91EAE4",
    logoColor2: "#86A8E7",
  },
  defaultDuration: 150,
  propSchema: [
    { name: "titleText", label: "Title Text", type: "text" },
    { name: "titleColor", label: "Title Color", type: "color" },
    { name: "logoColor1", label: "Logo Color 1", type: "color" },
    { name: "logoColor2", label: "Logo Color 2", type: "color" },
  ],
};

registerComponent(manifest);

export default manifest;
