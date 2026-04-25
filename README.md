# Shadow's Homepage

一个基于原生 JavaScript 构建的极简、美观且功能强大的个人仪表板/导航主页。

本项目采用 **原生优先 (Vanilla First)** 的开发理念，在不使用任何现代重型框架（如 React/Vue）的前提下，实现了复杂的交互、数据持久化、音频可视化及实时统计功能。

<img src="images/111.png" style="zoom:50%;" />

## 🌟 核心特性

- **模块化架构**：经历深度重构，核心逻辑按领域拆分，代码高内聚低耦合。
- **实时天气**：集成 OpenWeatherMap API，支持城市自定义及三小时降雨预报。
- **智能搜索**：多搜索引擎切换（Bing/Google/GitHub），支持拼音模糊匹配的搜索历史。
- **动态背景**：内置视频背景与交互式 Canvas 粒子系统，支持跟随鼠标律动。
- **全方位统计**：记录网页点击频次、在线时长，并生成最近 30 天的趋势图表。
- **倒数日管理**：支持公历/农历生日自动续期，支持项位置置顶与排序。
- **媒体实验室**：内置环境音频谱可视化、摄像头悬浮窗预览及视频录制导出功能。
- **数据安全**：全量数据本地存储，提供 JSON 格式的一键备份与恢复。

## 🛠️ 技术栈

- **核心**：HTML5, CSS3 (高级渐变、Glassmorphism 磨砂质感), ECMAScript 6+
- **图形/动画**：Canvas API (粒子系统、频谱渲染), CSS Keyframes
- **多媒体**：Web Audio API, MediaDevices API, MediaRecorder API
- **第三方库 (Vendor)**：
    - `lunar.js`：农历算法支持。
    - `pinyin-pro`：搜索历史的拼音匹配。
    - `FontAwesome 6`：矢量图标库。

## 📁 目录结构说明

```text
F:/shadow's homepage/
├── index.html          # 页面主体结构
├── css/                # 样式目录
│   ├── style.css       # 全局主题、布局及核心组件样式
│   ├── stats.css       # 统计分析大屏专属样式
│   └── weather.css     # 天气挂件及详情面板样式
├── data/
│   └── data.js         # 默认链接、倒数日及坐标配置
├── js/                 # 逻辑目录
│   ├── script.js       # 主入口，负责事件分发与初始化
│   ├── app-state.js    # 统一状态管理中心 (AppState)
│   ├── storage.js      # 本地存储持久化封装 (AppStorage)
│   ├── utils.js        # 通用工具函数与常量 (共享常量、深拷贝等)
│   ├── links.js        # 链接渲染、拖拽及编辑逻辑
│   ├── weather.js      # 天气模块 (API 请求与渲染)
│   ├── search.js       # 搜索逻辑与历史记录管理
│   ├── countdown.js    # 倒数日算法及管理表单
│   ├── stats-data.js   # 统计数据处理与摘要计算
│   ├── stats-ui.js     # 统计图表渲染 (SVG 动态生成)
│   ├── media.js        # 音频可视化与摄像头控制
│   ├── background.js   # 粒子背景动画逻辑
│   └── backup.js       # 数据导入导出逻辑
├── vendor/             # 第三方依赖库
├── images/             # 静态图标与头像资源
└── wallpaper/          # 视频背景资源
```

## 🚀 环境搭建与启动

### 1. 克隆项目
```bash
git clone https://github.com/shadow17238/shadow-homepage.git
cd shadow-homepage
```

### 2. 启动开发环境
由于项目涉及 `fetch` 请求及多媒体权限，**不建议**直接双击 `index.html` 打开。请使用本地 Web 服务器启动：

- **VS Code 用户**：安装 `Live Server` 插件，右键 `index.html` 选择 "Open with Live Server"。
- **Node.js 用户**：
  ```bash
  npx serve .
  ```
- **Python 用户**：
  ```bash
  python -m http.server 8000
  ```

### 3. 配置天气
默认使用内置测试 Key。如需稳定使用，请前往 [OpenWeatherMap](https://openweathermap.org/) 申请免费 Key，点击页面天气挂件 -> 设置按钮进行配置。

## ⚙️ 核心功能开发说明

### 增加新功能
1. 在 `js/` 目录下创建独立的 `.js` 文件。
2. 在 `index.html` 末尾按依赖顺序引入。
3. 在 `js/script.js` 的 `bindEventListeners` 中添加对应的事件绑定函数。

### 数据持久化
所有用户配置通过 `js/storage.js` 统一管理，数据存储在 `localStorage` 中。修改 `data/data.js` 可调整新用户的初始化默认值。

## 🌐 部署方式

本项目为纯静态应用，可部署至任何支持静态托管的平台：

1.  **GitHub Pages**：
    - 推送代码至 GitHub。
    - 在仓库设置 (Settings) -> Pages 中选择 `main` 分支即可。
2.  **Vercel / Netlify**：直接关联仓库，一键发布。
3.  **私有服务器**：将所有文件上传至 Nginx/Apache 的 `www` 目录。

## 📜 开源协议

本项目遵循 MIT License。您可以自由地进行二次开发和分发。

---
*Created by [shadow17238](https://github.com/shadow17238)*
