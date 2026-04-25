const MAX_HISTORY_ITEMS = 10;
let editModalPointerDownOnOverlay = false;
let statsModalPointerDownOnOverlay = false;

window.onload = function () {
    AppState.loadState();
    applyStoredPreferences();
    applyDependencyFallbacks();
    hydrateContent();
    startRuntimeServices();
    bindEventListeners();
    checkBackupReminder();
};

function applyStoredPreferences() {
    if (AppStorage.getTheme() === 'dark') {
        document.body.classList.add('dark-mode');
        document.querySelector('#themeBtn i').className = 'fa-solid fa-sun';
    }
}

function hydrateContent() {
    const savedAudioText = AppStorage.getCustomAudioText();
    if (savedAudioText) {
        document.getElementById('audioText').innerHTML = sanitizeHTML(savedAudioText);
    }

    const savedTitle = AppStorage.getCustomArtText();
    document.getElementById('artText').innerText = savedTitle || defaultTitle;
}

function startRuntimeServices() {
    setInterval(updateClock, 1000);
    updateClock();
    startOnlineTimeTimer();
    renderLinks();
    initCountdowns();
    drawStaticLine();
    if (typeof WeatherApp !== 'undefined') {
        WeatherApp.init();
    }
}

function applyDependencyFallbacks() {
    if (!isFontAwesomeAvailable()) {
        document.body.classList.add('icon-font-fallback');
    }

    if (!window.pinyinPro) {
        console.warn('pinyin-pro unavailable, falling back to plain text history matching.');
    }

    if (!hasLunarSupport()) {
        console.warn('lunar-javascript unavailable, lunar birthday editing is temporarily disabled.');
    }
}

function checkBackupReminder() {
    const lastBackup = AppStorage.get(AppStorage.keys.lastBackup, null);
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    if (!lastBackup || (now - safeParseInt(lastBackup, 0) > oneWeek)) {
        if (confirm('\u4f60\u5df2\u7ecf\u8d85\u8fc7\u4e00\u5468\u6ca1\u6709\u5907\u4efd\u6570\u636e\u4e86\uff0c\u73b0\u5728\u8981\u5907\u4efd\u5417\uff1f')) {
            exportData();
        }
    }
}

function bindEventListeners() {
    document.getElementById('themeBtn').addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        const icon = this.querySelector('i');

        if (document.body.classList.contains('dark-mode')) {
            icon.className = 'fa-solid fa-sun';
            AppStorage.setTheme('dark');
        } else {
            icon.className = 'fa-solid fa-moon';
            AppStorage.setTheme('light');
        }
    });

    document.getElementById('statsBtn').addEventListener('click', function() {
        openStatsModal();
    });

    document.querySelectorAll('#statsRangeSwitcher .stats-range-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            setStatsRange(this.getAttribute('data-range'));
        });
    });

    document.getElementById('editBtn').addEventListener('click', function() {
        isEditMode = !isEditMode;
        this.classList.toggle('active');
        document.body.classList.toggle('edit-mode');
        document.getElementById('searchInput').placeholder = isEditMode
            ? '\u73b0\u5728\u662f\u7f16\u8f91\u6a21\u5f0f\uff0c\u70b9\u51fb\u4efb\u610f\u6309\u94ae\u5373\u53ef\u4fee\u6539...'
            : ' \u8bf7\u8f93\u5165\u641c\u7d22\u5185\u5bb9~';
        renderLinks();
    });

    document.getElementById('audioVisualBtn').addEventListener('click', async function() {
        const btn = this;

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
                btn.classList.add('active');
                drawVisualizer();
            } catch (err) {
                console.error('\u9ea6\u514b\u98ce\u542f\u52a8\u5931\u8d25:', err);
                alert('\u65e0\u6cd5\u83b7\u53d6\u9ea6\u514b\u98ce\u6743\u9650\uff0c\u8bf7\u68c0\u67e5\u6d4f\u89c8\u5668\u8bbe\u7f6e\u3002');
            }
        } else {
            isVisualizerOn = false;
            btn.classList.remove('active');

            if (animationId) cancelAnimationFrame(animationId);
            if (audioStream) audioStream.getTracks().forEach(track => track.stop());
            if (source) source.disconnect();
            if (analyser) analyser.disconnect();

            drawStaticLine();
        }
    });

    document.getElementById('cameraBtn').addEventListener('click', async function() {
        const videoEl = document.getElementById('camera-feed');

        if (cameraStream) {
            closeCamera();
            return;
        }

        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            videoEl.srcObject = cameraStream;
            videoEl.muted = true;
            videoEl.play();
            cameraWin.style.display = 'flex';
            cameraWin.classList.remove('camera-window-hidden');
            cameraWin.style.left = '';
            cameraWin.style.top = '';
            cameraWin.style.right = '';
            cameraWin.style.bottom = '';
            this.classList.add('active');
        } catch (err) {
            console.error(err);
            alert('\u65e0\u6cd5\u8bbf\u95ee\u6444\u50cf\u5934\u6216\u9ea6\u514b\u98ce\uff1a' + err.message);
        }
    });

    document.getElementById('recordBtn').addEventListener('click', function() {
        if (!isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    });

    const editModal = document.getElementById('editModal');
    editModal.addEventListener('mousedown', function(e) {
        editModalPointerDownOnOverlay = e.target === this;
    });
    editModal.addEventListener('mouseup', function(e) {
        const shouldClose = editModalPointerDownOnOverlay && e.target === this;
        editModalPointerDownOnOverlay = false;
        if (shouldClose) closeModal();
    });

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

    document.getElementById('clock-box').addEventListener('click', function() {
        if (this.dataset.suppressClick === 'true') {
            this.dataset.suppressClick = 'false';
            return;
        }
        openCountdownModal();
    });

    document.getElementById('artText').addEventListener('click', function() {
        editTitle();
    });

    document.getElementById('audioText').addEventListener('click', function() {
        editSubtitle();
    });

    document.getElementById('importBtn').addEventListener('click', function() {
        triggerImport();
    });

    document.getElementById('exportBtn').addEventListener('click', function() {
        exportData();
    });

    document.getElementById('modalCancelBtn').addEventListener('click', function() {
        closeModal();
    });

    document.getElementById('modalCloseBtn').addEventListener('click', function() {
        closeModal();
    });

    document.getElementById('modalSaveBtn').addEventListener('click', function() {
        saveData();
    });

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

    document.getElementById('statsCloseBtn').addEventListener('click', function() {
        closeStatsModal();
    });

    document.getElementById('cameraCloseBtn').addEventListener('click', function() {
        closeCamera();
    });

    document.getElementById('cameraMinBtn').addEventListener('click', function() {
        toggleCameraMin();
    });

    document.getElementById('importInput').addEventListener('change', function() {
        importData(this);
    });

    const statsModal = document.getElementById('statsModal');
    statsModal.addEventListener('mousedown', function(e) {
        statsModalPointerDownOnOverlay = e.target === this;
    });
    statsModal.addEventListener('mouseup', function(e) {
        const shouldClose = statsModalPointerDownOnOverlay && e.target === this;
        statsModalPointerDownOnOverlay = false;
        if (shouldClose) closeStatsModal();
    });

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

    initClockDrag();
    initInteractiveBackground();
}

function startOnlineTimeTimer() {
    updateStatsDisplay();

    onlineTimeInterval = setInterval(() => {
        if (!isPageVisible) return;
        onlineTime++;
        trackOnlineTimeTick();
        if (onlineTime % 10 === 0) {
            AppState.persistOnlineTime();
        }
        updateStatsDisplay();
    }, 1000);
}

function updateStatsDisplay() {
    const clickCountElement = document.getElementById('clickCount');
    if (clickCountElement) {
        clickCountElement.textContent = clickCount;
    }

    const onlineTimeElement = document.getElementById('onlineTime');
    if (onlineTimeElement) {
        const hours = Math.floor(onlineTime / 3600);
        const minutes = Math.floor((onlineTime % 3600) / 60);
        const seconds = onlineTime % 60;
        onlineTimeElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}
