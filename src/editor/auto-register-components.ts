// 该文件集中 import 所有组件 manifest，触发 registerComponent 副作用。
//
// Vite 端：被 main.tsx 引入后，由 registry.tsx 的 import.meta.glob 自动接管，无需此文件真正起作用。
// Remotion/bundler 端：import.meta.glob 不可用，由本文件显式导入保证 manifest 全部被加载。
//
// 新增组件时，在下方追加一行 import。
import "../components/ui/HelloWorld/manifest";
import "../components/clips/SubtitleClip/manifest";
import "../components/clips/SubtitleTrack/manifest";
import "../components/ui/ClaudeType/manifest";
import "../components/ui/Wechat2DRender/manifest";
import "../components/ui/RulerProgressRender/manifest";
import "../components/ui/LightSpotlight/manifest";
import "../components/ui/SalaryCompare/manifest";
import "../components/ui/SpeakingPerson/manifest";
import "../components/ui/ReportHighlight/manifest";
import "../components/ui/LuosifenNarrationClip/manifest";
import "../components/ui/ZoomReveal/manifest";
import "../components/clips/VideoClip/manifest";
import "../components/clips/ImageClip/manifest";
import "../components/video-effects/CircleShrinkTransition/manifest";
import "../components/video-effects/SlideRightTransition/manifest";
