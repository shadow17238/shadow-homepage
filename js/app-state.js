const AppState = (function () {
    const state = {
        appData: [],
        isEditMode: false,
        currentEditIndices: { catIndex: -1, linkIndex: -1 },
        countdownData: [],
        audioCtx: null,
        analyser: null,
        source: null,
        animationId: null,
        audioStream: null,
        isVisualizerOn: false,
        cameraStream: null,
        mediaRecorder: null,
        recordedChunks: [],
        recordTimerInterval: null,
        isRecording: false,
        editType: 'link',
        clickCount: 0,
        onlineTime: 0,
        onlineTimeInterval: null,
        analyticsData: null,
        isPageVisible: document.visibilityState !== 'hidden',
        searchHistory: []
    };

    function deepClone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function defineStateProperty(key) {
        Object.defineProperty(window, key, {
            configurable: true,
            get() {
                return state[key];
            },
            set(value) {
                state[key] = value;
            }
        });
    }

    [
        'appData',
        'isEditMode',
        'currentEditIndices',
        'countdownData',
        'audioCtx',
        'analyser',
        'source',
        'animationId',
        'audioStream',
        'isVisualizerOn',
        'cameraStream',
        'mediaRecorder',
        'recordedChunks',
        'recordTimerInterval',
        'isRecording',
        'editType',
        'clickCount',
        'onlineTime',
        'onlineTimeInterval',
        'analyticsData',
        'isPageVisible',
        'searchHistory'
    ].forEach(defineStateProperty);

    function loadAppData() {
        const savedData = AppStorage.getAppData();
        const loaded = savedData || deepClone(defaultData);
        return validateAppData(loaded) ? loaded : deepClone(defaultData);
    }

    function loadSearchHistory() {
        const savedHistory = AppStorage.getSearchHistory();
        return Array.isArray(savedHistory) ? savedHistory : [];
    }

    function loadState() {
        state.appData = loadAppData();
        state.clickCount = AppStorage.getClickCount();
        state.onlineTime = AppStorage.getOnlineTime();
        state.searchHistory = loadSearchHistory();
        state.analyticsData = loadAnalyticsData();
        state.isPageVisible = document.visibilityState !== 'hidden';
        return state;
    }

    return {
        state,
        loadState,
        persistAppData() {
            return AppStorage.setAppData(state.appData);
        },
        persistSearchHistory() {
            return AppStorage.setSearchHistory(state.searchHistory);
        },
        persistClickCount() {
            return AppStorage.setClickCount(state.clickCount);
        },
        persistOnlineTime() {
            return AppStorage.setOnlineTime(state.onlineTime);
        },
        persistCountdowns() {
            return AppStorage.setCountdownData(state.countdownData);
        },
        persistAnalytics() {
            return AppStorage.setAnalyticsData(state.analyticsData);
        }
    };
})();
