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
 * 绑定主题切换相关的事件
 */
function bindThemeEvents() {
    const btn = document.getElementById('themeBtn');
    if (!btn) return;
    btn.addEventListener('click', function() {
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
}

/**
 * 绑定统计分析模块相关的事件
 */
function bindStatsEvents() {
    // 打开面板
    const statsBtn = document.getElementById('statsBtn');
    if (statsBtn) {
        statsBtn.addEventListener('click', async function() {
            await loadWithSpinner(this, 'js/stats-ui.js', 'openStatsModal');
            if (typeof openStatsModal !== 'undefined') openStatsModal();
        });
    }

    // 统计范围切换
    document.querySelectorAll('#statsRangeSwitcher .stats-range-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (typeof setStatsRange !== 'undefined') {
                setStatsRange(this.getAttribute('data-range'));
            }
        });
    });

    // 关闭按钮
    const closeBtn = document.getElementById('statsCloseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            if (typeof closeStatsModal === 'function') closeStatsModal();
        });
    }
}

/**
 * 绑定编辑模式及寄语修改相关的事件
 */
function bindEditEvents() {
    // 切换编辑模式
    const editBtn = document.getElementById('editBtn');
    if (editBtn) {
        editBtn.addEventListener('click', function() {
            isEditMode = !isEditMode;
            this.classList.toggle('active');
            document.body.classList.toggle('edit-mode');

            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.placeholder = isEditMode
                    ? '现在是编辑模式，点击任意卡片即可修改...'
                    : ' 请输入搜索内容~';
            }
            renderLinks();
        });
    }

    // 点击艺术字标题
    const artText = document.getElementById('artText');
    if (artText) {
        artText.addEventListener('click', function() {
            editTitle();
        });
    }
}

/**
 * 绑定搜索及搜索历史相关的事件
 */
function bindSearchEvents() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', showSearchHistory);
    searchInput.addEventListener('keypress', handleSearch);
    searchInput.addEventListener('focus', showSearchHistory);

    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) searchBtn.addEventListener('click', doSearch);
    const clearBtn = document.getElementById('clearHistoryBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearSearchHistory);
}

/**
 * 绑定多媒体功能（可视化、摄像头、一言）相关的事件
 */
function bindMediaEvents() {
    // 音频可视化
    const audioBtn = document.getElementById('audioVisualBtn');
    if (audioBtn) {
        audioBtn.addEventListener('click', async function() {
            await loadWithSpinner(this, 'js/media.js', 'drawVisualizer');

            if (!isVisualizerOn) {
                try {
                    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    if (!audioCtx) {
                        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    } else if (audioCtx.state === 'suspended') {
                        await audioCtx.resume();
                    }
                    analyser = audioCtx.createAnalyser();
                    analyser.fftSize = 256;
                    source = audioCtx.createMediaStreamSource(audioStream);
                    source.connect(analyser);
                    isVisualizerOn = true;
                    this.classList.add('active');
                    drawVisualizer();
                } catch (err) {
                    console.error('麦克风启动失败:', err);
                    alert('无法获取麦克风权限，请检查浏览器设置。');
                }
            } else {
                isVisualizerOn = false;
                this.classList.remove('active');
                if (animationId) cancelAnimationFrame(animationId);
                if (audioStream) audioStream.getTracks().forEach(track => track.stop());
                if (source) source.disconnect();
                if (analyser) analyser.disconnect();
                drawStaticLine();
            }
        });
    }

    // 摄像头
    const cameraBtn = document.getElementById('cameraBtn');
    if (cameraBtn) {
        cameraBtn.addEventListener('click', async function() {
            await loadWithSpinner(this, 'js/media.js', 'closeCamera');
            if (cameraStream) {
                closeCamera();
                return;
            }
            try {
                cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                const videoEl = document.getElementById('camera-feed');
                if (videoEl) {
                    videoEl.srcObject = cameraStream;
                    videoEl.muted = true;
                    videoEl.play();
                }
                const cameraWin = document.getElementById('camera-window');
                if (cameraWin) {
                    cameraWin.style.display = 'flex';
                    cameraWin.classList.remove('camera-window-hidden');
                }
                this.classList.add('active');
            } catch (err) {
                console.error(err);
                alert('无法访问摄像头或麦克风：' + err.message);
            }
        });
    }

    // 录制控制
    const recordBtn = document.getElementById('recordBtn');
    if (recordBtn) {
        recordBtn.addEventListener('click', function() {
            if (!isRecording) startRecording();
            else stopRecording();
        });
    }

    // 窗口控制
    const camCloseBtn = document.getElementById('cameraCloseBtn');
    if (camCloseBtn) camCloseBtn.addEventListener('click', closeCamera);
    const camMinBtn = document.getElementById('cameraMinBtn');
    if (camMinBtn) camMinBtn.addEventListener('click', toggleCameraMin);

    // 一言点击刷新
    const audioText = document.getElementById('audioText');
    if (audioText) audioText.addEventListener('click', updateDailyHitokoto);
}

/**
 * 绑定模态框背景点击自动关闭事件
 */
function bindModalOverlayEvents() {
    initModalCloseOnOverlayClick('editModal', () => {
        if (typeof closeModal === 'function') closeModal();
    });
    initModalCloseOnOverlayClick('statsModal', () => {
        if (typeof closeStatsModal === 'function') closeStatsModal();
    });
}

/**
 * 绑定模态框（主要是编辑链接弹窗）内部按钮事件
 */
function bindModalButtonEvents() {
    const cancelBtn = document.getElementById('modalCancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    const closeBtn = document.getElementById('modalCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    const saveBtn = document.getElementById('modalSaveBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveData);
}

/**
 * 绑定导入导出相关的事件
 */
function bindImportExportEvents() {
    const importBtn = document.getElementById('importBtn');
    if (importBtn) importBtn.addEventListener('click', triggerImport);
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportData);
    const importInput = document.getElementById('importInput');
    if (importInput) {
        importInput.addEventListener('change', function() {
            importData(this);
        });
    }
}

/**
 * 绑定倒计时管理表单相关的事件
 */
function bindCountdownFormEvents() {
    const cdType = document.getElementById('cdType');
    if (cdType) cdType.addEventListener('change', toggleCdInput);
    const cdAddBtn = document.getElementById('cdAddBtn');
    if (cdAddBtn) cdAddBtn.addEventListener('click', addCountdown);
    const cdResetBtn = document.getElementById('cdResetBtn');
    if (cdResetBtn) cdResetBtn.addEventListener('click', resetCountdownForm);

    const closeBtns = ['cdCloseBtn', 'countdownCloseBtn'];
    closeBtns.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => {
                resetCountdownForm();
                document.getElementById('countdownModal').style.display = 'none';
            });
        }
    });
}

/**
 * 绑定页面生命周期及能见度状态事件
 */
function bindLifecycleEvents() {
    window.addEventListener('beforeunload', function() {
        AppState.persistOnlineTime();
        flushAnalyticsData();
    });

    document.addEventListener('visibilitychange', function() {
        isPageVisible = document.visibilityState !== 'hidden';
        if (document.visibilityState === 'hidden') {
            AppState.persistOnlineTime();
            flushAnalyticsData();
        }
    });
}

/**
 * 绑定时钟交互相关的事件
 */
function bindClockEvents() {
    const clockBox = document.getElementById('clock-box');
    if (!clockBox) return;
    clockBox.addEventListener('click', function() {
        if (this.dataset.suppressClick === 'true') {
            this.dataset.suppressClick = 'false';
            return;
        }
        openCountdownModal();
    });
}

/**
 * 集中分发绑定页面所有组件的交互事件监听器
 */
function bindEventListeners() {
    bindThemeEvents();
    bindStatsEvents();
    bindEditEvents();
    bindSearchEvents();
    bindMediaEvents();
    bindModalOverlayEvents();
    bindModalButtonEvents();
    bindImportExportEvents();
    bindCountdownFormEvents();
    bindLifecycleEvents();
    bindClockEvents();

    // 初始化核心交互组件
    initClockDrag();
    initInteractiveBackground();

    // 链接卡片事件委托
    const linkContainer = document.getElementById('linkContainer');
    if (linkContainer) {
        linkContainer.addEventListener('click', handleLinkContainerClick);
        linkContainer.addEventListener('contextmenu', handleLinkContainerContextMenu);
    }
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
