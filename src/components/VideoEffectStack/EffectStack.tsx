import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { EFFECT_WRAPPERS } from "./registry";
import type { VideoEffectItem } from "./types";

/**
 * 效果栈渲染器
 * 按顺序嵌套所有效果包装组件，形成"洋葱"结构：
 * Effect[0] > Effect[1] > ... > children
 *
 * 数组中第0个是最外层（最先应用），最后一个是最内层（最后应用，直接包裹children）
 */
export const EffectStack: React.FC<{
  effects: VideoEffectItem[];
  children: React.ReactNode;
}> = ({ effects, children }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // 从内向外构建：children 被最后一个效果包裹，再被前一个包裹...
  let content = children;

  // 倒序遍历：最后一个效果是最内层，直接包 children
  for (let i = effects.length - 1; i >= 0; i--) {
    const effect = effects[i];
    const Wrapper = EFFECT_WRAPPERS[effect.type];
    if (!Wrapper) continue;
    content = (
      <Wrapper
        params={effect.params}
        frame={frame}
        fps={fps}
        width={width}
        height={height}
      >
        {content}
      </Wrapper>
    );
  }

  return <>{content}</>;
};
