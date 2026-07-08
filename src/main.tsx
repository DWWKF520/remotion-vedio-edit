import React from "react";
import { createRoot } from "react-dom/client";
import "./editor/auto-register-components";
import { EditorApp } from "./editor/editor";
import "./index.css";

// 编辑器入口：作为普通 React 应用挂载到 #root。
// 不使用 Remotion Studio，预览由 @remotion/player 渲染。
const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root not found");
createRoot(rootEl).render(
  <React.StrictMode>
    <EditorApp />
  </React.StrictMode>,
);
