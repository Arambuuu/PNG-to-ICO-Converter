# IconForge — Drag & Drop PNG to ICO Converter

A modern, fast, and 100% private client-side converter that turns PNG, WebP, JPEG, and SVG images into multi-resolution Windows `.ico` files and web favicons.

## ✨ Features

- **🚀 Drag & Drop + Global Dropzone**: Drag images onto the glowing drop zone or anywhere on the window.
- **📋 Clipboard Paste (Ctrl+V)**: Paste images directly from Figma, Photoshop, screenshot tools, or your clipboard.
- **📐 Multi-Resolution Windows ICO Support**: Embeds 16×16, 24×24, 32×32, 48×48, 64×64, 96×96, 128×128, and 256×256 into a single `.ico` file.
- **⚡ Presets**: One-click presets for *Favicon Pack (16, 32, 48)*, *Windows App Standard*, *Complete All-in-One*, or *Custom*.
- **🎭 Realistic Live Mockups**:
  - **Browser Tab Preview**: See how your 16px/32px favicon looks in a real browser tab.
  - **Windows Desktop & Taskbar**: Preview your icon on a Windows desktop and taskbar.
  - **Resolution Matrix**: Inspect each individual generated resolution with crisp pixel rendering and download individual PNGs.
- **🖼️ Smart Fit & Background Controls**:
  - *Contain & Pad* (preserves aspect ratio with transparent borders)
  - *Cover & Center* (crops to square)
  - *Stretch to Fit*
  - Transparent alpha or custom background color fill.
- **📦 Batch Processing & ZIP Export**: Convert multiple images at once and download all `.ico` files individually or packaged in a `.zip`.
- **🔒 100% Client-Side Privacy**: Runs completely inside your web browser. No files are ever uploaded to any server.

---

## 🚀 How to Run

Because IconForge is built with pure web standards (HTML5 Canvas, Vanilla CSS, and modern JavaScript):

### Option 1: Direct in Browser
Simply double-click or right-click `index.html` and choose **Open with Google Chrome / Microsoft Edge / Firefox**.

### Option 2: Local Static Server
If you have Node.js / npx installed:
```bash
npx serve .
# or
npx http-server .
```
Then navigate to `http://localhost:3000` (or the port indicated in your console).

---

## 💡 How to Use Your Generated `.ico` File

### For Websites (Favicon)
Place `favicon.ico` in your project's root folder and link it inside your HTML `<head>`:
```html
<link rel="icon" type="image/x-icon" href="/favicon.ico">
```

### For Windows Desktop Shortcuts
1. Right-click any shortcut &rarr; **Properties**.
2. Click the **Shortcut** tab &rarr; **Change Icon...**
3. Browse and select your generated `.ico` file.

### For Electron / Tauri / Python Apps
- **Electron**: Set `icon: path.join(__dirname, 'icon.ico')` in your `BrowserWindow` options.
- **PyInstaller**: Pass `--icon=app.ico` when building.
