// 该文件集中 import 所有组件 manifest，触发 registerComponent 副作用。
//
// Vite 端：被 main.tsx 引入后，由 registry.tsx 的 import.meta.glob 自动接管，无需此文件真正起作用。
// Remotion/bundler 端：import.meta.glob 不可用，由本文件显式导入保证 manifest 全部被加载。
//
// 新增组件时，在下方追加一行 import。
import "../components/HelloWorld/manifest";
import "../components/SubtitleClip/manifest";
import "../components/SubtitleTrack/manifest";
import "../components/ClaudeType/manifest";
import "../components/Wechat2DRender/manifest";
import "../components/RulerProgressRender/manifest";
import "../components/LightSpotlight/manifest";
import "../components/SalaryCompare/manifest";
import "../components/SpeakingPerson/manifest";
import "../components/ReportHighlight/manifest";
import "../components/LuosifenAnimation/manifest";
import "../components/LuosifenSpotlight/manifest";
