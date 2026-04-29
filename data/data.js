/**
 * 网站初始化链接数据
 * 按类别（Category）划分，每个类别下包含多个链接对象
 */
const defaultData = [
    {
        "category": "studying",
        "links": [
            { "name": "学在浙大", "url": "https://courses.zju.edu.cn/" },
            { "name": "教务网", "url": "https://zdbk.zju.edu.cn/" },
            { "name": "查老师", "url": "https://github.com/zjuchalaoshi/chalaoshi?tab=readme-ov-file" },
            { "name": "新生宝典", "url": "https://zjuers.com/welcome/" },
            { "name": "智云课堂", "url": "https://classroom.zju.edu.cn/" },
            { "name": "obsidian", "url": "obsidian://open" },
            { "name": "教务网(研)", "url": "https://yjsy.zju.edu.cn/dashboard/analysis?ticket=ST-14583891-ATR7PD2izMJ5uPzPe7AD-zju.edu.cn" },
            { "name": "研在浙大", "url": "https://yjsy.zju.edu.cn/" },
            { "name": "clash", "url": "clash://" },
            { "name": "素质拓展网", "url": "https://sztz.zju.edu.cn/dekt/#/index/main" },
            { "name": "教学资源管理", "url": "https://jxzygl.zju.edu.cn/zypt/teacher/home" },
            { "name": "微信", "url": "weixin://" }
        ]
    },
    {
        "category": "it sevice",
        "links": [
            { "name": "RVPN", "url": "https://vpn.zju.edu.cn/portal/#/login" },
            { "name": "WebVPN", "url": "https://webvpn.zju.edu.cn/" },
            { "name": "上网认证", "url": "https://net3.zju.edu.cn/" },
            { "name": "正版软件", "url": "http://ms.zju.edu.cn/" },
            { "name": "浙大邮箱", "url": "https://mail.zju.edu.cn/" },
            { "name": "网费管理", "url": "https://myvpn.zju.edu.cn/" },
            { "name": "浙大云盘", "url": "https://pan.zju.edu.cn/" },
            { "name": "z-lib", "url": "https://zh.chris101.ru/" },
            { "name": "源梦紫金", "url": "https://zjusuee.github.io/" },
            { "name": "浙大服务平台", "url": "https://service.zju.edu.cn/" },
            { "name": "校务服务网", "url": "http://xwfw.zju.edu.cn/" },
            { "name": "综合服务网", "url": "http://zhfw.zju.edu.cn/" }
        ]
    },
    {
        "category": "else",
        "links": [
            { "name": "CC98", "url": "https://www.cc98.org" },
            { "name": "学工部", "url": "http://www.xgb.zju.edu.cn" },
            { "name": "能源学院", "url": "http://doe-oa.zju.edu.cn/main.htm" },
            { "name": "豆包", "url": "https://www.doubao.com/" },
            { "name": "ETA", "url": "http://eta.zju.edu.cn/" },
            { "name": "Gemini", "url": "https://gemini.google.com/" },
            { "name": "NotebookLM", "url": "https://notebooklm.google.com/?icid=home_maincta" },
            { "name": "计财处", "url": "http://cwcx.zju.edu.cn/" },
            { "name": "ChatGPT", "url": "https://chatgpt.com/" },
            { "name": "DeepSeek", "url": "https://chat.deepseek.com/a/chat/" },
            { "name": "数软作业", "url": "http://10.72.190.121:2025/problems" },
            { "name": "ZJU Charger", "url": "https://charger.philfan.cn/" }
        ]
    },
    {
        "category": "academic search",
        "links": [
            { "name": "浙大图书馆", "url": "http://libweb.zju.edu.cn/" },
            { "name": "求是学术搜索", "url": "http://find.zju.edu.cn/" },
            { "name": "中国知网", "url": "https://www.cnki.net/" },
            { "name": "谷歌学术", "url": "https://scholar.google.com/" },
            { "name": "必应学术", "url": "https://cn.bing.com/academic" },
            { "name": "百度学术", "url": "https://xueshu.baidu.com/" },
            { "name": "维普网", "url": "http://www.cqvip.com/" },
            { "name": "爱学术", "url": "https://www.ixueshu.com/" },
            { "name": "万方数据", "url": "https://www.wanfangdata.com.cn/" },
            { "name": "Github", "url": "https://github.com/" },
            { "name": "WOS", "url": "https://www.webofscience.com/" },
            { "name": "Sci-Hub", "url": "https://sci-hub.se/" }
        ]
    },
    {
        "category": "useful tools",
        "links": [
            { "name": "一个木函", "url": "https://woobx.cn/" },
            { "name": "在线工具箱", "url": "https://www.tboxn.com/" },
            { "name": "KDown", "url": "https://kdown.moiu.cn/" },
            { "name": "百度翻译", "url": "https://fanyi.baidu.com/" },
            { "name": "谷歌翻译", "url": "https://translate.google.com/" },
            { "name": "缩略词复原", "url": "https://lab.magiconch.com/nbnhhsh/" },
            { "name": "短网址工具", "url": "https://sina.lt/" },
            { "name": "二维码生成器", "url": "https://cli.im/" },
            { "name": "文件空投", "url": "https://airportal.cn/" },
            { "name": "文件格式转换", "url": "https://convertio.co/" },
            { "name": "PDF工具箱", "url": "https://www.ilovepdf.com/zh-cn" },
            { "name": "在线图片编辑", "url": "https://www.photopea.com/" }
        ]
    },
    {
        "category": "studying · movies",
        "links": [
            { "name": "MOOC", "url": "https://www.icourse163.org/" },
            { "name": "智慧树", "url": "https://www.zhihuishu.com/" },
            { "name": "学银在线", "url": "https://i.chaoxing.com/base?t=1772626405068" },
            { "name": "Bilibili", "url": "https://www.bilibili.com/" },
            { "name": "抖音", "url": "https://www.douyin.com/" },
            { "name": "腾讯视频", "url": "https://v.qq.com/" },
            { "name": "优酷", "url": "https://www.youku.com/" },
            { "name": "芒果TV", "url": "https://www.mgtv.com/" },
            { "name": "CCTV", "url": "https://tv.cctv.com/" },
            { "name": "虎牙直播", "url": "https://www.huya.com/" },
            { "name": "斗鱼直播", "url": "https://www.douyu.com/" },
            { "name": "企鹅体育", "url": "https://live.qq.com/" }
        ]
    },
    {
        "category": "useful tools",
        "links": [
            { "name": "腾讯文档", "url": "https://docs.qq.com/" },
            { "name": "百度文库", "url": "https://wenku.baidu.com/" },
            { "name": "秀米", "url": "https://xiumi.us/" },
            { "name": "Wolfram", "url": "https://www.wolframalpha.com/" },
            { "name": "Myscript", "url": "https://webdemo.myscript.com/" },
            { "name": "Geogebra", "url": "https://www.geogebra.org/" },
            { "name": "问卷星", "url": "https://www.wjx.cn/" },
            { "name": "视频下载", "url": "https://snapany.com/zh/bilibili" },
            { "name": "站长工具", "url": "https://tool.chinaz.com/" }
        ]
    },
    {
        "category": "摸鱼~",
        "links": [
            { "name": "知乎", "url": "https://www.zhihu.com/" },
            { "name": "豆瓣", "url": "https://www.douban.com/" },
            { "name": "NGA", "url": "https://nga.178.com/" },
            { "name": "微博热搜", "url": "https://s.weibo.com/top/summary" },
            { "name": "腾讯体育", "url": "https://sports.qq.com/" },
            { "name": "虎扑网", "url": "https://www.hupu.com/" },
            { "name": "Pixivic", "url": "https://pixivic.com/" },
            { "name": "京东商城", "url": "https://www.jd.com/" },
            { "name": "淘宝网", "url": "https://www.taobao.com/" }
        ]
    },
    {
        "category": "I do not know",
        "links": [
            { "name": "网络测速", "url": "https://www.speedtest.cn/" },
            { "name": "实时航班", "url": "https://www.flightradar24.com/" },
            { "name": "在线病毒扫描", "url": "https://www.virustotal.com/" },
            { "name": "浙大校历", "url": "https://zjuers.com/banner/%E6%B5%99%E6%B1%9F%E5%A4%A7%E5%AD%A62025-2026%E5%AD%A6%E5%B9%B4%E6%A0%A1%E5%8E%86.pdf" },
            { "name": "校网测速", "url": "http://speedtest.zju.edu.cn/" },
            { "name": "浙大黄页", "url": "#" },
            { "name": "搜索引擎说明", "url": "#" },
            { "name": "关于本站&反馈", "url": "#" },
            { "name": "# 深色模式 #", "url": "" }
        ]
    }
];

/**
 * 默认倒数日数据
 * 支持农历、公历生日及普通倒计时
 */
const defaultCountdownData = [];

// 默认悬浮时钟在屏幕上的坐标
const defaultClockPosition = {
    "left": "230px",
    "top": "183px"
};

// 页面中间默认显示的标题文字（寄语）
const defaultTitle = "爱意随风起，风止意难平";
