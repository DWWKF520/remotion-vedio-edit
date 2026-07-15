import { ClaudeType } from "./";
import { registerComponent } from "../../../editor/registry";
import type { ComponentManifest } from "../../../editor/registry-types";

const manifest: ComponentManifest = {
  key: "claudeType",
  name: "Claude 打字机",
  description: "Claude 风格的 AI 聊天打字动画，逐字显示回复",
  icon: "🤖",
  accentColor: "#D97757",
  component: ClaudeType as ComponentManifest["component"],
  defaultProps: {
    prompt: "What is Remotion?",
    response:
      "Remotion is a framework for creating videos programmatically using React. It allows you to use all the power of React — components, hooks, state — to create dynamic, data-driven videos.",
    accentColor: "#D97757",
    speed: 2,
    thinkingFrames: 30,
    fontSize: 24,
    borderRadius: 16,
  },
  defaultDuration: 300,
  propSchema: [
    { name: "prompt", label: "用户提问", type: "text" },
    { name: "response", label: "Claude 回复", type: "textarea" },
    { name: "accentColor", label: "主题色", type: "color" },
    { name: "speed", label: "打字速度(帧/字)", type: "number" },
    { name: "thinkingFrames", label: "思考停顿(帧)", type: "number" },
    { name: "fontSize", label: "字体大小", type: "number" },
    { name: "borderRadius", label: "窗口圆角", type: "number" },
  ],
};

registerComponent(manifest);

export default manifest;
