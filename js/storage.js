const AppStorage = {
    keys: {
        theme: 'theme',
        appData: 'shadows_homepage_data_v2',
        customArtText: 'custom_art_text',
        customAudioText: 'custom_audio_text',
        clickCount: 'shadow_click_count',
        onlineTime: 'shadow_online_time',
        searchHistory: 'shadow_search_history',
        countdowns: 'shadow_countdowns',
        analytics: 'shadow_analytics_v1',
        lastBackup: 'shadow_last_backup',
        clockPosition: 'clock_position'
    },

    get(key, fallback = null) {
        return getStorageItem(key, fallback);
    },

    set(key, value) {
        return setStorageItem(key, value);
    },

    getJSON(key, fallback = null) {
        return safeParseJSON(this.get(key, null), fallback);
    },

    setJSON(key, value) {
        return this.set(key, JSON.stringify(value));
    },

    getNumber(key, fallback = 0) {
        return safeParseInt(this.get(key, null), fallback);
    },

    setNumber(key, value) {
        return this.set(key, String(value));
    },

    getTheme() {
        return this.get(this.keys.theme, null);
    },

    setTheme(value) {
        return this.set(this.keys.theme, value);
    },

    getAppData() {
        return this.getJSON(this.keys.appData, null);
    },

    setAppData(value) {
        return this.setJSON(this.keys.appData, value);
    },

    getCustomArtText() {
        return this.get(this.keys.customArtText, null);
    },

    setCustomArtText(value) {
        return this.set(this.keys.customArtText, value);
    },

    getCustomAudioText() {
        return this.get(this.keys.customAudioText, null);
    },

    setCustomAudioText(value) {
        return this.set(this.keys.customAudioText, value);
    },

    getClickCount() {
        return this.getNumber(this.keys.clickCount, 0);
    },

    setClickCount(value) {
        return this.setNumber(this.keys.clickCount, value);
    },

    getOnlineTime() {
        return this.getNumber(this.keys.onlineTime, 0);
    },

    setOnlineTime(value) {
        return this.setNumber(this.keys.onlineTime, value);
    },

    getSearchHistory() {
        return this.getJSON(this.keys.searchHistory, []);
    },

    setSearchHistory(value) {
        return this.setJSON(this.keys.searchHistory, value);
    },

    getCountdownData() {
        return this.getJSON(this.keys.countdowns, null);
    },

    setCountdownData(value) {
        return this.setJSON(this.keys.countdowns, value);
    },

    getAnalyticsData() {
        return this.getJSON(this.keys.analytics, null);
    },

    setAnalyticsData(value) {
        return this.setJSON(this.keys.analytics, value);
    },

    getLastBackup() {
        return this.getNumber(this.keys.lastBackup, 0);
    },

    setLastBackup(value) {
        return this.setNumber(this.keys.lastBackup, value);
    },

    getClockPosition() {
        return this.getJSON(this.keys.clockPosition, null);
    },

    setClockPosition(value) {
        return this.setJSON(this.keys.clockPosition, value);
    }
};
