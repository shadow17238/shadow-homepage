# Shadow's Homepage

一个无需构建工具的静态个人导航页。
双击 [index.html](/F:/shadow's%20homepage/index.html:1) 即可打开，也可以配合本地静态服务获得更完整的媒体权限体验。

## 项目特点

- 分类导航：按分组展示常用链接，支持编辑模式下修改名称和地址。
- 天气集成：内置 OpenWeatherMap 天气功能，实时显示气温、降雨概率，并提供今日/明日详细预报与雨天提醒。
- 应用协议：链接卡片支持填写 `weixin://`、`obsidian://` 等应用协议，点击后可直接尝试拉起本地应用。
- 搜索体验：内置 Bing 搜索，支持搜索历史、关键词匹配和拼音匹配。
- 数据统计：支持 `今日 / 本周 / 本月` 视图，可查看点击趋势、在线时长和热门网页。
- 倒数日：支持普通日期、公历生日、农历生日，支持新增、编辑、删除、置顶和排序。
- 个性化：支持深浅色主题、首页寄语、律动文案、时钟位置等本地配置。
- 媒体功能：支持麦克风可视化、摄像头悬浮窗和录屏导出。
- 数据备份：支持导出 / 导入 JSON，恢复链接、倒数日、统计和页面配置。
- 视觉表现：支持视频壁纸、粒子背景、统计面板，以及统一的玻璃拟态弹窗风格。

## 快速开始

### 直接打开

直接打开 [index.html](/F:/shadow's%20homepage/index.html:1) 即可运行。

### 本地静态服务

调试麦克风、摄像头、录屏等功能时，建议使用本地服务：

```bash
python -m http.server 8000
```

然后访问 [http://localhost:8000](http://localhost:8000)。

提示：部分浏览器在 `file://` 协议下会限制麦克风、摄像头和录屏能力。

## 目录结构

```text
shadow's homepage/
|-- index.html
|-- README.md
|-- CHANGELOG.md
|-- css/
|   |-- style.css
|   |-- stats.css
|   `-- weather.css
|-- data/
|   `-- data.js
|-- images/
|   |-- avatar.jpg
|   |-- avatar_1.png
|   `-- favicon.ico
|-- js/
|   |-- app-state.js
|   |-- background.js
|   |-- backup.js
|   |-- countdown.js
|   |-- links.js
|   |-- media.js
|   |-- script.js
|   |-- search.js
|   |-- stats-data.js
|   |-- stats-ui.js
|   |-- stats.js
|   |-- storage.js
|   |-- utils.js
|   `-- weather.js
|-- vendor/
|   |-- fontawesome/
|   |-- fonts/
|   |-- lunar/
|   `-- pinyin/
`-- wallpaper/
    `-- 1.mp4
```

## 核心文件

- [index.html](/F:/shadow's%20homepage/index.html:1)：页面入口、DOM 结构和资源引用。
- [css/style.css](/F:/shadow's%20homepage/css/style.css:1)：全局样式、布局、主题和弹窗视觉。
- [css/stats.css](/F:/shadow's%20homepage/css/stats.css:1)：统计面板和图表相关样式。
- [css/weather.css](/F:/shadow's%20homepage/css/weather.css:1)：天气挂件、详情面板和设置弹窗样式。
- [data/data.js](/F:/shadow's%20homepage/data/data.js:1)：默认链接、默认倒数日、默认标题与时钟位置。
- [js/app-state.js](/F:/shadow's%20homepage/js/app-state.js:1)：全局运行状态与持久化入口。
- [js/script.js](/F:/shadow's%20homepage/js/script.js:1)：应用启动流程、全局事件绑定和基础运行逻辑。
- [js/links.js](/F:/shadow's%20homepage/js/links.js:1)：导航渲染、编辑模式、应用协议跳转与时钟拖拽处理。
- [js/search.js](/F:/shadow's%20homepage/js/search.js:1)：搜索、搜索历史和拼音匹配。
- [js/weather.js](/F:/shadow's%20homepage/js/weather.js:1)：天气数据获取、降雨逻辑处理与界面渲染。
- [js/countdown.js](/F:/shadow's%20homepage/js/countdown.js:1)：倒数日数据处理、农历生日逻辑和表单管理。
- [js/stats-data.js](/F:/shadow's%20homepage/js/stats-data.js:1)：统计数据归档、聚合和持久化。
- [js/stats-ui.js](/F:/shadow's%20homepage/js/stats-ui.js:1)：统计面板、排行榜和图表渲染。
- [js/media.js](/F:/shadow's%20homepage/js/media.js:1)：音频可视化、摄像头和录屏导出。
- [js/background.js](/F:/shadow's%20homepage/js/background.js:1)：背景粒子动画。
- [js/backup.js](/F:/shadow's%20homepage/js/backup.js:1)：导入 / 导出逻辑。
- [js/storage.js](/F:/shadow's%20homepage/js/storage.js:1)：`localStorage` 键管理和读写封装。
- [js/utils.js](/F:/shadow's%20homepage/js/utils.js:1)：校验、容错和依赖降级工具。

## 本地依赖

项目已将常用外链资源本地化，默认不依赖 CDN：

- [vendor/fontawesome](/F:/shadow's%20homepage/vendor/fontawesome)：图标字体与样式。
- [vendor/fonts](/F:/shadow's%20homepage/vendor/fonts)：标题字体资源。
- [vendor/lunar](/F:/shadow's%20homepage/vendor/lunar)：农历日期计算库。
- [vendor/pinyin](/F:/shadow's%20homepage/vendor/pinyin)：拼音匹配库。

即使网络较差，页面核心功能也能正常运行。

## 数据存储

页面数据默认保存在浏览器 `localStorage` 中，主要包括：

- 导航链接数据
- 搜索历史
- 倒数日数据
- 点击次数
- 在线时长
- 统计明细数据
- 深浅色主题偏好
- 时钟位置
- 首页寄语和律动文案
- 最近备份时间

清理站点数据会导致本地配置丢失，建议定期使用导出功能备份。

## 备份与恢复

导出的 JSON 备份包含：

- 链接数据
- 倒数日数据
- 时钟位置
- 自定义标题
- 点击次数
- 在线时长
- 统计明细

导入后会按备份内容恢复对应配置和统计数据。

## 浏览器兼容性

推荐使用最新版 Chrome、Edge、Firefox 等现代浏览器。
Safari 也可使用，但摄像头、录屏和媒体权限行为可能略有差异。

## 开发说明

- 这是一个纯静态前端项目，没有打包流程。
- 修改 HTML / CSS / JS 后，刷新页面即可看到效果。
- 如需继续扩展，建议保持 `data/` 放默认数据、`js/` 按功能拆分、`vendor/` 放本地依赖的结构。
- 当前部分运行数据依赖浏览器存储，调试时请注意不要误清站点数据。

## 分支说明

当前默认开发与持续更新分支：`main`

保留的早期历史分支，用于存档旧版本提交记录：`master`

## License

当前仓库未提供明确开源许可证。
如果准备公开分发或商用，建议先补充合适的 License。
