/**
 * 搜索历史记录最大存储条数
 */
const MAX_HISTORY_ITEMS = 100;
/**
 * 搜索历史浮层最多显示条数（存储保留 100 条，显示限制以减少 DOM 开销）
 */
const MAX_HISTORY_DISPLAY = 15;
/**
 * 标记是否已绑定关闭搜索历史浮层的全局点击监听器
 */
let isSearchHistoryListenerBound = false;
/**
 * 标记是否已绑定更新搜索历史位置的窗口调整监听器
 */
let isSearchHistoryPositionListenerBound = false;
/**
 * 标记搜索历史容器是否已被正确挂载到 body 节点下
 */
let isSearchHistoryMountedToBody = false;

/**
 * 搜索引擎配置列表
 */
const searchEngines = [
    {
        id: 'bing',
        name: 'Bing',
        url: 'https://www.bing.com/search?q=',
        icon: 'images/bing.ico',
        placeholder: ' Bing 搜索内容~'
    },
    {
        id: 'google',
        name: 'Google',
        url: 'https://www.google.com/search?q=',
        icon: 'images/google.ico',
        placeholder: ' Google 搜索内容~'
    },
    {
        id: 'github',
        name: 'GitHub',
        url: 'https://github.com/search?q=',
        icon: 'images/github.ico',
        placeholder: ' GitHub 仓库/项目~'
    }
];

/**
 * 当前选中的搜索引擎索引
 */
let currentEngineIndex = 0;

/**
 * 初始化搜索引擎，加载用户偏好并应用 UI
 */
function initSearchEngine() {
    // 从本地存储中读取先前选择的搜索引擎 ID
    const savedEngineId = localStorage.getItem('shadow_current_search_engine') || 'bing';
    currentEngineIndex = searchEngines.findIndex(e => e.id === savedEngineId);
    if (currentEngineIndex === -1) currentEngineIndex = 0;
    
    updateSearchEngineUI();

    // 绑定切换引擎的点击事件
    const selector = document.getElementById('searchEngineSelector');
    if (selector) {
        selector.onclick = function(e) {
            e.stopPropagation();
            switchSearchEngine();
        };
    }
}

/**
 * 循环切换到下一个搜索引擎
 */
function switchSearchEngine() {
    currentEngineIndex = (currentEngineIndex + 1) % searchEngines.length;
    const engine = searchEngines[currentEngineIndex];
    localStorage.setItem('shadow_current_search_engine', engine.id);
    updateSearchEngineUI();
}

/**
 * 更新搜索框相关的 UI 元素（图标、占位提示文案）
 */
function updateSearchEngineUI() {
    const engine = searchEngines[currentEngineIndex];
    const iconImg = document.getElementById('currentSearchIcon');
    const searchInput = document.getElementById('searchInput');
    
    if (iconImg) {
        iconImg.src = engine.icon;
        iconImg.alt = engine.name;
    }
    
    if (searchInput && !isEditMode) {
        searchInput.placeholder = engine.placeholder;
    }
}

/**
 * 确保搜索历史浮层容器被正确挂载到 body 下，以便在 z-index 上覆盖其他元素
 * @return {HTMLElement} 历史记录容器 DOM 元素
 */
function ensureSearchHistoryMounted() {
    const historyContainer = document.getElementById('searchHistoryContainer');
    if (!historyContainer || isSearchHistoryMountedToBody) {
        return historyContainer;
    }

    // 挂载到 body 并阻止内部点击事件冒泡到文档
    document.body.appendChild(historyContainer);
    historyContainer.addEventListener('click', (event) => {
        event.stopPropagation();
    });
    isSearchHistoryMountedToBody = true;
    return historyContainer;
}

/**
 * 实时更新搜索历史浮层的位置，使其始终跟随搜索框并保持自适应宽度
 */
function updateSearchHistoryPosition() {
    const historyContainer = ensureSearchHistoryMounted();
    const searchBox = document.querySelector('.search-box');
    if (!historyContainer || !searchBox || historyContainer.style.display === 'none') {
        return;
    }

    const rect = searchBox.getBoundingClientRect();
    const viewportPadding = 12;
    // 动态计算宽度，确保在窄屏下不会超出可视区域
    const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
        Math.max(rect.left, viewportPadding),
        window.innerWidth - width - viewportPadding
    );

    historyContainer.style.top = `${rect.bottom + 12}px`;
    historyContainer.style.left = `${left}px`;
    historyContainer.style.width = `${width}px`;
}

/**
 * 执行搜索逻辑，记录历史并打开结果页
 */
function doSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;

    // 添加到历史记录并进行持久化
    addToSearchHistory(query);
    const engine = searchEngines[currentEngineIndex];
    window.open(`${engine.url}${encodeURIComponent(query)}`, '_blank');
}

/**
 * 处理搜索输入框的键盘事件（按下回车执行搜索）
 * @param {KeyboardEvent} e - 事件对象
 */
function handleSearch(e) {
    if (e.key === 'Enter') doSearch();
}

/**
 * 将搜索词添加到历史列表，实现去重置顶和容量限制
 * @param {string} query - 搜索关键词
 */
function addToSearchHistory(query) {
    // 过滤掉已存在的相同项
    searchHistory = searchHistory.filter(item => item !== query);
    // 插入到列表开头
    searchHistory.unshift(query);
    // 截取固定条数以防溢出
    if (searchHistory.length > MAX_HISTORY_ITEMS) {
        searchHistory = searchHistory.slice(0, MAX_HISTORY_ITEMS);
    }
    AppState.persistSearchHistory();
    showSearchHistory();
}

/**
 * 获取经过当前搜索词排序匹配后的历史列表
 * @param {string} query - 搜索框当前实时输入的词
 * @return {Array} 包含匹配逻辑权重排序后的历史数组
 */
function getSortedSearchHistory(query) {
    const trimmedQuery = (query || '').trim().toLowerCase();
    const historyWithIndex = searchHistory.map((item, index) => ({ item, index }));

    // 如果搜索框为空，则按原始时间倒序排列
    if (!trimmedQuery) {
        return historyWithIndex;
    }

    const matched = [];
    const unmatched = [];

    // 分拣出完全匹配（含拼音辅助匹配）的项目
    historyWithIndex.forEach(entry => {
        if (isSearchHistoryMatch(entry.item, trimmedQuery)) {
            matched.push(entry);
        } else {
            unmatched.push(entry);
        }
    });

    // 将匹配项置前返回
    return matched.concat(unmatched);
}

/**
 * 判断历史记录条目是否符合当前的搜索关键词（支持多级降级：原词 -> 小写 -> 拼音）
 * @param {string} item - 历史记录条目文案
 * @param {string} normalizedQuery - 已处理好的规范化查询词
 * @return {boolean}
 */
function isSearchHistoryMatch(item, normalizedQuery) {
    const normalizedItem = item.toLowerCase();
    if (normalizedItem.includes(normalizedQuery)) {
        return true;
    }

    // 检查是否有 pinyin-pro 插件支持拼音模糊匹配
    const pinyinPro = window.pinyinPro;
    if (!pinyinPro || typeof pinyinPro.match !== 'function') {
        return false;
    }

    try {
        return !!pinyinPro.match(item, normalizedQuery, { continuous: true });
    } catch (error) {
        console.warn('Pinyin match failed:', error);
        return false;
    }
}

/**
 * 构建搜索历史浮层的页眉（标题 + 清空按钮）
 * @return {HTMLElement}
 */
function buildHistoryHeader() {
    const headerDiv = document.createElement('div');
    headerDiv.className = 'history-header';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'history-title';
    titleSpan.textContent = '搜索历史';

    const clearBtn = document.createElement('button');
    clearBtn.className = 'clear-history';
    clearBtn.textContent = '清空';
    clearBtn.onclick = () => clearSearchHistory();

    headerDiv.appendChild(titleSpan);
    headerDiv.appendChild(clearBtn);
    return headerDiv;
}

/**
 * 构建搜索历史列表 DOM 片段
 * @param {Array} sortedHistory - 排序后的历史数据
 * @return {HTMLElement}
 */
function buildHistoryList(sortedHistory) {
    const historyList = document.createElement('div');
    historyList.className = 'history-list';

    sortedHistory.forEach(({ item, index }) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.onclick = () => selectHistoryItem(item);

        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-history';

        const text = document.createElement('span');
        text.textContent = item;

        const removeBtn = document.createElement('span');
        removeBtn.className = 'history-remove';
        removeBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeHistoryItem(index);
        };

        historyItem.appendChild(icon);
        historyItem.appendChild(text);
        historyItem.appendChild(removeBtn);
        historyList.appendChild(historyItem);
    });

    return historyList;
}

/**
 * 确保相关的全局监听器已绑定
 */
function ensureHistoryListenersBound() {
    if (!isSearchHistoryListenerBound) {
        isSearchHistoryListenerBound = true;
        setTimeout(() => {
            document.addEventListener('click', closeSearchHistory);
        }, 0);
    }

    if (!isSearchHistoryPositionListenerBound) {
        isSearchHistoryPositionListenerBound = true;
        window.addEventListener('resize', updateSearchHistoryPosition);
        window.addEventListener('scroll', updateSearchHistoryPosition, true);
    }
}

/**
 * 构造并展示搜索历史浮层（主编排逻辑）
 */
function showSearchHistory() {
    const historyContainer = ensureSearchHistoryMounted();
    const searchInput = document.getElementById('searchInput');
    if (!historyContainer) return;

    if (searchHistory.length === 0) {
        historyContainer.style.display = 'none';
        return;
    }

    const query = searchInput ? searchInput.value : '';
    const sortedHistory = getSortedSearchHistory(query).slice(0, MAX_HISTORY_DISPLAY);

    historyContainer.style.display = 'block';
    // 使用 replaceChildren 批量替换子节点，避免 innerHTML 清空导致的强制 reflow
    historyContainer.replaceChildren(
        buildHistoryHeader(),
        buildHistoryList(sortedHistory)
    );

    updateSearchHistoryPosition();
    ensureHistoryListenersBound();
}

/**
 * 清空用户所有的搜索历史（需二次确认）
 */
function clearSearchHistory() {
    if (!confirm('确定要清空所有搜索历史吗？')) return;

    searchHistory = [];
    AppState.persistSearchHistory();
    showSearchHistory();
}

/**
 * 点击浮层外部时自动隐藏浮层
 * @param {MouseEvent} e - 事件对象
 */
function closeSearchHistory(e) {
    const historyContainer = ensureSearchHistoryMounted();
    const searchInput = document.getElementById('searchInput');

    // 如果点击的不是输入框且不在浮层内部，则关闭
    if (historyContainer && !historyContainer.contains(e.target) && e.target !== searchInput) {
        historyContainer.style.display = 'none';
        document.removeEventListener('click', closeSearchHistory);
        isSearchHistoryListenerBound = false;
    }
}

/**
 * 选中一条历史记录，填入输入框并执行搜索
 * @param {string} item - 历史词
 */
function selectHistoryItem(item) {
    document.getElementById('searchInput').value = item;
    const historyContainer = ensureSearchHistoryMounted();
    if (historyContainer) {
        historyContainer.style.display = 'none';
        document.removeEventListener('click', closeSearchHistory);
        isSearchHistoryListenerBound = false;
    }
    doSearch();
}

/**
 * 移除指定的单条历史记录项
 * @param {number} index - 记录项在数组中的索引
 */
function removeHistoryItem(index) {
    searchHistory.splice(index, 1);
    AppState.persistSearchHistory();
    showSearchHistory();
    if (searchHistory.length === 0) {
        document.removeEventListener('click', closeSearchHistory);
        isSearchHistoryListenerBound = false;
    }
}

// 导出全局初始化接口
window.initSearchEngine = initSearchEngine;
