const ANALYTICS_STORAGE_KEY = AppStorage.keys.analytics;
const ANALYTICS_WINDOW_DAYS = 30;
const ANALYTICS_RETENTION_DAYS = 90;
const ANALYTICS_SAVE_DELAY = 800;
let currentStatsRange = 'month';
let analyticsSaveTimer = null;

function pruneAnalyticsData(data) {
    if (!data || typeof data !== 'object') {
        return { daily: {}, links: {} };
    }

    const cutoffDate = new Date();
    cutoffDate.setHours(0, 0, 0, 0);
    cutoffDate.setDate(cutoffDate.getDate() - (ANALYTICS_RETENTION_DAYS - 1));
    const cutoffKey = formatDateKey(cutoffDate);

    Object.keys(data.daily || {}).forEach((dateKey) => {
        if (dateKey < cutoffKey) {
            delete data.daily[dateKey];
        }
    });

    Object.keys(data.links || {}).forEach((linkKey) => {
        const linkItem = data.links[linkKey];
        if (!linkItem || typeof linkItem !== 'object') {
            delete data.links[linkKey];
            return;
        }

        if (!linkItem.daily || typeof linkItem.daily !== 'object') {
            linkItem.daily = {};
        }

        Object.keys(linkItem.daily).forEach((dateKey) => {
            if (dateKey < cutoffKey) {
                delete linkItem.daily[dateKey];
            }
        });

        const hasRecentDailyData = Object.keys(linkItem.daily).length > 0;
        const lastClickedKey = linkItem.lastClickedAt ? formatDateKey(new Date(linkItem.lastClickedAt)) : '';
        const hasRecentLastClick = lastClickedKey && lastClickedKey >= cutoffKey;

        if (!hasRecentDailyData && !hasRecentLastClick) {
            delete data.links[linkKey];
        }
    });

    return data;
}

function loadAnalyticsData() {
    const fallback = { daily: {}, links: {} };
    const saved = AppStorage.getAnalyticsData();
    const parsed = saved || fallback;

    if (!parsed || typeof parsed !== 'object') return fallback;
    if (!parsed.daily || typeof parsed.daily !== 'object') parsed.daily = {};
    if (!parsed.links || typeof parsed.links !== 'object') parsed.links = {};
    Object.keys(parsed.daily).forEach((dateKey) => {
        parsed.daily[dateKey] = normalizeDailyBucket(parsed.daily[dateKey]);
    });

    return pruneAnalyticsData(parsed);
}

function saveAnalyticsData(immediate = false) {
    if (immediate) {
        flushAnalyticsData();
        return;
    }

    if (analyticsSaveTimer) return;
    analyticsSaveTimer = window.setTimeout(flushAnalyticsData, ANALYTICS_SAVE_DELAY);
}

function flushAnalyticsData() {
    if (!analyticsData) return;

    if (analyticsSaveTimer) {
        clearTimeout(analyticsSaveTimer);
        analyticsSaveTimer = null;
    }

    pruneAnalyticsData(analyticsData);
    AppState.persistAnalytics();
}

function getTodayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function createEmptyHourlySeries() {
    return Array.from({ length: 24 }, () => 0);
}

function normalizeHourlySeries(series) {
    if (!Array.isArray(series)) return createEmptyHourlySeries();
    return Array.from({ length: 24 }, (_, index) => Math.max(0, Number(series[index]) || 0));
}

function normalizeDailyBucket(bucket) {
    const safeBucket = bucket && typeof bucket === 'object' ? bucket : {};
    return {
        clicks: Number(safeBucket.clicks) || 0,
        onlineTime: Number(safeBucket.onlineTime) || 0,
        hourlyClicks: normalizeHourlySeries(safeBucket.hourlyClicks),
        hourlyOnline: normalizeHourlySeries(safeBucket.hourlyOnline)
    };
}

function ensureDailyBucket(dateKey) {
    if (!analyticsData.daily[dateKey]) {
        analyticsData.daily[dateKey] = normalizeDailyBucket(null);
    } else {
        analyticsData.daily[dateKey] = normalizeDailyBucket(analyticsData.daily[dateKey]);
    }
    return analyticsData.daily[dateKey];
}

function getCurrentHourIndex() {
    return new Date().getHours();
}

function getLinkAnalyticsKey(link) {
    const name = link && typeof link.name === 'string' ? link.name.trim() : 'unknown';
    const url = link && typeof link.url === 'string' ? link.url.trim() : '';
    return `${name}__${url}`;
}

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

    analyticsData.links[key].name = link.name;
    analyticsData.links[key].url = link.url;
    if (!analyticsData.links[key].daily || typeof analyticsData.links[key].daily !== 'object') {
        analyticsData.links[key].daily = {};
    }

    return analyticsData.links[key];
}

function trackLinkClick(link) {
    if (!analyticsData || !link) return;

    const todayKey = getTodayKey();
    const dayBucket = ensureDailyBucket(todayKey);
    const linkBucket = ensureLinkBucket(link);
    const currentHour = getCurrentHourIndex();

    dayBucket.clicks += 1;
    dayBucket.hourlyClicks[currentHour] += 1;
    linkBucket.totalClicks += 1;
    linkBucket.lastClickedAt = new Date().toISOString();
    linkBucket.daily[todayKey] = (linkBucket.daily[todayKey] || 0) + 1;

    saveAnalyticsData();
}

function trackOnlineTimeTick() {
    if (!analyticsData) return;

    const todayKey = getTodayKey();
    const dayBucket = ensureDailyBucket(todayKey);
    const currentHour = getCurrentHourIndex();
    dayBucket.onlineTime += 1;
    dayBucket.hourlyOnline[currentHour] += 1;

    if (dayBucket.onlineTime % 10 === 0) {
        saveAnalyticsData();
    }
}

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

function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDuration(totalSeconds) {
    const safeSeconds = Math.max(0, totalSeconds || 0);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatDurationLabel(totalSeconds) {
    const safeSeconds = Math.max(0, totalSeconds || 0);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);

    if (hours > 0) return `${hours} 小时 ${minutes} 分`;
    return `${Math.max(0, minutes)} 分钟`;
}

function formatShortDate(dateKey) {
    return dateKey ? dateKey.slice(5) : '暂无';
}

function formatHourLabel(hour) {
    return `${String(hour).padStart(2, '0')}:00 - ${String(hour).padStart(2, '0')}:59`;
}

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

function getTrendState(dailySeries) {
    if (dailySeries.length < 2) return '等待积累数据';

    const mid = Math.floor(dailySeries.length / 2);
    const firstHalf = dailySeries.slice(0, mid);
    const secondHalf = dailySeries.slice(mid);
    const firstAvg = firstHalf.reduce((sum, item) => sum + item.clicks, 0) / Math.max(1, firstHalf.length);
    const secondAvg = secondHalf.reduce((sum, item) => sum + item.clicks, 0) / Math.max(1, secondHalf.length);

    if (secondAvg > firstAvg * 1.15) return '热度上升中';
    if (secondAvg < firstAvg * 0.85) return '热度回落中';
    return '整体较稳定';
}

function getSummaryForRange(range) {
    const config = getStatsRangeConfig(range);
    const dateKeys = getRecentDateKeys(config.days);
    const dailySeries = dateKeys.map((dateKey) => {
        const bucket = analyticsData.daily[dateKey] || { clicks: 0, onlineTime: 0 };
        return {
            dateKey,
            clicks: bucket.clicks || 0,
            onlineTime: bucket.onlineTime || 0
        };
    });

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
