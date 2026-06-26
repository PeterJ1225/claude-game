// 桌面入口：发布构建隐藏控制台窗口。
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    claude_game_lib::run()
}
