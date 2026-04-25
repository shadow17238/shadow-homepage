/**
 * 应用程序状态管理模块，使用立即执行函数 (IIFE) 模式
 */
const AppState = (function () {
    /**
     * 内部状态对象，存储所有运行时变量
     */
    const state = {
        appData: [], // 应用程序链接数据
        isEditMode: false, // 是否处于编辑模式
        currentEditIndices: { catIndex: -1, linkIndex: -1 }, // 当前正在编辑的项索引
        countdownData: [], // 倒计时数据
        audioCtx: null, // Web Audio 上下文
        analyser: null, // 音频频谱分析器
        source: null, // 音频源
        animationId: null, // 可视化动画帧 ID
        audioStream: null, // 音频流（麦克风）
        isVisualizerOn: false, // 可视化是否开启
        cameraStream: null, // 摄像头视频流
        mediaRecorder: null, // 媒体录制器
        recordedChunks: [], // 已录制的视频分块
        recordTimerInterval: null, // 录制时长计时器
        isRecording: false, // 是否正在录制
        editType: 'link', // 当前编辑类型 ('link' 或 'category')
        clickCount: 0, // 页面总点击次数
        onlineTime: 0, // 在线时长（秒）
        onlineTimeInterval: null, // 在线时长计时器
        analyticsData: null, // 统计分析数据
        isPageVisible: document.visibilityState !== 'hidden', // 页面是否可见
        searchHistory: [] // 搜索历史记录
    };

    /**
     * 将 state 中的属性映射到 window 全局对象，方便直接访问
     * @param {string} key - 属性键名
     */
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

    // 批量定义全局属性，以便在其他脚本中直接使用变量名访问 state 里的数据
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

    /**
     * 从存储中加载应用数据，如果不存在则使用默认数据
     * @return {Array} 加载并校验后的应用数据
     */
    function loadAppData() {
        const savedData = AppStorage.getAppData();
        const loaded = savedData || deepClone(defaultData);
        // 如果校验不通过，回退到默认数据
        return validateAppData(loaded) ? loaded : deepClone(defaultData);
    }

    /**
     * 从存储中加载搜索历史记录
     * @return {Array}
     */
    function loadSearchHistory() {
        const savedHistory = AppStorage.getSearchHistory();
        return Array.isArray(savedHistory) ? savedHistory : [];
    }

    /**
     * 初始化加载所有状态
     * @return {Object} 初始化的状态对象
     */
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
        /**
         * 持久化应用链接数据到本地存储
         * @return {boolean}
         */
        persistAppData() {
            return AppStorage.setAppData(state.appData);
        },
        /**
         * 持久化搜索历史记录
         * @return {boolean}
         */
        persistSearchHistory() {
            return AppStorage.setSearchHistory(state.searchHistory);
        },
        /**
         * 持久化总点击次数
         * @return {boolean}
         */
        persistClickCount() {
            return AppStorage.setClickCount(state.clickCount);
        },
        /**
         * 持久化在线时长
         * @return {boolean}
         */
        persistOnlineTime() {
            return AppStorage.setOnlineTime(state.onlineTime);
        },
        /**
         * 持久化倒计时数据
         * @return {boolean}
         */
        persistCountdowns() {
            return AppStorage.setCountdownData(state.countdownData);
        },
        /**
         * 持久化统计分析数据
         * @return {boolean}
         */
        persistAnalytics() {
            return AppStorage.setAnalyticsData(state.analyticsData);
        }
    };
})();
