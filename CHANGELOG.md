# 修改日志

本文档按时间记录项目更新，包含更新时间与对应内容。

## 2026-04-29

### 更新时间
- 2026-04-29 08:44:29

### 更新内容
- **[P0 安全修复]** 移除 `js/weather.js` 中硬编码的 OpenWeatherMap API Key，改为仅从用户本地配置读取，无配置时不再自动请求天气数据。
- **[P0 性能修复]** 移除 `css/style.css` 中 `* { transition: background-color 0.3s, color 0.3s }` 全局过渡规则，改为仅在 `body`、`header`、`.stats-container` 等需要主题切换过渡的元素上添加针对性 transition，避免切换主题时浏览器对数百个 DOM 节点进行过渡检查导致的布局性能损耗。

### 更新时间
- 2026-04-29 08:47:10

### 更新内容
- **[P1 性能修复]** 为 `js/background.js` 和 `js/media.js` 的 `requestAnimationFrame` 循环添加 `isPageVisible` 检查，标签页隐藏时跳过渲染帧，避免白耗 CPU。状态由 `script.js` 中已有的 `visibilitychange` 监听器驱动。
- **[P1 稳定性修复]** 为 `js/script.js` 中全部 30+ 个 `getElementById` 后的 `.addEventListener` 调用添加空值保护，任一 DOM 元素缺失时不再崩溃整个初始化流程。

### 更新时间
- 2026-04-29 08:50:31

### 更新内容
- **[P1 性能修复]** 优化 `js/search.js` 搜索历史浮层渲染：引入 `MAX_HISTORY_DISPLAY = 15` 常量，浮层最多显示 15 条匹配结果（存储仍保留 100 条），避免每次按键重建 100 条 DOM 节点导致的输入延迟。
- **[P2 性能修复]** 将 `showSearchHistory()` 中的 `innerHTML = ''` + `appendChild` 替换为 `replaceChildren()` 批量子节点替换，减少强制 reflow 次数。
- **[P2 交互修复]** 将搜索历史全局关闭监听器的 `setTimeout` 延迟从 100ms 降为 0ms，消除点击外部关闭浮层的短暂无响应窗口。

### 更新时间
- 2026-04-29 08:52:12

### 更新内容
- **[P2 性能修复]** 将 `js/links.js` 的 `renderLinks()` 中 `container.innerHTML = ''` 替换为 `DocumentFragment` + `container.replaceChildren(fragment)`，减少强制 reflow。
- **[P2 性能修复]** 将 `js/countdown.js` 的 `refreshCountdowns()` 中 `wrapper.innerHTML = ''` 替换为 `DocumentFragment` + `wrapper.replaceChildren(fragment)`，减少强制 reflow。
- **[P2 架构优化]** 将 `renderLinks()` 中每个链接卡片的 `onclick`/`oncontextmenu` 闭包替换为 `data-cat-index`/`data-link-index` 属性 + 容器级事件委托（`handleLinkContainerClick`、`handleLinkContainerContextMenu`），每次渲染从 ~120 个闭包降为 2 个共享监听器。
- **[P2 代码清理]** 删除 `css/style.css` 中被覆盖的死代码 `:root` 变量定义块（第一块），仅保留第二块 transparent/rgba 版本。

### 更新时间
- 2026-04-29 08:55:23

### 更新内容
- **[P1 性能修复]** 优化 `js/background.js` Canvas 粒子渲染：将粒子绘制改为从预绘制的离屏 Canvas（`dotCanvas`）`drawImage` 复用渐变模板，每帧从创建 50+ 个 `createRadialGradient` 降为 0 个；连线绘制从 `createLinearGradient` 改为纯色 `rgba`，消除 GC 压力。
- **[低 安全修复]** 为 `js/weather.js` 中 API 返回的城市名、天气描述等动态值添加 `escapeHTML()` 转义，防止潜在 XSS 注入。
- **[低 稳定性修复]** 将 `js/media.js` 顶层直接执行的 `getElementById` 缓存改为懒初始化函数 `cacheMediaDOM()`，各使用函数入口处按需调用，避免脚本加载顺序变化时变量为 null 崩溃。
- **[低 代码清理]** 删除 `index.html` 中非标准的 `rel="shortcut icon"` favicon 声明（IE 遗留），保留两个合规声明。

### 更新时间
- 2026-04-29 08:56:53

### 更新内容
- **[数据清理]** 清空 `data/data.js` 中 `defaultCountdownData` 的预设生日倒数日条目，初始化为空数组，用户需自行添加。

## 2026-04-25

### 更新时间
- 2026-04-25

### 更新内容
- 优化搜索历史面板：改为挂载到页面顶层的固定浮层，避免被下方链接卡片遮挡或抢占点击事件。
- 统一搜索历史面板视觉风格：采用与编辑弹窗、统计面板一致的玻璃拟态卡片、渐变背景、圆角阴影和 hover 反馈。
- 调整搜索历史“清空”按钮样式，使其与现有弹窗次级按钮保持一致。
- 搜索历史保留上限从 10 条提升到 100 条，长列表通过面板内滚动浏览。
- 集成 OpenWeatherMap 天气功能，支持实时气温、天气描述、湿度以及未来 3 小时降雨概率显示。
- 新增天气详情面板，支持查看今日及明日的最高/最低气温预报，并具备雨天自动提醒功能。
- 顶部导航栏重构：将天气挂件集成在 `shadow's homepage` 旁边，并采用绝对定位确保首页寄语（爱意随风起）始终保持水平居中。
- 优化天气挂件视觉：针对浅色模式引入淡蓝色背景及响应式文字颜色，显著提升在白色或浅色背景下的辨识度。
- 新增搜索引擎切换功能：搜索框左侧图标支持点击切换（Bing / Google / GitHub），同步更新图标与提示文字，并持久化保存用户偏好。
- 图标体验优化：重新设计并引入纯透明背景的官方 .ico 搜索引擎图标，消除白底“强迫症”视觉干扰。
- 搜索历史逻辑优化：修复了历史记录匹配与弹窗定位逻辑，并解决了脚本合并后的常量冲突问题。
- 风格统一：天气详情面板和设置弹窗全面接入玻璃拟态效果，包含极光渐变背景和圆角设计，与统计面板、编辑弹窗保持视觉语言一致。
- 交互优化：即使在天气数据加载失败或未配置时，点击挂件仍可进入详情面板并通过“立即配置”按钮快速跳转至设置。
- 安全性：支持本地保存 OpenWeatherMap API Key，并提供快捷城市选择（杭州、杭州西湖区、南充、南充仪陇）。
- 每日语录：集成 Hitokoto（一言）API，实现底部律动文案的每日自动更新（文学、诗词类），并支持点击手动刷新。
- 移除自定义文案：废弃原有的底部手动编辑功能，改为由系统每日自动推送。

## 2026-04-20

### 更新时间
- 2026-04-20

### 更新内容
- 支持在网址卡片中填写应用协议链接，例如 `weixin://`、`obsidian://`，点击后可直接尝试拉起本地应用。
- 调整链接卡片点击逻辑：普通网页链接继续新开页面，应用协议链接改为当前页直接调用协议。
- 将“个人课表查询”默认链接从 `#` 修改为 `weixin://`，点击后可直接打开微信。
- 修复编辑弹窗中使用鼠标拖选名称或网址时误触关闭的问题。
- 重做链接编辑弹窗样式，统一为与统计面板一致的玻璃卡片风格，并补充右上角关闭按钮与说明文案。
- 重做倒数日弹窗样式，统一为与统计面板、编辑弹窗一致的视觉语言，优化列表区、表单区、按钮和整体层次。
- 修复编辑模式下拖动时钟/倒数日区域结束后误触打开倒数日弹窗的问题。
- 更新 `README.md`，同步补充应用协议支持、统一弹窗样式和最新交互修复。
- 补充并重写更新日志格式，改为按日期记录“更新时间 + 更新内容”。

## 2026-04-18

### 更新时间
- 2026-04-18

### 更新内容
- 拆分首页脚本模块，新增 `js/app-state.js`、`js/storage.js`、`js/utils.js` 等状态与工具模块。
- 新增链接、搜索、倒数日、备份、背景、媒体等功能模块：`js/links.js`、`js/search.js`、`js/countdown.js`、`js/backup.js`、`js/background.js`、`js/media.js`。
- 新增统计相关模块与样式：`js/stats-data.js`、`js/stats-ui.js`、`css/stats.css`。
- 更新 `index.html` 脚本引用结构，接入模块化后的页面逻辑。
- 调整 `css/style.css` 与 `README.md`，同步适配新版结构和功能说明。

## 2026-04-08

### 更新时间
- 2026-04-08

### 更新内容
- 初始化项目基础文件：`index.html`、`css/style.css`、`js/script.js`、`data/data.js`。
- 添加头像与图标资源：`images/avatar.jpg`、`images/avatar_1.png`、`images/favicon.ico`。
- 添加背景视频资源：`wallpaper/1.mp4`。
- 添加项目说明文档 `README.md`。
