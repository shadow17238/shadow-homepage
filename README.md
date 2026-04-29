# Shadow's Homepage

一个零构建工具的个人导航主页，纯原生 HTML/CSS/JavaScript 实现，双击即可打开使用。

<img src="images/111.png" alt="预览" style="zoom:75%;" />

## 功能特性

- **链接导航** — 按分类组织的网址卡片，支持自定义编辑、右键菜单操作，以及 `weixin://`、`obsidian://` 等应用协议直链
- **多引擎搜索** — 支持 Bing / Google / GitHub 切换，内置搜索历史（拼音匹配），偏好自动持久化
- **天气挂件** — OpenWeatherMap 实时天气、3 小时降雨概率、今日/明日预报，支持城市选择与自定义配置
- **倒数日管理** — 普通日期、公历生日、农历生日三种类型，支持置顶排序与农历日历联动
- **数据统计** — 点击次数追踪、在线时长记录、按日/周/月聚合的趋势图表与排行榜
- **粒子背景** — Canvas 交互式粒子网络系统，跟随鼠标产生形变效果
- **环境音律动** — 麦克风采集音频并实时可视化，搭配每日自动刷新的一言语录
- **摄像头悬浮窗** — 可拖拽的画中画摄像头窗口，支持录制与导出（WebM/MP4）
- **明暗主题** — 一键切换浅色 / 深色模式
- **数据备份** — JSON 格式导入/导出全部配置，版本感知与数据校验
- **玻璃拟态 UI** — 统一的毛玻璃卡片风格，极光渐变装饰，全局视觉语言一致

## 快速开始

直接双击 `index.html` 即可浏览（部分浏览器可能限制麦克风/摄像头权限）。

如需完整功能体验，启动本地服务：

```bash
python -m http.server 8000
```

然后访问 http://localhost:8000

## 项目结构

```
├── index.html              # 入口页面
├── css/
│   ├── style.css           # 全局布局与组件样式
│   ├── stats.css           # 统计面板样式
│   └── weather.css         # 天气挂件样式
├── js/
│   ├── utils.js            # 工具函数：HTML 转义、JSON 解析、特性检测
│   ├── storage.js          # localStorage 封装
│   ├── app-state.js        # 全局状态管理
│   ├── stats-data.js       # 点击追踪与在线时长统计
│   ├── weather.js          # 天气模块（OpenWeatherMap）
│   ├── links.js            # 链接渲染、拖拽时钟、右键菜单
│   ├── search.js           # 搜索引擎切换与历史记录
│   ├── script.js           # 入口初始化与事件绑定
│   ├── backup.js           # JSON 导入/导出
│   ├── countdown.js        # 倒数日（含农历支持）
│   ├── media.js            # 音频可视化、摄像头、录制（按需加载）
│   ├── background.js       # 粒子背景动画
│   └── stats-ui.js         # 统计面板 UI（按需加载）
├── data/
│   └── data.js             # 默认链接数据与倒数日
├── images/                 # 头像、图标资源
├── wallpaper/              # 背景视频
└── vendor/                 # 本地化第三方库
    ├── fontawesome/        # FontAwesome 图标
    ├── fonts/              # 马善政毛笔字体
    ├── lunar/              # 农历库
    └── pinyin/             # 拼音匹配库
```

## 技术栈

- **HTML5 / CSS3 / ES6+** — 无框架依赖
- **IIFE 模块化** — 各 JS 文件按依赖顺序加载，通过 `window` 全局状态通信
- **Canvas 2D** — 粒子背景与音频可视化
- **LocalStorage** — 全部数据持久化，支持导入/导出

## 设计决策

- **零构建** — 无打包工具、无转译、无测试框架，编辑文件后刷新浏览器即可
- **零 CDN** — 所有第三方依赖（FontAwesome、字体、农历库、拼音库）本地化存储
- **渐进降级** — `utils.js` 检测依赖缺失时自动降级，不影响核心功能
- **按需加载** — 统计面板与媒体功能延迟加载，减小首屏体积

## 数据配置

所有持久化数据存储在浏览器 `localStorage` 中，可通过页面右上角的导入/导出按钮进行备份与恢复。

默认链接数据定义在 `data/data.js` 的 `defaultData` 数组中，按分类组织。

## 更新日志

详见 [CHANGELOG.md](CHANGELOG.md)

## License

MIT
