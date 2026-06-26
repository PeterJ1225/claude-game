// Tauri 应用入口（库形态，便于桌面/移动复用）。注册 plugin-fs 用于存档读写。
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
