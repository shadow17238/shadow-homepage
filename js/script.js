/**
 * 页面加载完成后的初始化入口
 */
window.onload = function () {
    AppState.loadState(); // 加载应用程序运行时状态
    applyStoredPreferences(); // 应用存储的用户偏好（如主题）
    applyDependencyFallbacks(); // 处理第三方依赖库加载失败的情况
    hydrateContent(); // 填充页面初始动态内容
    startRuntimeServices(); // 启动运行时后台服务（时钟、计时器等）
    bindEventListeners(); // 绑定所有 DOM 事件交互监听
    checkBackupReminder(); // 检查并提醒数据备份
};

/**
 * 应用用户保存的个性化首选项
 */
function applyStoredPreferences() {
    // 应用深色模式设置
    if (AppStorage.getTheme() === 'dark') {
        document.body.classList.add('dark-mode');
        const themeIcon = document.querySelector('#themeBtn i');
        if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
    }
}

/**
 * 填充页面的初始动态内容
 */
function hydrateContent() {
    updateDailyHitokoto(); // 异步获取并展示每日一言

    // 应用保存的自定义艺术字标题，若无则使用默认值
    const savedTitle = AppStorage.getCustomArtText();
    const artTextEl = document.getElementById('artText');
    if (artTextEl) artTextEl.innerText = savedTitle || defaultTitle;
}

/**
 * 获取并展示每日一言（Hitokoto）
 * 包含简单的本地缓存机制，确保同一天内不重复请求 API
 */
async function updateDailyHitokoto() {
    const textEl = document.getElementById('audioText');
    if (!textEl) return;

    const today = new Date().toDateString();
    const cached = AppStorage.getJSON('shadow_daily_hitokoto', null);

    // 如果日期相同且本地已有缓存，则直接使用缓存内容
    if (cached && cached.date === today) {
        textEl.innerHTML = cached.text;
        return;
    }

    // 否则通过 API 获取新的一言
    try {
        const response = await fetch('https://v1.hitokoto.cn/?c=i&c=d&c=h&c=j');
        const data = await response.json();
        const newText = data.hitokoto;
        
        // 更新 UI 并持久化到本地缓存
        textEl.innerHTML = newText;
        AppStorage.setJSON('shadow_daily_hitokoto', {
            date: today,
            text: newText
        });
    } catch (err) {
        console.error('获取一言失败:', err);
        // API 请求失败时，优先使用旧缓存，若连缓存都没有则使用默认占位文案
        textEl.innerHTML = cached ? cached.text : '纵容的 喜欢的 讨厌的 宠溺的 厌倦的<br>一个个慢慢暗淡';
    }
}

/**
 * 启动所有常驻后台服务和核心组件初始化
 */
function startRuntimeServices() {
    setInterval(updateClock, 1000); // 每秒更新一次系统时钟
    updateClock();
    startOnlineTimeTimer(); // 启动在线时长统计计时器
    renderLinks(); // 渲染主页导航链接列表
    initCountdowns(); // 初始化倒计时组件
    drawStaticLine(); // 在可视化画布上绘制初始线条
    
    // 初始化子应用模块（如果存在）
    if (typeof WeatherApp !== 'undefined') {
        WeatherApp.init();
    }
    if (typeof initSearchEngine !== 'undefined') {
        initSearchEngine();
    }
}

/**
 * 检查并处理外部依赖库缺失的降级逻辑
 */
function applyDependencyFallbacks() {
    // 如果 Font Awesome 未能正确加载，应用降级样式以确保图标位置正确
    if (!isFontAwesomeAvailable()) {
        document.body.classList.add('icon-font-fallback');
    }

    // 拼音处理库不可用时输出警告（影响搜索历史记录的拼音匹配）
    if (!window.pinyinPro) {
        console.warn('pinyin-pro unavailable, falling back to plain text history matching.');
    }

    // 农历计算库不可用时输出警告（影响倒计时的农历生日编辑）
    if (!hasLunarSupport()) {
        console.warn('lunar-javascript unavailable, lunar birthday editing is temporarily disabled.');
    }
}

/**
 * 检查数据备份记录，如果超过一周未备份则弹出提示
 */
function checkBackupReminder() {
    const lastBackup = AppStorage.get(AppStorage.keys.lastBackup, null);
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    if (!lastBackup || (now - safeParseInt(lastBackup, 0) > oneWeek)) {
        if (confirm('你已经超过一周没有备份数据了，现在要备份吗？')) {
            exportData();
        }
    }
}

/**
 * 集中绑定页面所有组件的交互事件监听器
 */
function bindEventListeners() {
    // 主题切换（深色/浅色模式）
    document.getElementById('themeBtn').addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        const icon = this.querySelector('i');

        if (document.body.classList.contains('dark-mode')) {
            if (icon) icon.className = 'fa-solid fa-sun';
            AppStorage.setTheme('dark');
        } else {
            if (icon) icon.className = 'fa-solid fa-moon';
            AppStorage.setTheme('light');
        }
    });

    // 打开统计分析面板
    document.getElementById('statsBtn').addEventListener('click', async function() {
        // 动态加载 UI 脚本，显示加载状态
        await loadWithSpinner(this, 'js/stats-ui.js', 'openStatsModal');
        if (typeof openStatsModal !== 'undefined') openStatsModal();
    });

    // 统计面板内的时间范围切换
    document.querySelectorAll('#statsRangeSwitcher .stats-range-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (typeof setStatsRange !== 'undefined') {
                setStatsRange(this.getAttribute('data-range'));
            }
        });
    });

    // 进入/退出编辑模式
    document.getElementById('editBtn').addEventListener('click', function() {
        isEditMode = !isEditMode;
        this.classList.toggle('active');
        document.body.classList.toggle('edit-mode');
        // 编辑模式下搜索框显示辅助提示文案
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.placeholder = isEditMode
                ? '现在是编辑模式，点击任意卡片即可修改...'
                : ' 请输入搜索内容~';
        }
        renderLinks(); // 重新渲染列表以更新样式和行为
    });

    // 音频可视化控制按钮
    document.getElementById('audioVisualBtn').addEventListener('click', async function() {
        // 动态加载媒体处理核心脚本
        await loadWithSpinner(this, 'js/media.js', 'drawVisualizer');

        if (!isVisualizerOn) {
            try {
                // 请求用户麦克风访问权限
                audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

                if (!audioCtx) {
                    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                } else if (audioCtx.state === 'suspended') {
                    await audioCtx.resume();
                }

                // 创建并连接音频分析节点
                analyser = audioCtx.createAnalyser();
                analyser.fftSize = 256;
                source = audioCtx.createMediaStreamSource(audioStream);
                source.connect(analyser);

                isVisualizerOn = true;
                this.classList.add('active');
                drawVisualizer(); // 启动帧动画循环绘制频谱
            } catch (err) {
                console.error('麦克风启动失败:', err);
                alert('无法获取麦克风权限，请检查浏览器设置。');
            }
        } else {
            // 关闭可视化服务并释放资源
            isVisualizerOn = false;
            this.classList.remove('active');

            if (animationId) cancelAnimationFrame(animationId);
            if (audioStream) audioStream.getTracks().forEach(track => track.stop());
            if (source) source.disconnect();
            if (analyser) analyser.disconnect();

            drawStaticLine(); // 画布恢复静态展示
        }
    });

    // 摄像头预览及录制控制按钮
    document.getElementById('cameraBtn').addEventListener('click', async function() {
        await loadWithSpinner(this, 'js/media.js', 'closeCamera');

        const videoEl = document.getElementById('camera-feed');
        if (cameraStream) {
            closeCamera();
            return;
        }

        try {
            // 请求摄像头和麦克风并发流
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (videoEl) {
                videoEl.srcObject = cameraStream;
                videoEl.muted = true; // 预览场景静音以防止声学反馈
                videoEl.play();
            }
            // 弹出预览窗口并重置位置
            const cameraWin = document.getElementById('camera-window');
            if (cameraWin) {
                cameraWin.style.display = 'flex';
                cameraWin.classList.remove('camera-window-hidden');
                cameraWin.style.left = '';
                cameraWin.style.top = '';
                cameraWin.style.right = '';
                cameraWin.style.bottom = '';
            }
            this.classList.add('active');
        } catch (err) {
            console.error(err);
            alert('无法访问摄像头或麦克风：' + err.message);
        }
    });

    // 录制开始/停止切换
    document.getElementById('recordBtn').addEventListener('click', function() {
        if (!isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    });

    // 点击模态框背景自动关闭逻辑初始化
    initModalCloseOnOverlayClick('editModal', () => {
        if (typeof closeModal === 'function') closeModal();
    });
    initModalCloseOnOverlayClick('statsModal', () => {
        if (typeof closeStatsModal === 'function') closeStatsModal();
    });

    // 搜索交互相关事件绑定
    document.getElementById('searchInput').addEventListener('input', function() {
        showSearchHistory();
    });

    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        handleSearch(e);
    });

    document.getElementById('searchInput').addEventListener('focus', function() {
        showSearchHistory();
    });

    document.getElementById('searchBtn').addEventListener('click', function() {
        doSearch();
    });

    document.getElementById('clearHistoryBtn').addEventListener('click', function() {
        clearSearchHistory();
    });

    // 时钟区域交互（点击进入倒计时管理）
    document.getElementById('clock-box').addEventListener('click', function() {
        // 如果是从拖动操作中释放，则拦截此次点击，防止误触发模态框
        if (this.dataset.suppressClick === 'true') {
            this.dataset.suppressClick = 'false';
            return;
        }
        openCountdownModal();
    });

    // 点击艺术字标题修改寄语
    document.getElementById('artText').addEventListener('click', function() {
        editTitle();
    });

    // 点击底部文案手动强制刷新一言
    document.getElementById('audioText').addEventListener('click', function() {
        updateDailyHitokoto();
    });

    // 数据导入导出交互
    document.getElementById('importBtn').addEventListener('click', function() {
        triggerImport();
    });

    document.getElementById('exportBtn').addEventListener('click', function() {
        exportData();
    });

    // 模态框内部按钮操作
    document.getElementById('modalCancelBtn').addEventListener('click', function() {
        closeModal();
    });

    document.getElementById('modalCloseBtn').addEventListener('click', function() {
        closeModal();
    });

    document.getElementById('modalSaveBtn').addEventListener('click', function() {
        saveData();
    });

    // 倒计时表单交互行为
    document.getElementById('cdType').addEventListener('change', function() {
        toggleCdInput();
    });

    document.getElementById('cdCloseBtn').addEventListener('click', function() {
        resetCountdownForm();
        document.getElementById('countdownModal').style.display = 'none';
    });

    document.getElementById('countdownCloseBtn').addEventListener('click', function() {
        resetCountdownForm();
        document.getElementById('countdownModal').style.display = 'none';
    });

    document.getElementById('cdAddBtn').addEventListener('click', function() {
        addCountdown();
    });

    document.getElementById('cdResetBtn').addEventListener('click', function() {
        resetCountdownForm();
    });

    // 统计分析界面关闭
    document.getElementById('statsCloseBtn').addEventListener('click', function() {
        closeStatsModal();
    });

    // 摄像头悬浮窗交互
    document.getElementById('cameraCloseBtn').addEventListener('click', function() {
        closeCamera();
    });

    document.getElementById('cameraMinBtn').addEventListener('click', function() {
        toggleCameraMin();
    });

    // 文件导入 input 监听
    document.getElementById('importInput').addEventListener('change', function() {
        importData(this);
    });

    // 页面卸载或刷新前强制持久化关键数据
    window.addEventListener('beforeunload', function() {
        AppState.persistOnlineTime();
        flushAnalyticsData();
    });

    // 页面能见度改变时（最小化/切换标签页）保存进度
    document.addEventListener('visibilitychange', function() {
        isPageVisible = document.visibilityState !== 'hidden';
        if (document.visibilityState === 'hidden') {
            AppState.persistOnlineTime();
            flushAnalyticsData();
        }
    });

    // 初始化交互性组件
    initClockDrag();
    initInteractiveBackground();
}

/**
 * 启动在线时长统计计时服务
 */
function startOnlineTimeTimer() {
    updateStatsDisplay();

    onlineTimeInterval = setInterval(() => {
        // 只有在页面处于前台且可见时，才累加在线时长
        if (!isPageVisible) return;
        onlineTime++;
        trackOnlineTimeTick(); // 记录统计心跳
        
        // 每过 10 秒进行一次增量持久化
        if (onlineTime % 10 === 0) {
            AppState.persistOnlineTime();
        }
        updateStatsDisplay(); // 实时更新界面数字
    }, 1000);
}

/**
 * 集中更新 UI 上展示的统计数据（点击量和在线时长）
 */
function updateStatsDisplay() {
    const clickCountElement = document.getElementById('clickCount');
    if (clickCountElement) {
        clickCountElement.textContent = clickCount;
    }

    const onlineTimeElement = document.getElementById('onlineTime');
    if (onlineTimeElement) {
        onlineTimeElement.textContent = formatDuration(onlineTime);
    }
}
