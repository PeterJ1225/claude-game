// Tauri 桌面壳前置检查（SPEC M0.5）：缺 Rust 工具链时给明确提示并退出，不影响 `npm run dev`。
import { execSync } from 'node:child_process';

try {
  execSync('cargo --version', { stdio: 'ignore' });
} catch {
  console.error('\n[前置检查] 未检测到 Rust 工具链（cargo / rustc）。Tauri 桌面壳需要：');
  console.error('  1) Rust：https://rustup.rs');
  console.error('  2) Windows：Visual Studio Build Tools（含 MSVC 与 Windows SDK）');
  console.error('  3) WebView2 Runtime（Win10/11 通常自带）');
  console.error('安装后重试 `npm run tauri:dev`。');
  console.error('浏览器开发不受影响：直接 `npm run dev`。\n');
  process.exit(1);
}
