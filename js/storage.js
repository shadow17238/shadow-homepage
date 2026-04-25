/**
 * 应用程序存储管理对象，封装了对 localStorage 的所有操作
 */
const AppStorage = {
    /**
     * 存储在 localStorage 中的所有键名
     */
    keys: {
        theme: 'theme', // 主题设置
        appData: 'shadows_homepage_data_v2', // 应用程序链接数据
        customArtText: 'custom_art_text', // 自定义艺术字文本
        customAudioText: 'custom_audio_text', // 自定义音频文本
        clickCount: 'shadow_click_count', // 总点击次数
        onlineTime: 'shadow_online_time', // 在线时长（秒）
        searchHistory: 'shadow_search_history', // 搜索历史
        countdowns: 'shadow_countdowns', // 倒计时数据
        analytics: 'shadow_analytics_v1', // 统计分析数据
        lastBackup: 'shadow_last_backup', // 上次备份时间戳
        clockPosition: 'clock_position' // 时钟位置设置
    },

    /**
     * 获取存储的原始字符串值
     * @param {string} key - 键名
     * @param {string|null} fallback - 回退值
     * @return {string|null}
     */
    get(key, fallback = null) {
        return getStorageItem(key, fallback);
    },

    /**
     * 设置存储的原始字符串值
     * @param {string} key - 键名
     * @param {string} value - 键值
     * @return {boolean}
     */
    set(key, value) {
        return setStorageItem(key, value);
    },

    /**
     * 获取并解析 JSON 格式的存储值
     * @param {string} key - 键名
     * @param {any} fallback - 回退值
     * @return {any}
     */
    getJSON(key, fallback = null) {
        return safeParseJSON(this.get(key, null), fallback);
    },

    /**
     * 序列化并存储 JSON 格式的值
     * @param {string} key - 键名
     * @param {any} value - 待存储的对象或数组
     * @return {boolean}
     */
    setJSON(key, value) {
        return this.set(key, JSON.stringify(value));
    },

    /**
     * 获取并解析数字格式的存储值
     * @param {string} key - 键名
     * @param {number} fallback - 回退值
     * @return {number}
     */
    getNumber(key, fallback = 0) {
        return safeParseInt(this.get(key, null), fallback);
    },

    /**
     * 存储数字格式的值（转为字符串存储）
     * @param {string} key - 键名
     * @param {number} value - 待存储的数字
     * @return {boolean}
     */
    setNumber(key, value) {
        return this.set(key, String(value));
    },

    /**
     * 获取主题设置
     * @return {string|null}
     */
    getTheme() {
        return this.get(this.keys.theme, null);
    },

    /**
     * 设置主题设置
     * @param {string} value - 主题名称
     * @return {boolean}
     */
    setTheme(value) {
        return this.set(this.keys.theme, value);
    },

    /**
     * 获取应用数据（链接列表）
     * @return {Array|null}
     */
    getAppData() {
        return this.getJSON(this.keys.appData, null);
    },

    /**
     * 设置应用数据
     * @param {Array} value - 链接分类列表
     * @return {boolean}
     */
    setAppData(value) {
        return this.setJSON(this.keys.appData, value);
    },

    /**
     * 获取自定义艺术字文本
     * @return {string|null}
     */
    getCustomArtText() {
        return this.get(this.keys.customArtText, null);
    },

    /**
     * 设置自定义艺术字文本
     * @param {string} value
     * @return {boolean}
     */
    setCustomArtText(value) {
        return this.set(this.keys.customArtText, value);
    },

    /**
     * 获取自定义音频显示文本
     * @return {string|null}
     */
    getCustomAudioText() {
        return this.get(this.keys.customAudioText, null);
    },

    /**
     * 设置自定义音频显示文本
     * @param {string} value
     * @return {boolean}
     */
    setCustomAudioText(value) {
        return this.set(this.keys.customAudioText, value);
    },

    /**
     * 获取总点击次数
     * @return {number}
     */
    getClickCount() {
        return this.getNumber(this.keys.clickCount, 0);
    },

    /**
     * 设置总点击次数
     * @param {number} value
     * @return {boolean}
     */
    setClickCount(value) {
        return this.setNumber(this.keys.clickCount, value);
    },

    /**
     * 获取总在线时长
     * @return {number}
     */
    getOnlineTime() {
        return this.getNumber(this.keys.onlineTime, 0);
    },

    /**
     * 设置总在线时长
     * @param {number} value
     * @return {boolean}
     */
    setOnlineTime(value) {
        return this.setNumber(this.keys.onlineTime, value);
    },

    /**
     * 获取搜索历史记录
     * @return {Array}
     */
    getSearchHistory() {
        return this.getJSON(this.keys.searchHistory, []);
    },

    /**
     * 设置搜索历史记录
     * @param {Array} value
     * @return {boolean}
     */
    setSearchHistory(value) {
        return this.setJSON(this.keys.searchHistory, value);
    },

    /**
     * 获取倒计时项列表
     * @return {Array|null}
     */
    getCountdownData() {
        return this.getJSON(this.keys.countdowns, null);
    },

    /**
     * 设置倒计时项列表
     * @param {Array} value
     * @return {boolean}
     */
    setCountdownData(value) {
        return this.setJSON(this.keys.countdowns, value);
    },

    /**
     * 获取统计分析数据
     * @return {Object|null}
     */
    getAnalyticsData() {
        return this.getJSON(this.keys.analytics, null);
    },

    /**
     * 设置统计分析数据
     * @param {Object} value
     * @return {boolean}
     */
    setAnalyticsData(value) {
        return this.setJSON(this.keys.analytics, value);
    },

    /**
     * 获取上次备份时间戳
     * @return {number}
     */
    getLastBackup() {
        return this.getNumber(this.keys.lastBackup, 0);
    },

    /**
     * 设置上次备份时间戳
     * @param {number} value
     * @return {boolean}
     */
    setLastBackup(value) {
        return this.setNumber(this.keys.lastBackup, value);
    },

    /**
     * 获取时钟位置设置
     * @return {Object|null}
     */
    getClockPosition() {
        return this.getJSON(this.keys.clockPosition, null);
    },

    /**
     * 设置时钟位置
     * @param {Object} value
     * @return {boolean}
     */
    setClockPosition(value) {
        return this.setJSON(this.keys.clockPosition, value);
    }
};
