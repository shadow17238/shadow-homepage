// 导入数据
// 注意：由于是本地文件，我们直接使用全局变量，在 HTML 中按顺序加载

// 状态变量
let appData = [];
let isEditMode = false;
let currentEditIndices = { catIndex: -1, linkIndex: -1 };
let countdownData = []; // 存储结构: { name, type, dateStr, lunarM, lunarD }
let audioCtx, analyser, source, animationId, audioStream;
let isVisualizerOn = false; // 初始状态为关闭
let cameraStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let recordTimerInterval = null;
let isRecording = false;
let editType = 'link'; // 当前正在编辑的类型：'link' (链接) 或 'title' (标题)

// 统计功能相关变量
let clickCount = 0; // 点击次数
let onlineTime = 0; // 在线时间（秒）
let onlineTimeInterval = null; // 在线时间计时器

// 搜索历史相关变量
let searchHistory = []; // 搜索历史
const MAX_HISTORY_ITEMS = 10; // 最大历史记录数量

// 2. 初始化加载
window.onload = function() {
    // 加载主题
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        document.querySelector('#themeBtn i').className = 'fa-solid fa-sun';
    }
    const savedAudioText = localStorage.getItem('custom_audio_text');
    if (savedAudioText) {
        document.getElementById('audioText').innerHTML = savedAudioText;
    }

    // 加载数据：优先读取本地缓存，否则使用默认数据
    const savedData = localStorage.getItem('shadows_homepage_data_v2');
    if (savedData) {
        appData = JSON.parse(savedData);
    } else {
        appData = JSON.parse(JSON.stringify(defaultData)); // Deep copy
    }

    // --- 加载自定义的艺术字 ---
    const savedTitle = localStorage.getItem('custom_art_text');
    if (savedTitle) {
        document.getElementById('artText').innerText = savedTitle;
    } else {
        // 默认使用备份文件中的标题
        document.getElementById('artText').innerText = defaultTitle;
    }

    // --- 加载统计数据 ---
    const savedClickCount = localStorage.getItem('shadow_click_count');
    if (savedClickCount) {
        clickCount = parseInt(savedClickCount);
    }
    const savedOnlineTime = localStorage.getItem('shadow_online_time');
    if (savedOnlineTime) {
        onlineTime = parseInt(savedOnlineTime);
    }
    
    // --- 加载搜索历史 ---
    const savedSearchHistory = localStorage.getItem('shadow_search_history');
    if (savedSearchHistory) {
        searchHistory = JSON.parse(savedSearchHistory);
    }

    // --- 启动时钟 ---
    setInterval(updateClock, 1000);
    updateClock(); // 立即执行一次，避免延迟
    
    // --- 启动在线时间计时器 ---
    startOnlineTimeTimer();
    
    renderLinks();

    initCountdowns();

    drawStaticLine();

    // --- 加载时钟位置 ---
    const savedPos = localStorage.getItem('clock_position');
    if (savedPos) {
        const pos = JSON.parse(savedPos);
        const clockBox = document.getElementById('clock-box');
        clockBox.style.left = pos.left;
        clockBox.style.top = pos.top;
    } else {
        // 默认使用备份文件中的位置
        const clockBox = document.getElementById('clock-box');
        clockBox.style.left = defaultClockPosition.left;
        clockBox.style.top = defaultClockPosition.top;
    }

    // 绑定事件监听器
    bindEventListeners();
    
    // 检查备份提醒
    checkBackupReminder();
};

// 检查备份提醒
function checkBackupReminder() {
    const lastBackup = localStorage.getItem('shadow_last_backup');
    const now = new Date().getTime();
    const oneWeek = 7 * 24 * 60 * 60 * 1000; // 一周时间
    
    if (!lastBackup || (now - parseInt(lastBackup) > oneWeek)) {
        if (confirm('您已经超过一周没有备份数据了，是否现在备份？')) {
            exportData();
        }
    }
}

// 绑定事件监听器
function bindEventListeners() {
    // 主题切换
    document.getElementById('themeBtn').addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        const icon = this.querySelector('i');
        
        if (document.body.classList.contains('dark-mode')) {
            icon.className = 'fa-solid fa-sun';
            localStorage.setItem('theme', 'dark');
        } else {
            icon.className = 'fa-solid fa-moon';
            localStorage.setItem('theme', 'light');
        }
    });

    // 编辑模式
    document.getElementById('editBtn').addEventListener('click', function() {
        isEditMode = !isEditMode;
        this.classList.toggle('active');
        document.body.classList.toggle('edit-mode');
        
        // 简单的提示
        if(isEditMode) {
            document.getElementById('searchInput').placeholder = "现在是编辑模式，点击任意按钮修改...";
        } else {
            document.getElementById('searchInput').placeholder = " 请输入搜索内容~";
        }
    });

    // 麦克风按钮
    document.getElementById('audioVisualBtn').addEventListener('click', async function() {
        const btn = this;

        if (!isVisualizerOn) {
            // ======================
            // === 开启麦克风模式 ===
            // ======================
            try {
                // 1. 获取麦克风流
                audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                // 2. 初始化音频环境 (AudioContext)
                if (!audioCtx) {
                    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                } else if (audioCtx.state === 'suspended') {
                    await audioCtx.resume();
                }

                // 3. 连接分析器
                analyser = audioCtx.createAnalyser();
                analyser.fftSize = 256; // 稍微改小一点fftSize，柱子会更宽更平滑
                
                source = audioCtx.createMediaStreamSource(audioStream);
                source.connect(analyser);

                // 4. 改变状态标记
                isVisualizerOn = true;
                btn.classList.add('active'); // 按钮变红
                
                // 5. 开始动起来！(调用动态绘制函数)
                drawVisualizer();

            } catch (err) {
                console.error("麦克风启动失败:", err);
                alert("无法获取麦克风权限，请检查浏览器设置。");
            }
        } else {
            // ======================
            // === 关闭麦克风模式 ===
            // ======================
            isVisualizerOn = false;
            btn.classList.remove('active'); // 按钮变回灰色

            // 1. 停止动画循环
            if (animationId) cancelAnimationFrame(animationId);

            // 2. 停止占用麦克风 (消除浏览器标签页的小红点)
            if (audioStream) {
                audioStream.getTracks().forEach(track => track.stop());
            }

            // 3. 断开内部连接
            if (source) source.disconnect();
            if (analyser) analyser.disconnect();

            // 4. 【核心区别在这里】：关闭后，手动画一条直线
            // 这样就不会留下一堆乱七八糟的柱子，而是变回安静的状态
            drawStaticLine(); 
        }
    });

    // 摄像头按钮
    document.getElementById('cameraBtn').addEventListener('click', async function() {
        const videoEl = document.getElementById('camera-feed');
        
        if (cameraStream) {
            closeCamera();
            return;
        }

        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            
            videoEl.srcObject = cameraStream;
            videoEl.muted = true; 
            videoEl.play();
            
            // --- 修改点：直接显示，无需计算坐标 ---
            // CSS 的 top:50%/left:50% 会自动接管位置
            cameraWin.style.display = 'flex';
            
            // 确保没有残留的行内样式干扰 CSS 类定义
            cameraWin.style.left = '';
            cameraWin.style.top = '';
            cameraWin.style.right = '';
            cameraWin.style.bottom = '';
            
            this.classList.add('active');
        } catch (err) {
            console.error(err);
            alert("无法访问摄像头或麦克风: " + err.message);
        }
    });

    // 录制按钮
    document.getElementById('recordBtn').addEventListener('click', function() {
        if (!isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    });

    // 点击遮罩关闭模态框
    document.getElementById('editModal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
    
    // 初始化互动背景
    initInteractiveBackground();
}

// 启动在线时间计时器
function startOnlineTimeTimer() {
    // 初始化显示
    updateStatsDisplay();
    
    onlineTimeInterval = setInterval(() => {
        onlineTime++;
        // 每10秒保存一次在线时间，减少localStorage操作频率
        if (onlineTime % 10 === 0) {
            localStorage.setItem('shadow_online_time', onlineTime.toString());
        }
        // 更新显示
        updateStatsDisplay();
    }, 1000);
}

// 更新统计信息显示
function updateStatsDisplay() {
    // 更新点击次数
    const clickCountElement = document.getElementById('clickCount');
    if (clickCountElement) {
        clickCountElement.textContent = clickCount;
    }
    
    // 更新在线时间
    const onlineTimeElement = document.getElementById('onlineTime');
    if (onlineTimeElement) {
        const hours = Math.floor(onlineTime / 3600);
        const minutes = Math.floor((onlineTime % 3600) / 60);
        const seconds = onlineTime % 60;
        onlineTimeElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// 3. 渲染页面逻辑
function renderLinks() {
    const container = document.getElementById('linkContainer');
    container.innerHTML = ''; // 清空

    appData.forEach((cat, catIndex) => {
        // 创建分类容器
        const groupDiv = document.createElement('div');
        groupDiv.className = 'category-group';

        // 标题
        const title = document.createElement('div');
        title.className = 'category-title';
        title.innerText = cat.category;
        groupDiv.appendChild(title);

        // 链接网格
        const linksWrapper = document.createElement('div');
        linksWrapper.className = 'links-wrapper';

        cat.links.forEach((link, linkIndex) => {
            const a = document.createElement('a');
            a.className = 'link-card';
            a.title = link.url; // 鼠标悬停显示网址
            
            // 默认行为：跳转
            a.href = link.url;
            if(link.url !== '#') a.target = "_blank";

            // 编辑模式下的点击事件
            a.onclick = (e) => {
                if (isEditMode) {
                    e.preventDefault(); // 阻止跳转
                    openEditModal(catIndex, linkIndex);
                } else if (link.url !== '#') {
                    // 非编辑模式下，且链接不是#，增加点击次数
                    incrementClickCount();
                }
            };

            a.innerText = link.name;
            linksWrapper.appendChild(a);
        });

        groupDiv.appendChild(linksWrapper);
        container.appendChild(groupDiv);
    });
}

// 增加点击次数
function incrementClickCount() {
    clickCount++;
    localStorage.setItem('shadow_click_count', clickCount.toString());
    // 更新显示
    updateStatsDisplay();
}

// 4. 搜索功能
function doSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (query) {
        // 记录搜索历史
        addToSearchHistory(query);
        // 执行搜索
        window.open(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, '_blank');
    }
}

function handleSearch(e) {
    if (e.key === 'Enter') doSearch();
}

// 添加到搜索历史
function addToSearchHistory(query) {
    // 移除重复的历史记录
    searchHistory = searchHistory.filter(item => item !== query);
    // 添加到历史记录开头
    searchHistory.unshift(query);
    // 限制历史记录数量
    if (searchHistory.length > MAX_HISTORY_ITEMS) {
        searchHistory = searchHistory.slice(0, MAX_HISTORY_ITEMS);
    }
    // 保存到本地存储
    localStorage.setItem('shadow_search_history', JSON.stringify(searchHistory));
    // 更新历史记录显示
    showSearchHistory();
}

// 显示搜索历史
function showSearchHistory() {
    const historyContainer = document.getElementById('searchHistoryContainer');
    if (!historyContainer) return;
    
    if (searchHistory.length === 0) {
        historyContainer.style.display = 'none';
        return;
    }
    
    historyContainer.style.display = 'block';
    // 只添加历史记录项，不添加头部
    const historyList = document.createElement('div');
    historyList.className = 'history-list';
    let html = '';
    searchHistory.forEach((item, index) => {
        html += `
            <div class="history-item" onclick="selectHistoryItem('${item}')">
                <i class="fa-solid fa-history"></i>
                <span>${item}</span>
                <span class="history-remove" onclick="removeHistoryItem(${index}); event.stopPropagation();">
                    <i class="fa-solid fa-times"></i>
                </span>
            </div>
        `;
    });
    historyList.innerHTML = html;
    
    // 清空容器并添加新内容
    historyContainer.innerHTML = `
        <div class="history-header" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-bottom: 1px solid var(--border-color);">
            <span style="font-size: 14px; font-weight: bold; color: var(--text-color);">搜索历史</span>
            <button class="clear-history" onclick="clearSearchHistory()" style="background: none; border: none; color: #999; cursor: pointer; font-size: 12px;">清空</button>
        </div>
    `;
    historyContainer.appendChild(historyList);
    
    // 添加点击外部关闭历史记录的事件监听器
    setTimeout(() => {
        document.addEventListener('click', closeSearchHistory);
    }, 100);
}

// 清空搜索历史
function clearSearchHistory() {
    if (confirm('确定要清空所有搜索历史吗？')) {
        searchHistory = [];
        localStorage.setItem('shadow_search_history', JSON.stringify(searchHistory));
        showSearchHistory();
    }
}

// 关闭搜索历史
function closeSearchHistory(e) {
    const historyContainer = document.getElementById('searchHistoryContainer');
    const searchInput = document.getElementById('searchInput');
    
    if (historyContainer && !historyContainer.contains(e.target) && e.target !== searchInput) {
        historyContainer.style.display = 'none';
        document.removeEventListener('click', closeSearchHistory);
    }
}

// 选择历史记录项
function selectHistoryItem(item) {
    document.getElementById('searchInput').value = item;
    // 关闭历史记录框
    const historyContainer = document.getElementById('searchHistoryContainer');
    if (historyContainer) {
        historyContainer.style.display = 'none';
        document.removeEventListener('click', closeSearchHistory);
    }
    doSearch();
}

// 移除历史记录项
function removeHistoryItem(index) {
    searchHistory.splice(index, 1);
    localStorage.setItem('shadow_search_history', JSON.stringify(searchHistory));
    showSearchHistory();
    // 如果删除后历史记录为空，移除事件监听器
    if (searchHistory.length === 0) {
        document.removeEventListener('click', closeSearchHistory);
    }
}

// 关闭弹窗
function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

// --- 点击艺术字 ---
function editTitle() {
    if (!isEditMode) return; // 只有编辑模式下才能点
    
    editType = 'title';
    document.getElementById('modalTitle').innerText = "修改首页寄语";
    document.getElementById('labelName').innerText = "寄语内容";
    document.getElementById('editName').value = document.getElementById('artText').innerText;
    
    // 隐藏 URL 输入框
    document.getElementById('groupUrl').style.display = 'none';
    
    document.getElementById('editModal').style.display = 'flex';
}

// --- 新增：编辑副标题 ---
function editSubtitle() {
    if (!isEditMode) return;
    
    editType = 'subtitle'; // 标记当前编辑的是副标题
    document.getElementById('modalTitle').innerText = "修改律动寄语";
    document.getElementById('labelName').innerText = "内容 (支持HTML标签如<br>)";
    // 读取当前内容（innerHTML为了保留换行符）
    document.getElementById('editName').value = document.getElementById('audioText').innerHTML;
    
    document.getElementById('groupUrl').style.display = 'none';
    document.getElementById('editModal').style.display = 'flex';
}

// --- 点击链接卡片 (替换原来的 openEditModal) ---
function openEditModal(catIndex, linkIndex) {
    editType = 'link';
    currentEditIndices = { catIndex, linkIndex };
    const item = appData[catIndex].links[linkIndex];
    
    document.getElementById('modalTitle').innerText = "自定义链接";
    document.getElementById('labelName').innerText = "显示名称";
    document.getElementById('editName').value = item.name;
    document.getElementById('editUrl').value = item.url;
    
    // 显示 URL 输入框
    document.getElementById('groupUrl').style.display = 'block';
    
    document.getElementById('editModal').style.display = 'flex';
}

// --- 统一的保存函数 (替换原来的 saveLink) ---
function saveData() {
    const newName = document.getElementById('editName').value;
    const newUrl = document.getElementById('editUrl').value;
    
    if (newName) {
        if (editType === 'title') {
            // 1. 保存标题
            document.getElementById('artText').innerText = newName;
            localStorage.setItem('custom_art_text', newName); // 存入缓存
        }
        else if (editType === 'subtitle') { 
            // --- 新增这个判断分支 ---
            document.getElementById('audioText').innerHTML = newName;
            // 如果你想保存这个修改，可以存入 localStorage
            localStorage.setItem('custom_audio_text', newName);
        }
         else {
            // 2. 保存链接
            const { catIndex, linkIndex } = currentEditIndices;
            appData[catIndex].links[linkIndex].name = newName;
            appData[catIndex].links[linkIndex].url = newUrl;
            localStorage.setItem('shadows_homepage_data_v2', JSON.stringify(appData));
            renderLinks();
        }
        closeModal();
    }
}

// --- 新增：导出数据功能 ---
// --- 修改后的：导出数据功能（带时间戳） ---
// --- 修改后的导出函数：打包所有数据 ---
function exportData() {
    // 1. 获取当前时间用于文件名
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    const fileName = `shadow_homepage_full_backup_${month}_${day}_${hour}_${minute}.json`;

    // 2. 准备要打包的所有数据
    const fullData = {
        version: 2.0, // 标记版本，方便以后升级
        appData: appData, // 1. 链接数据
        countdownData: countdownData, // 2. 倒数日数据
        clockPosition: JSON.parse(localStorage.getItem('clock_position') || 'null'), // 3. 时钟位置
        customTitle: document.getElementById('artText').innerText, // 4. 自定义的标题文字
        stats: {
            clickCount: clickCount, // 5. 点击次数
            onlineTime: onlineTime // 6. 在线时间
        }
    };

    // 3. 转换为字符串
    const dataStr = JSON.stringify(fullData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    // 4. 下载
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // 5. 更新备份时间
    localStorage.setItem('shadow_last_backup', now.getTime().toString());
}

// --- 新增：导入数据功能 ---
function triggerImport() {
    // 点击刚才那个隐藏的文件框
    document.getElementById('importInput').click();
}

// --- 修改后的导入函数：智能识别并恢复所有数据 ---
function importData(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const json = JSON.parse(e.target.result);
            
            // --- 情况 A: 如果是以前导出的旧数据 (纯数组) ---
            if (Array.isArray(json)) {
                if(confirm("检测到这是旧版本的备份文件（只包含链接），是否仅导入链接？")) {
                    appData = json;
                    localStorage.setItem('shadows_homepage_data_v2', JSON.stringify(appData));
                    renderLinks();
                    alert("链接数据已恢复！");
                }
            } 
            // --- 情况 B: 如果是新的全量备份 (对象结构) ---
            else if (json.version || json.appData) {
                // 1. 恢复链接
                if (json.appData) {
                    appData = json.appData;
                    localStorage.setItem('shadows_homepage_data_v2', JSON.stringify(appData));
                    renderLinks();
                }

                // 2. 恢复倒数日
                if (json.countdownData) {
                    countdownData = json.countdownData;
                    localStorage.setItem('shadow_countdowns', JSON.stringify(countdownData));
                    refreshCountdowns(); // 刷新显示
                }

                // 3. 恢复时钟位置
                if (json.clockPosition) {
                    const pos = json.clockPosition;
                    const clockBox = document.getElementById('clock-box');
                    clockBox.style.left = pos.left;
                    clockBox.style.top = pos.top;
                    localStorage.setItem('clock_position', JSON.stringify(pos));
                }

                // 4. 恢复标题
                if (json.customTitle) {
                    document.getElementById('artText').innerText = json.customTitle;
                    localStorage.setItem('custom_art_text', json.customTitle);
                }

                // 5. 恢复统计数据（询问用户）
                if (json.stats) {
                    if (confirm("检测到备份文件中包含统计数据（点击次数和在线时间），是否导入这些数据？")) {
                        if (json.stats.clickCount !== undefined) {
                            clickCount = json.stats.clickCount;
                            localStorage.setItem('shadow_click_count', clickCount.toString());
                        }
                        if (json.stats.onlineTime !== undefined) {
                            onlineTime = json.stats.onlineTime;
                            localStorage.setItem('shadow_online_time', onlineTime.toString());
                        }
                        // 更新显示
                        updateStatsDisplay();
                    }
                }

                alert("所有数据已完美恢复！");
            } 
            else {
                alert("文件格式不正确，无法识别。");
            }

        } catch (err) {
            alert("读取文件失败：" + err.message);
        }
        // 清空 input，防止同个文件无法再次触发 change
        inputElement.value = ''; 
    };
    reader.readAsText(file);
}

function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour12: false }); // 24小时制
    const dateStr = now.toLocaleDateString('zh-CN'); // 日期
    const weekArr = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    const weekStr = weekArr[now.getDay()];

    document.getElementById('clockTime').innerText = timeStr;
    document.getElementById('clockDate').innerText = `${dateStr} ${weekStr}`;
}

// --- 新增：时钟拖拽功能 ---
const clockBox = document.getElementById('clock-box');
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// 1. 鼠标按下：开始拖拽
clockBox.addEventListener('mousedown', function(e) {
    if (!isEditMode) return; // 只有编辑模式允许拖动

    isDragging = true;
    // 计算鼠标点击点距离盒子左上角的偏移量
    dragOffsetX = e.clientX - clockBox.offsetLeft;
    dragOffsetY = e.clientY - clockBox.offsetTop;
});

// 2. 鼠标移动：更新位置
window.addEventListener('mousemove', function(e) {
    if (isDragging) {
        e.preventDefault(); // 防止默认行为
        
        // 计算新位置
        const newLeft = e.clientX - dragOffsetX;
        const newTop = e.clientY - dragOffsetY;

        clockBox.style.left = newLeft + 'px';
        clockBox.style.top = newTop + 'px';
    }
});

// 3. 鼠标松开：保存位置
window.addEventListener('mouseup', function() {
    if (isDragging) {
        isDragging = false;
        // 保存位置到本地存储
        const pos = {
            left: clockBox.style.left,
            top: clockBox.style.top
        };
        localStorage.setItem('clock_position', JSON.stringify(pos));
    }
});

// --- 初始化：加载保存的时钟位置 ---
// (请把这段逻辑加入到 window.onload 函数里面，或者直接放在这里也可以，因为它在脚本最后)
(function loadClockPosition() {
    const savedPos = localStorage.getItem('clock_position');
    if (savedPos) {
        const pos = JSON.parse(savedPos);
        clockBox.style.left = pos.left;
        clockBox.style.top = pos.top;
    }
})();

// --- 倒数日功能逻辑 ---

function initCountdowns() {
    const saved = localStorage.getItem('shadow_countdowns');
    if (saved) {
        countdownData = JSON.parse(saved);
    } else {
        // 默认使用备份文件中的倒数日数据
        countdownData = JSON.parse(JSON.stringify(defaultCountdownData));
        // 保存到本地存储
        localStorage.setItem('shadow_countdowns', JSON.stringify(countdownData));
    }
    refreshCountdowns();
    // 每天自动刷新一次日期计算，或者每次打开网页刷新
    setInterval(refreshCountdowns, 60000); // 每分钟检查一次UI
}

// 核心：计算剩余天数和处理自动续期
function getDaysInfo(item) {
    const today = new Date();
    today.setHours(0,0,0,0);
    let targetDate = new Date();
    let label = "";

    if (item.type === 'normal') {
        // 手动解析字符串，使用 new Date(y, m, d) 会强制使用本地时间0点
        const parts = item.dateStr.split('-'); 
        // 注意：月份在JS里是 0-11，所以要减 1
        targetDate = new Date(parts[0], parts[1] - 1, parts[2]); 
    }
    else if (item.type === 'solar_bday') {
        // 公历生日：取今年的生日，如果过了就取明年
        const bday = new Date(item.dateStr); // 只取月日
        targetDate.setFullYear(today.getFullYear(), bday.getMonth(), bday.getDate());
        if (targetDate < today) {
            targetDate.setFullYear(today.getFullYear() + 1);
        }
        label = "生日";
    } 
    else if (item.type === 'lunar_bday') {
        // 农历生日：使用 lunar-javascript 库
        const lunarYear = Lunar.fromDate(today).getYear();
        // 获取今年的农历生日对应的公历
        let d = Lunar.fromYmd(lunarYear, parseInt(item.lunarM), parseInt(item.lunarD)).getSolar();
        targetDate = new Date(d.getYear(), d.getMonth() - 1, d.getDay());
        
        // 如果今天已经过了这个农历对应的公历日期，算明年的
        if (targetDate < today) {
            let nextD = Lunar.fromYmd(lunarYear + 1, parseInt(item.lunarM), parseInt(item.lunarD)).getSolar();
            targetDate = new Date(nextD.getYear(), nextD.getMonth() - 1, nextD.getDay());
        }
        label = "农历生日";
    }

    // 计算差值
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return { days: diffDays, target: targetDate, isExpired: (item.type === 'normal' && diffDays < 0) };
}

function refreshCountdowns() {
    const wrapper = document.getElementById('countdown-wrapper');
    if (!countdownData || countdownData.length === 0) {
        wrapper.style.display = 'none';
        return;
    }

    // 1. 计算所有事件的天数
    let list = [];
    let newData = []; // 用来过滤过期事件
    
    countdownData.forEach(item => {
        const info = getDaysInfo(item);
        if (!info.isExpired) {
            list.push({ ...item, days: info.days, sortDate: info.target });
            newData.push(item);
        }
    });

    // 如果有普通事件过期被删除了，更新本地存储
    if (newData.length !== countdownData.length) {
        countdownData = newData;
        localStorage.setItem('shadow_countdowns', JSON.stringify(countdownData));
    }

    if (list.length === 0) {
        wrapper.style.display = 'none';
        return;
    }

    // 2. 排序：天数小的在前
    list.sort((a, b) => a.days - b.days);

    // 3. 渲染
    wrapper.style.display = 'block';
    let html = '';
    
    // 渲染 Top 1 (最近的)
    const top = list[0];
    html += `
        <div class="cd-top-item">
            <span>${top.name} <span class="cd-top-label">${top.days === 0 ? '就是今天!' : '还有'}</span></span>
            <span class="cd-top-days" style="color:${top.days<=3 ? '#ff4d4f':'var(--accent-color)'}">${top.days}天</span>
        </div>
    `;

    // 渲染其余 (最多显示4个，防止太长，但数据存10个)
    for(let i=1; i<list.length; i++) {
        html += `
            <div class="cd-normal-item">
                <span>${list[i].name}</span>
                <span class="cd-days-small">${list[i].days} 天</span>
            </div>
        `;
    }
    
    wrapper.innerHTML = html;
}

// 打开弹窗（只有在编辑模式下点击时钟才触发）
function openCountdownModal() {
    if (!isEditMode) return;
    
    // 渲染编辑列表
    const listDiv = document.getElementById('cd-list-edit');
    listDiv.innerHTML = '';
    countdownData.forEach((item, index) => {
        const div = document.createElement('div');
        div.style.padding = "5px";
        div.style.borderBottom = "1px dashed #eee";
        div.innerHTML = `
            ${index+1}. ${item.name} <span style="font-size:10px;color:#999">(${item.type})</span>
            <span class="del-tag" onclick="delCountdown(${index})"><i class="fa-solid fa-trash"></i></span>
        `;
        listDiv.appendChild(div);
    });

    document.getElementById('countdownModal').style.display = 'flex';
}

// 切换输入框显示（农历不需要日期选择器，只需要月/日）
function toggleCdInput() {
    const type = document.getElementById('cdType').value;
    if (type === 'lunar_bday') {
        document.getElementById('cdDateInput').style.display = 'none';
        document.getElementById('lunarInputParams').style.display = 'flex';
    } else {
        document.getElementById('cdDateInput').style.display = 'block';
        document.getElementById('lunarInputParams').style.display = 'none';
    }
}

// 添加事件
function addCountdown() {
    if (countdownData.length >= 30) {
        alert("最多添加30个倒数日");
        return;
    }

    const name = document.getElementById('cdName').value;
    const type = document.getElementById('cdType').value;
    let newItem = { name: name, type: type };

    if (!name) { alert("请输入名称"); return; }

    if (type === 'lunar_bday') {
        const m = document.getElementById('lunarMonth').value;
        const d = document.getElementById('lunarDay').value;
        if (!m || !d) { alert("请输入农历月日"); return; }
        newItem.lunarM = m;
        newItem.lunarD = d;
        newItem.dateStr = ""; // 农历不需要具体年份日期串
    } else {
        const dateVal = document.getElementById('cdDateInput').value;
        if (!dateVal) { alert("请选择日期"); return; }
        newItem.dateStr = dateVal;
    }

    countdownData.push(newItem);
    localStorage.setItem('shadow_countdowns', JSON.stringify(countdownData));
    
    // 清空输入
    document.getElementById('cdName').value = '';
    
    refreshCountdowns();
    openCountdownModal(); // 刷新列表
}

function delCountdown(index) {
    countdownData.splice(index, 1);
    localStorage.setItem('shadow_countdowns', JSON.stringify(countdownData));
    refreshCountdowns();
    openCountdownModal(); // 刷新列表
}

// --- 新增：麦克风声纹律动逻辑 ---
function drawVisualizer() {
    animationId = requestAnimationFrame(drawVisualizer);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 获取颜色
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
    
    // --- 1. 控制文字消失逻辑 ---
    let totalVolume = 0;
    // 取前80个低频数据计算音量
    for(let i=0; i<80; i++) totalVolume += dataArray[i];
    
    const textField = document.getElementById('audioText');
    if (textField) {
        // 声音越大，透明度越低。超过一定阈值(800)就开始变透明
        // 这种算法比单纯的 0和1 更柔和
        let opacity = 1 - (Math.max(0, totalVolume - 500) / 3000);
        if(opacity < 0) opacity = 0;
        textField.style.opacity = opacity;
    }

    // --- 2. 绘制声纹 (镜像对称风格) ---
    const bars = 60; // 柱子数量
    const barWidth = 4; 
    const gap = 4;   // 间隙
    const radius = 150; // 曲线散开的范围
    
    ctx.fillStyle = accentColor;
    ctx.strokeStyle = accentColor;
    
    // 我们用两个循环，分别画柱子和上面的线
    
    // A. 画柱子 (Voiceprint)
    for (let i = 0; i < bars; i++) {
        // 数据索引优化：低频在中间，高频在两边，或者反过来
        // 这里直接取低频数据，跳动感强
        let value = dataArray[i]; 
        let barHeight = (value / 255) * 60; // 高度限制一下，不要太高

        if (barHeight > 2) { // 有声音才画柱子
            // 稍微设点透明度
            ctx.globalAlpha = 0.6;
            // 右边
            ctx.fillRect(centerX + i * (barWidth + gap), height/2 + 20 - barHeight, barWidth, barHeight);
            // 镜像左边
            ctx.fillRect(centerX - (i + 1) * (barWidth + gap), height/2 + 20 - barHeight, barWidth, barHeight);
            
            // 倒影 (可选，增加立体感)
            ctx.globalAlpha = 0.2;
            ctx.fillRect(centerX + i * (barWidth + gap), height/2 + 20, barWidth, barHeight * 0.5);
            ctx.fillRect(centerX - (i + 1) * (barWidth + gap), height/2 + 20, barWidth, barHeight * 0.5);
        }
    }

    // B. 画那条跳动的线 (Curve Line)
    ctx.globalAlpha = 1.0; // 线条要实心
    ctx.lineWidth = 2;
    ctx.beginPath();

    // 线的基准高度
    const baseLineY = height / 2 + 20;

    // 从左向右画线
    for (let i = bars; i >= 0; i--) {
        let value = dataArray[i];
        let h = (value / 255) * 60 + 5; // +5 让线悬浮在柱子上方
        let x = centerX - i * (barWidth + gap) - (barWidth/2);
        let y = baseLineY - h;
        if(i === bars) ctx.moveTo(x, y); // 起点
        else ctx.lineTo(x, y); // 连线
    }
    
    // 继续画右半边
    for (let i = 0; i < bars; i++) {
        let value = dataArray[i];
        let h = (value / 255) * 60 + 5;
        let x = centerX + i * (barWidth + gap) + (barWidth/2);
        let y = baseLineY - h;
        ctx.lineTo(x, y);
    }
    
    ctx.stroke();
}
// --- 新增：画一条静态的水平直线 ---
function drawStaticLine() {
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // 获取主题色
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
    
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5; //稍微淡一点，显安静
    
    // 画在画布中间偏下的位置
    const y = height / 2 + 20; 
    
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    
    // 确保文字是显示的
    const textField = document.getElementById('audioText');
    if(textField) textField.style.opacity = '1';
}

// --- 摄像头悬浮窗逻辑 (含录制功能) ---
const cameraWin = document.getElementById('camera-window');
const cameraHeader = document.getElementById('camera-header');
const recordBtn = document.getElementById('recordBtn');
const timerDisplay = document.getElementById('record-timer');

// 开始录制
function startRecording() {
    if (!cameraStream) return;
    
    recordedChunks = [];
    // 优先使用 mp4 格式，如果不支持则回退到 webm
    let options = { mimeType: 'video/webm;codecs=vp9' };
    if (MediaRecorder.isTypeSupported('video/mp4')) {
        options = { mimeType: 'video/mp4' };
    }

    try {
        mediaRecorder = new MediaRecorder(cameraStream, options);
    } catch (e) {
        console.warn("当前设置不支持，尝试默认设置");
        mediaRecorder = new MediaRecorder(cameraStream);
    }

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = exportVideo;

    mediaRecorder.start();
    isRecording = true;
    
    // UI 变化
    recordBtn.classList.add('recording');
    timerDisplay.style.display = 'block';
    startTimer();
}

// 停止录制
function stopRecording() {
    if (mediaRecorder) {
        mediaRecorder.stop();
    }
    isRecording = false;
    
    // UI 恢复
    recordBtn.classList.remove('recording');
    timerDisplay.style.display = 'none';
    stopTimer();
}

// 导出视频文件
function exportVideo() {
    const blob = new Blob(recordedChunks, {
        type: mediaRecorder.mimeType || 'video/webm'
    });
    
    // 生成文件名：Camera_月-日_时-分.mp4
    const now = new Date();
    const fileName = `Camera_${now.getMonth()+1}-${now.getDate()}_${now.getHours()}-${now.getMinutes()}.mp4`;
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
}

// 简单的计时器逻辑
function startTimer() {
    let seconds = 0;
    timerDisplay.innerText = "00:00";
    recordTimerInterval = setInterval(() => {
        seconds++;
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        timerDisplay.innerText = `${m}:${s}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(recordTimerInterval);
    timerDisplay.innerText = "00:00";
}

// 3. 关闭功能
function closeCamera() {
    const videoEl = document.getElementById('camera-feed');
    const btn = document.getElementById('cameraBtn');
    
    if (isRecording) {
        stopRecording(); // 如果正在录制，先停止并保存
    }

    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    
    videoEl.srcObject = null;
    cameraWin.style.display = 'none';
    btn.classList.remove('active');
}

// 4. 最小化/还原
function toggleCameraMin() {
    cameraWin.classList.toggle('minimized');
}



// 互动背景效果
function initInteractiveBackground() {
    const canvas = document.getElementById('interactive-bg');
    const ctx = canvas.getContext('2d');
    
    // 设置Canvas大小
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 全局变形因子，用于实现圆环的平滑变形
    let deformationFactor = 0;
    let deformationSpeed = 0.002; // 减慢变形速度，使效果更平滑
    
    // 点的类
    class Point {
        constructor(index, total) {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.size = Math.random() * 4 + 2; // 点的大小
            this.targetX = this.x;
            this.targetY = this.y;
            this.speed = Math.random() * 0.03 + 0.01; // 减慢速度，使效果更平滑
            this.index = index;
            this.total = total;
            this.isSeparated = false; // 是否分离状态
            this.separationTime = 0; // 分离时间
            this.separationDuration = Math.random() * 5000 + 3000; // 增加分离持续时间，让效果更明显
        }
        
        update(mouseX, mouseY, mouseSpeed, isMouseMoving, isMouseOutside) {
            // 计算到鼠标的距离
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 目标半径
            const targetRadius = 100;
            
            // 根据鼠标状态调整行为
            if (isMouseOutside) {
                // 鼠标移出屏幕，点全屏幕随机缓慢移动
                if (Math.random() < 0.005) {
                    // 随机改变目标位置
                    this.targetX = Math.random() * canvas.width;
                    this.targetY = Math.random() * canvas.height;
                }
            } else if (isMouseMoving) {
                // 鼠标正在移动，无论速度快慢，都分散一下
                if (!this.isSeparated && Math.random() < 0.02) {
                    this.isSeparated = true;
                    this.separationTime = 0;
                    
                    // 根据鼠标速度决定分散距离
                    let separationDistance;
                    if (mouseSpeed > 50) {
                        // 鼠标移动很快，散开至屏幕四周
                        const direction = Math.random();
                        if (direction < 0.25) {
                            // 上方
                            this.targetX = Math.random() * canvas.width;
                            this.targetY = 0 - this.size;
                        } else if (direction < 0.5) {
                            // 右侧
                            this.targetX = canvas.width + this.size;
                            this.targetY = Math.random() * canvas.height;
                        } else if (direction < 0.75) {
                            // 下方
                            this.targetX = Math.random() * canvas.width;
                            this.targetY = canvas.height + this.size;
                        } else {
                            // 左侧
                            this.targetX = 0 - this.size;
                            this.targetY = Math.random() * canvas.height;
                        }
                    } else {
                        // 鼠标移动较慢，小范围分散
                        const angle = Math.random() * Math.PI * 2;
                        separationDistance = Math.random() * 150 + 50;
                        this.targetX = mouseX + Math.cos(angle) * separationDistance;
                        this.targetY = mouseY + Math.sin(angle) * separationDistance;
                    }
                }
            } else {
                // 鼠标静止，汇聚到鼠标附近
                if (!this.isSeparated) {
                    const angle = (this.index / this.total) * Math.PI * 2;
                    // 减少变形因子，使圆环更圆
                    const radius = targetRadius * (1 + 0.05 * Math.sin(deformationFactor + this.index * 0.1));
                    this.targetX = mouseX + Math.cos(angle) * radius;
                    this.targetY = mouseY + Math.sin(angle) * radius;
                }
            }
            
            // 分离后一段时间返回
            if (this.isSeparated && !isMouseOutside) {
                this.separationTime += 16; // 假设每帧16ms
                if (this.separationTime > this.separationDuration) {
                    // 回到鼠标附近
                    const angle = (this.index / this.total) * Math.PI * 2;
                    // 减少变形因子，使圆环更圆
                    const radius = targetRadius * (1 + 0.05 * Math.sin(deformationFactor + this.index * 0.1));
                    this.targetX = mouseX + Math.cos(angle) * radius;
                    this.targetY = mouseY + Math.sin(angle) * radius;
                    this.isSeparated = false;
                }
            }
            
            // 根据鼠标状态调整移动速度
            let moveSpeed = this.speed;
            if (isMouseOutside) {
                moveSpeed = this.speed * 0.5; // 鼠标移出时，点移动更慢
            } else if (mouseSpeed > 50) {
                moveSpeed = this.speed * 0.5; // 鼠标移动快时，点移动慢一点
            } else if (mouseSpeed > 10) {
                moveSpeed = this.speed * 0.8; // 鼠标移动中等时，点移动稍慢
            }
            
            // 平滑移动到目标位置
            this.x += (this.targetX - this.x) * moveSpeed;
            this.y += (this.targetY - this.y) * moveSpeed;
        }
        
        draw() {
            // 绘制点，使用径向渐变
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // 创建点
    const points = [];
    const numPoints = 50; // 点的数量，使效果更丰富
    for (let i = 0; i < numPoints; i++) {
        points.push(new Point(i, numPoints));
    }
    
    // 鼠标位置
    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;
    let lastMouseX = mouseX;
    let lastMouseY = mouseY;
    let mouseSpeed = 0;
    let isMouseMoving = false;
    let mouseMoveTimer = null;
    let isMouseOutside = false;
    
    // 鼠标移动事件
    document.addEventListener('mousemove', (e) => {
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // 计算鼠标移动速度
        const dx = mouseX - lastMouseX;
        const dy = mouseY - lastMouseY;
        mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        
        // 标记鼠标正在移动
        isMouseMoving = true;
        isMouseOutside = false;
        
        // 重置移动计时器
        clearTimeout(mouseMoveTimer);
        mouseMoveTimer = setTimeout(() => {
            isMouseMoving = false;
            mouseSpeed = 0;
        }, 300);
        
        console.log('Mouse position:', mouseX, mouseY, 'Speed:', mouseSpeed, 'Moving:', isMouseMoving);
    });
    
    // 鼠标离开事件
    document.addEventListener('mouseleave', () => {
        isMouseOutside = true;
        mouseSpeed = 0;
        isMouseMoving = false;
        clearTimeout(mouseMoveTimer);
        console.log('Mouse left, points will move randomly');
    });
    
    // 动画循环
    function animate() {
        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 更新变形因子
        deformationFactor += deformationSpeed;
        if (deformationFactor > Math.PI * 2) {
            deformationFactor = 0;
        }
        
        // 更新和绘制点
        points.forEach(point => {
            point.update(mouseX, mouseY, mouseSpeed, isMouseMoving, isMouseOutside);
            point.draw();
        });
        
        // 绘制连接线
        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                const dx = points[i].x - points[j].x;
                const dy = points[i].y - points[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 120) {
                    // 绘制连接线，使用线性渐变
                    const opacity = 0.6 * (1 - distance / 120);
                    const gradient = ctx.createLinearGradient(points[i].x, points[i].y, points[j].x, points[j].y);
                    gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
                    gradient.addColorStop(1, `rgba(255, 255, 255, ${opacity * 0.5})`);
                    
                    ctx.strokeStyle = gradient;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(points[i].x, points[i].y);
                    ctx.lineTo(points[j].x, points[j].y);
                    ctx.stroke();
                }
            }
        }
        
        // 绘制中心点（仅当鼠标在屏幕内时）
        if (!isMouseOutside) {
            const centerGradient = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 10);
            centerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            centerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = centerGradient;
            ctx.beginPath();
            ctx.arc(mouseX, mouseY, 10, 0, Math.PI * 2);
            ctx.fill();
        }
        
        requestAnimationFrame(animate);
    }
    
    // 开始动画
    animate();
}