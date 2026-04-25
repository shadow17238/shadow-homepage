/**
 * 统计数据存储键名
 */
const ANALYTICS_STORAGE_KEY = AppStorage.keys.analytics;
/**
 * 默认统计的时间窗口天数（30天）
 */
const ANALYTICS_WINDOW_DAYS = 30;
/**
 * 统计数据保留天数（90天），超过此期限的数据将被清理
 */
const ANALYTICS_RETENTION_DAYS = 90;
/**
 * 统计数据保存的防抖延迟（毫秒）
 */
const ANALYTICS_SAVE_DELAY = 800;
/**
 * 当前统计图表的时间范围
 */
let currentStatsRange = 'month';
/**
 * 自动保存定时器
 */
let analyticsSaveTimer = null;

/**
 * 清理过期的统计数据，释放存储空间
 * @param {Object} data - 统计数据对象
 * @return {Object} 清理后的统计数据对象
 */
function pruneAnalyticsData(data) {
    if (!data || typeof data !== 'object') {
        return { daily: {}, links: {} };
    }

    // 计算截止日期，只保留最近 retention 天的数据
    const cutoffDate = new Date();
    cutoffDate.setHours(0, 0, 0, 0);
    cutoffDate.setDate(cutoffDate.getDate() - (ANALYTICS_RETENTION_DAYS - 1));
    const cutoffKey = formatDateKey(cutoffDate);

    // 清理每日汇总数据
    Object.keys(data.daily || {}).forEach((dateKey) => {
        if (dateKey < cutoffKey) {
            delete data.daily[dateKey];
        }
    });

    // 清理每个链接的统计数据
    Object.keys(data.links || {}).forEach((linkKey) => {
        const linkItem = data.links[linkKey];
        if (!linkItem || typeof linkItem !== 'object') {
            delete data.links[linkKey];
            return;
        }

        if (!linkItem.daily || typeof linkItem.daily !== 'object') {
            linkItem.daily = {};
        }

        // 清理链接下过期的每日点击量
        Object.keys(linkItem.daily).forEach((dateKey) => {
            if (dateKey < cutoffKey) {
                delete linkItem.daily[dateKey];
            }
        });

        // 如果该链接在保留期内没有任何点击记录且没有最近点击，则从记录中完全删除该链接
        const hasRecentDailyData = Object.keys(linkItem.daily).length > 0;
        const lastClickedKey = linkItem.lastClickedAt ? formatDateKey(new Date(linkItem.lastClickedAt)) : '';
        const hasRecentLastClick = lastClickedKey && lastClickedKey >= cutoffKey;

        if (!hasRecentDailyData && !hasRecentLastClick) {
            delete data.links[linkKey];
        }
    });

    return data;
}

/**
 * 从存储中加载统计数据并进行初始化处理
 * @return {Object} 初始化后的统计数据
 */
function loadAnalyticsData() {
    const fallback = { daily: {}, links: {} };
    const saved = AppStorage.getAnalyticsData();
    const parsed = saved || fallback;

    if (!parsed || typeof parsed !== 'object') return fallback;
    if (!parsed.daily || typeof parsed.daily !== 'object') parsed.daily = {};
    if (!parsed.links || typeof parsed.links !== 'object') parsed.links = {};
    
    // 遍历并规范化每日数据桶
    Object.keys(parsed.daily).forEach((dateKey) => {
        parsed.daily[dateKey] = normalizeDailyBucket(parsed.daily[dateKey]);
    });

    return pruneAnalyticsData(parsed);
}

/**
 * 请求保存统计数据
 * @param {boolean} immediate - 是否立即保存而不使用延迟防抖
 */
function saveAnalyticsData(immediate = false) {
    if (immediate) {
        flushAnalyticsData();
        return;
    }

    if (analyticsSaveTimer) return;
    analyticsSaveTimer = window.setTimeout(flushAnalyticsData, ANALYTICS_SAVE_DELAY);
}

/**
 * 实际执行保存操作，将数据持久化到本地存储
 */
function flushAnalyticsData() {
    if (!analyticsData) return;

    if (analyticsSaveTimer) {
        clearTimeout(analyticsSaveTimer);
        analyticsSaveTimer = null;
    }

    // 保存前再次清理过期数据
    pruneAnalyticsData(analyticsData);
    AppState.persistAnalytics();
}

/**
 * 获取当前日期的格式化键名 (YYYY-MM-DD)
 * @return {string}
 */
function getTodayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 创建一个空的 24 小时数据数组
 * @return {Array<number>}
 */
function createEmptyHourlySeries() {
    return Array.from({ length: 24 }, () => 0);
}

/**
 * 规范化 24 小时时段数据数组
 * @param {Array} series - 原始时段数据
 * @return {Array<number>} 规范化后的数组
 */
function normalizeHourlySeries(series) {
    if (!Array.isArray(series)) return createEmptyHourlySeries();
    return Array.from({ length: 24 }, (_, index) => Math.max(0, Number(series[index]) || 0));
}

/**
 * 规范化每日数据桶对象
 * @param {Object} bucket - 原始数据桶
 * @return {Object} 包含点击量、在线时长及详细时段分布的规范化对象
 */
function normalizeDailyBucket(bucket) {
    const safeBucket = bucket && typeof bucket === 'object' ? bucket : {};
    return {
        clicks: Number(safeBucket.clicks) || 0,
        onlineTime: Number(safeBucket.onlineTime) || 0,
        hourlyClicks: normalizeHourlySeries(safeBucket.hourlyClicks),
        hourlyOnline: normalizeHourlySeries(safeBucket.hourlyOnline)
    };
}

/**
 * 确保指定日期的每日统计桶已存在于数据中
 * @param {string} dateKey - 日期键名
 * @return {Object} 统计桶对象
 */
function ensureDailyBucket(dateKey) {
    if (!analyticsData.daily[dateKey]) {
        analyticsData.daily[dateKey] = normalizeDailyBucket(null);
    } else {
        analyticsData.daily[dateKey] = normalizeDailyBucket(analyticsData.daily[dateKey]);
    }
    return analyticsData.daily[dateKey];
}

/**
 * 获取当前所在的小时数索引 (0-23)
 * @return {number}
 */
function getCurrentHourIndex() {
    return new Date().getHours();
}

/**
 * 生成链接统计的唯一标识键名
 * @param {Object} link - 链接对象
 * @return {string}
 */
function getLinkAnalyticsKey(link) {
    const name = link && typeof link.name === 'string' ? link.name.trim() : 'unknown';
    const url = link && typeof link.url === 'string' ? link.url.trim() : '';
    return `${name}__${url}`;
}

/**
 * 确保指定链接的统计数据桶已存在
 * @param {Object} link - 链接对象
 * @return {Object} 链接统计桶对象
 */
function ensureLinkBucket(link) {
    const key = getLinkAnalyticsKey(link);

    if (!analyticsData.links[key]) {
        analyticsData.links[key] = {
            name: link.name,
            url: link.url,
            totalClicks: 0,
            lastClickedAt: '',
            daily: {}
        };
    }

    // 更新基本信息以防发生变化
    analyticsData.links[key].name = link.name;
    analyticsData.links[key].url = link.url;
    if (!analyticsData.links[key].daily || typeof analyticsData.links[key].daily !== 'object') {
        analyticsData.links[key].daily = {};
    }

    return analyticsData.links[key];
}

/**
 * 追踪链接点击行为并即时更新统计数据
 * @param {Object} link - 被点击的链接对象
 */
function trackLinkClick(link) {
    if (!analyticsData || !link) return;

    const todayKey = getTodayKey();
    const dayBucket = ensureDailyBucket(todayKey);
    const linkBucket = ensureLinkBucket(link);
    const currentHour = getCurrentHourIndex();

    // 更新全局每日汇总点击量和当前小时段点击量
    dayBucket.clicks += 1;
    dayBucket.hourlyClicks[currentHour] += 1;
    
    // 更新该特定链接的累计点击量和最近点击时间
    linkBucket.totalClicks += 1;
    linkBucket.lastClickedAt = new Date().toISOString();
    linkBucket.daily[todayKey] = (linkBucket.daily[todayKey] || 0) + 1;

    saveAnalyticsData();
}

/**
 * 追踪在线时长的心跳上报（计时器触发）
 */
function trackOnlineTimeTick() {
    if (!analyticsData) return;

    const todayKey = getTodayKey();
    const dayBucket = ensureDailyBucket(todayKey);
    const currentHour = getCurrentHourIndex();
    
    // 更新每日总在线时长和当前小时段在线时长
    dayBucket.onlineTime += 1;
    dayBucket.hourlyOnline[currentHour] += 1;

    // 每积累 10 秒在线时长触发一次保存
    if (dayBucket.onlineTime % 10 === 0) {
        saveAnalyticsData();
    }
}

/**
 * 获取最近指定天数的日期键名列表（逆序）
 * @param {number} days - 需要的天数
 * @return {Array<string>} 日期键名数组
 */
function getRecentDateKeys(days) {
    const keys = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(base);
        d.setDate(base.getDate() - i);
        keys.push(formatDateKey(d));
    }

    return keys;
}

/**
 * 格式化日期对象为标准键名 (YYYY-MM-DD)
 * @param {Date} date
 * @return {string}
 */
function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 格式化短日期显示 (MM-DD)
 * @param {string} dateKey
 * @return {string}
 */
function formatShortDate(dateKey) {
    return dateKey ? dateKey.slice(5) : '暂无';
}

/**
 * 格式化小时时段标签字符串
 * @param {number} hour
 * @return {string}
 */
function formatHourLabel(hour) {
    return `${String(hour).padStart(2, '0')}:00 - ${String(hour).padStart(2, '0')}:59`;
}

/**
 * 获取统计范围对应的配置选项对象
 * @param {string} range - 统计范围标识 ('today', 'week', 'month')
 * @return {Object} 配置参数对象
 */
function getStatsRangeConfig(range) {
    switch (range) {
        case 'today':
            return {
                key: 'today',
                title: '今日',
                subtitle: '今日点击趋势、在线时长和热门网页',
                days: 1,
                rankingLabel: '今日网页点击排行榜',
                topSiteLabel: '今日最热门网页',
                clicksLabel: '今日总点击',
                onlineLabel: '今日在线时长'
            };
        case 'week':
            return {
                key: 'week',
                title: '本周',
                subtitle: '最近 7 天点击趋势、在线时长和热门网页',
                days: 7,
                rankingLabel: '本周网页点击排行榜',
                topSiteLabel: '本周最热门网页',
                clicksLabel: '本周总点击',
                onlineLabel: '本周在线时长'
            };
        default:
            return {
                key: 'month',
                title: '本月',
                subtitle: '最近 30 天点击趋势、在线时长和热门网页',
                days: ANALYTICS_WINDOW_DAYS,
                rankingLabel: '本月网页点击排行榜',
                topSiteLabel: '本月最热门网页',
                clicksLabel: '本月总点击',
                onlineLabel: '本月在线时长'
            };
    }
}

/**
 * 根据每日点击量序列计算数据的整体趋势状态
 * @param {Array} dailySeries - 每日统计序列
 * @return {string} 趋势描述文本
 */
function getTrendState(dailySeries) {
    if (dailySeries.length < 2) return '等待积累数据';

    const mid = Math.floor(dailySeries.length / 2);
    const firstHalf = dailySeries.slice(0, mid);
    const secondHalf = dailySeries.slice(mid);
    const firstAvg = firstHalf.reduce((sum, item) => sum + item.clicks, 0) / Math.max(1, firstHalf.length);
    const secondAvg = secondHalf.reduce((sum, item) => sum + item.clicks, 0) / Math.max(1, secondHalf.length);

    // 比较前半段和后半段的平均点击量
    if (secondAvg > firstAvg * 1.15) return '热度上升中';
    if (secondAvg < firstAvg * 0.85) return '热度回落中';
    return '整体较稳定';
}

/**
 * 计算并整理指定时间范围内的统计数据摘要
 * @param {string} range - 统计范围
 * @return {Object} 统计结果汇总对象
 */
function getSummaryForRange(range) {
    const config = getStatsRangeConfig(range);
    const dateKeys = getRecentDateKeys(config.days);
    
    // 构建时间轴趋势数据
    const dailySeries = dateKeys.map((dateKey) => {
        const bucket = analyticsData.daily[dateKey] || { clicks: 0, onlineTime: 0 };
        return {
            dateKey,
            clicks: bucket.clicks || 0,
            onlineTime: bucket.onlineTime || 0
        };
    });

    // 计算网页点击热度排行榜
    const ranking = Object.values(analyticsData.links).map((item) => {
        let recentClicks = 0;

        dateKeys.forEach((dateKey) => {
            recentClicks += item.daily && item.daily[dateKey] ? item.daily[dateKey] : 0;
        });

        return {
            name: item.name,
            url: item.url,
            recentClicks,
            totalClicks: item.totalClicks || 0,
            lastClickedAt: item.lastClickedAt || ''
        };
    }).filter((item) => item.recentClicks > 0)
      .sort((a, b) => b.recentClicks - a.recentClicks || b.totalClicks - a.totalClicks);

    // 汇总汇总指标
    const totalClicks = dailySeries.reduce((sum, item) => sum + item.clicks, 0);
    const totalOnline = dailySeries.reduce((sum, item) => sum + item.onlineTime, 0);
    const peakClickDay = dailySeries.reduce((best, item) => item.clicks > best.clicks ? item : best, { dateKey: '', clicks: 0 });
    const peakOnlineDay = dailySeries.reduce((best, item) => item.onlineTime > best.onlineTime ? item : best, { dateKey: '', onlineTime: 0 });

    return {
        config,
        dailySeries,
        ranking,
        totalClicks,
        totalOnline,
        topSite: ranking[0] || null,
        peakClickDay,
        peakOnlineDay,
        trendState: getTrendState(dailySeries)
    };
}
