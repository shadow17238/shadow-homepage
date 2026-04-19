# 修改日志

本文件用于记录项目的重要修改。

记录规则：
- 后续每次功能更新、结构调整或重要样式改动，都追加写入本文件。
- 时间尽量使用实际修改日期；如果只能根据仓库状态推断，会明确说明。
- 对于暂时无法准确回忆的旧改动，不强行补写。

## [Unreleased]

说明：以下内容根据当前工作区未提交改动整理，时间大致对应 `2026-04-16` 至 `2026-04-18` 这一批更新。

### Added
- 新增统计面板相关模块与样式：`js/stats.js`、`js/stats-data.js`、`js/stats-ui.js`、`css/stats.css`。
- 新增应用状态、存储、工具函数等拆分模块：`js/app-state.js`、`js/storage.js`、`js/utils.js`。
- 新增搜索、链接、倒数日、备份、背景、媒体等功能模块：`js/search.js`、`js/links.js`、`js/countdown.js`、`js/backup.js`、`js/background.js`、`js/media.js`。
- 新增站点图标：`images/favicon.ico`。
- 新增本地依赖资源目录：`vendor/`，包含字体、图标、农历与拼音相关资源。

### Changed
- 重构首页脚本结构，`js/script.js` 从大体量单文件逻辑调整为应用入口，功能拆分到多个独立模块。
- 更新 `index.html`，接入新的模块脚本、资源引用和页面结构。
- 大幅调整 `css/style.css`，配合新的页面布局、组件与视觉表现。
- 更新 `README.md`，补充项目说明、目录结构和主要模块介绍。
- 微调 `data/data.js` 默认数据。

### Notes
- 这部分是根据当前文件状态和 Git 记录整理的“可确认内容”，不是严格完整的逐条历史。
- 当前批次改动尚未提交，因此先记录在 `Unreleased` 下，后续提交时可再按版本或日期整理。

## [2026-04-08]

说明：根据现有 Git 提交 `3314422`（仓库初始提交）整理。

### Added
- 初始化项目基础结构：`index.html`、`css/style.css`、`js/script.js`、`data/data.js`。
- 添加首页头像资源：`images/avatar.jpg`、`images/avatar_1.png`。
- 添加壁纸视频资源：`wallpaper/1.mp4`。
- 添加项目说明文档：`README.md`。

### Notes
- 这是当前仓库里最早能确认的一次提交记录。
