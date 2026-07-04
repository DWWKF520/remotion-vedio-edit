// 简易 nanoid，避免引入额外依赖
// Math.random() 在 Remotion 渲染时会被 lint 警告，
// 但这里只用于生成 clip/track 的唯一 ID（与帧渲染无关），
// 因此用 random(null) 显式声明"非确定性"以绕过检查。
import { random } from "remotion";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function nanoid(size = 10): string {
  let out = "";
  for (let i = 0; i < size; i++) {
    out += ALPHABET[Math.floor(random(null) * ALPHABET.length)];
  }
  return out;
}
