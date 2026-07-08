import type { ComponentManifest } from "./registry-types";

/**
 * 组件注册表 —— 通过副作用自动注册。
 *
 * 工作机制：
 * - 每个组件的 manifest.ts 加载时调用 registerComponent(manifest)
 * - 自动触发入口：src/editor/auto-register-components.ts（已在其中 import 所有 manifest）
 *   - Vite 端：在 main.tsx 顶部 import "./editor/auto-register-components"
 *   - Remotion/bundler 端：在 Root.tsx 顶部 import "./editor/auto-register-components"
 *
 * 加新组件步骤：
 *   1. 写 src/components/<Name>/index.tsx
 *   2. 写 src/components/<Name>/manifest.ts（默认导出 manifest，调用 registerComponent）
 *   3. 在 src/editor/auto-register-components.ts 追加一行 import
 *
 * 实现说明：注册数据放在 globalThis 上的一个数组中，而不是模块顶层 const。
 * 因为 manifest -> registerComponent -> registry 模块在循环 import 期间被触发，
 * 此时 const/let 顶层声明处于 TDZ，访问会抛错。globalThis 始终可用，绕开 TDZ。
 */
const REG_KEY = "__my_video_component_registry__";
type RegItems = ComponentManifest[];
type GlobalWithRegistry = typeof globalThis & {
  [REG_KEY]?: RegItems;
};

function getItems(): RegItems {
  const g = globalThis as GlobalWithRegistry;
  if (!g[REG_KEY]) g[REG_KEY] = [];
  return g[REG_KEY];
}

/**
 * 注册一个组件 manifest。manifest 模块加载时被调用。
 * 同 key 后注册会覆盖前注册，便于覆盖默认 manifest。
 */
export function registerComponent(def: ComponentManifest): void {
  const items = getItems();
  const idx = items.findIndex((c) => c.key === def.key);
  if (idx >= 0) items[idx] = def;
  else items.push(def);
}

export function getComponentDef(
  key: string,
): ComponentManifest | undefined {
  return getItems().find((c) => c.key === key);
}

/**
 * 兼容老 API：导出一个 readonly 视图，方法直接代理到内部数组。
 * 不直接导出数组避免外部 .push 等绕过覆盖逻辑。
 */
export const registry = {
  get length(): number {
    return getItems().length;
  },
  forEach(cb: (item: ComponentManifest, index: number) => void): void {
    getItems().forEach(cb);
  },
  filter(
    pred: (item: ComponentManifest) => boolean,
  ): ComponentManifest[] {
    return getItems().filter(pred);
  },
  find(
    pred: (item: ComponentManifest) => boolean,
  ): ComponentManifest | undefined {
    return getItems().find(pred);
  },
  map<T>(fn: (item: ComponentManifest, index: number) => T): T[] {
    return getItems().map(fn);
  },
  some(pred: (item: ComponentManifest) => boolean): boolean {
    return getItems().some(pred);
  },
  [Symbol.iterator](): IterableIterator<ComponentManifest> {
    return getItems()[Symbol.iterator]();
  },
} as const;
