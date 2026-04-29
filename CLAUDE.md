# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A zero-build-tool static personal navigation page (个人导航页). Double-click `index.html` to open, or serve locally for full media permissions.

## Commands

- **Run locally**: `python -m http.server 8000` then visit http://localhost:8000 (required for mic/camera/screen recording features)
- **No build step**: Edit HTML/CSS/JS and refresh the browser
- **No tests or linters configured** in this project

## Architecture

### Module system

IIFE-based modules with global state. Each JS file is loaded via `<script>` tags in `index.html` in a strict dependency order. The load order is:

`utils.js` → `storage.js` → `app-state.js` → `stats-data.js` → `weather.js` → `links.js` → `search.js` → `script.js` → `backup.js` → `countdown.js` → `media.js` → `background.js`

One module is **lazy-loaded on demand** via `loadWithSpinner()` → `loadScript()`: `stats-ui.js` (stats modal, loaded when the stats button is clicked). `media.js` is loaded statically at page init.

### Module responsibilities

| Module | Role |
|---|---|
| `js/utils.js` | Low-level utilities: `escapeHTML`, `safeParseJSON`, `safeParseInt`, `getStorageItem`, `setStorageItem`, `validateAppData`, `loadScript`, feature detection |
| `js/storage.js` | `AppStorage` — `localStorage` wrapper with typed accessors per key |
| `js/app-state.js` | `AppState` — global runtime state object, serialization/deserialization from localStorage |
| `js/stats-data.js` | `analyticsData` — click tracking, online time tracking, daily/hourly aggregation, 90-day retention pruning. Exposes `trackLinkClick`, `trackOnlineTimeTick`, `getSummaryForRange` |
| `js/weather.js` | `WeatherApp` — OpenWeatherMap integration, 30-min cache, 3-hour rain probability, today/tomorrow forecast |
| `js/links.js` | Link card rendering (`renderLinks`), right-click context menu, edit modal, clock dragging, clock update |
| `js/search.js` | Multi-engine search (Bing/Google/GitHub), search history (max 100), pinyin-pro matching |
| `js/script.js` | Entry point (`window.onload`), event binding, runtime services (clock timer, online time timer, Hitokoto API) |
| `js/backup.js` | JSON export/import for all data, version-aware import with validation |
| `js/countdown.js` | Countdown with lunar calendar support (via vendor/lunar), pin/reorder/edit/delete |
| `js/media.js` | Audio visualizer (canvas), camera window, MediaRecorder with webm/mp4 export |
| `js/background.js` | Interactive particle background on canvas, mouse-following with deformation effect |

### Data flow

All persistent data flows through `localStorage` via `AppStorage`. The `AppState` object reads from `AppStorage` on load and writes back through explicit `persist*()` methods. Stats data (clicks, online time) uses a debounced save pattern with 800ms delay.

### Key design decisions

- **Global state**: State lives on `window` properties (e.g., `appData`, `clickCount`, `onlineTime`, `isEditMode`) defined via `Object.defineProperty` in `AppState`. Direct mutation is the pattern.
- **Vendor deps localized**: `vendor/` contains FontAwesome, fonts, lunar calendar, and pinyin-pro — no CDN reliance.
- **CSS split**: `style.css` (global/layout), `stats.css` (stats panel), `weather.css` (weather widget).
- **Default data**: in `data/data.js` (`defaultData`, `defaultCountdownData`, `defaultTitle`, `defaultClockPosition`).
- **Lazy loading**: stats panel (`stats-ui.js`) is lazy-loaded to keep initial page weight low. `media.js` is statically loaded.
- **Edit mode**: Toggled via gear button; enables clock dragging, countdown management, link editing, and title editing.
- **Feature fallbacks**: `utils.js` detects missing dependencies (FontAwesome, pinyin-pro, Lunar) and degrades gracefully.

### State management

The `AppState` module (IIFE) owns the canonical state object. Properties are mirrored to `window` scope so any module can read/write them directly. Persistence is explicit:

```
appData → AppState.persistAppData() → AppStorage.setAppData() → localStorage
```

Search history uses `AppState.searchHistory` (Array of strings, max 100).
Analytics data uses `analyticsData` (object with `daily` and `links` sub-objects).

## 重点提示

- 每次回答问题称呼我为“shadow大人”
- 不能写兼容性代码，除非我要求
- 遇到重大代码设计问题，必须要询问shadow
- 创建一个更新日志.md文件，每次对代码进行了修改，都必须写进去，时间戳精确到秒，不能修改前面的内容，只能新写入
