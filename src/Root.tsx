import "./index.css";
import "./editor/auto-register-components";
import { Composition } from "remotion";
import { HelloWorld, myCompSchema } from "./components/ui/HelloWorld";
import { Logo, myCompSchema2 } from "./components/ui/HelloWorld/Logo";
import { CompositionRenderer } from "./editor/renderer";

// 编辑器本身作为普通 React 应用运行（见 src/main.tsx + Vite），
// 不再注册为 Composition。
//
// 这里的 Composition 仅供：
// 1. `remotion render` 命令导出单个视频
// 2. 编辑器的"导出"按钮通过 /api/export 调用 @remotion/renderer 渲染
//
// EditorExport 接收 inputProps（tracks/clips），由导出 API 传入当前编辑器状态。
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="EditorExport"
        component={CompositionRenderer}
        // 占位值，实际导出时由 selectComposition + 修改 durationInFrames 覆盖
        durationInFrames={600}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          tracks: [],
          clips: {},
        }}
      />

      <Composition
        // You can take the "id" to render a video:
        // npx remotion render HelloWorld
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        schema={myCompSchema}
        defaultProps={{
          titleText: "Welcome to Remotion",
          titleColor: "#000000",
          logoColor1: "#91EAE4",
          logoColor2: "#86A8E7",
        }}
      />

      <Composition
        id="OnlyLogo"
        component={Logo}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        schema={myCompSchema2}
        defaultProps={{
          logoColor1: "#91dAE2" as const,
          logoColor2: "#86A8E7" as const,
        }}
      />
    </>
  );
};
