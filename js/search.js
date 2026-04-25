const MAX_HISTORY_ITEMS = 100;
let isSearchHistoryListenerBound = false;
let isSearchHistoryPositionListenerBound = false;
let isSearchHistoryMountedToBody = false;

// 搜索引擎配置
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

let currentEngineIndex = 0;

// 初始化搜索引擎
function initSearchEngine() {
    const savedEngineId = localStorage.getItem('shadow_current_search_engine') || 'bing';
    currentEngineIndex = searchEngines.findIndex(e => e.id === savedEngineId);
    if (currentEngineIndex === -1) currentEngineIndex = 0;
    
    updateSearchEngineUI();

    const selector = document.getElementById('searchEngineSelector');
    if (selector) {
        selector.onclick = function(e) {
            e.stopPropagation();
            switchSearchEngine();
        };
    }
}

function switchSearchEngine() {
    currentEngineIndex = (currentEngineIndex + 1) % searchEngines.length;
    const engine = searchEngines[currentEngineIndex];
    localStorage.setItem('shadow_current_search_engine', engine.id);
    updateSearchEngineUI();
}

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

function ensureSearchHistoryMounted() {
    const historyContainer = document.getElementById('searchHistoryContainer');
    if (!historyContainer || isSearchHistoryMountedToBody) {
        return historyContainer;
    }

    document.body.appendChild(historyContainer);
    historyContainer.addEventListener('click', (event) => {
        event.stopPropagation();
    });
    isSearchHistoryMountedToBody = true;
    return historyContainer;
}

function updateSearchHistoryPosition() {
    const historyContainer = ensureSearchHistoryMounted();
    const searchBox = document.querySelector('.search-box');
    if (!historyContainer || !searchBox || historyContainer.style.display === 'none') {
        return;
    }

    const rect = searchBox.getBoundingClientRect();
    const viewportPadding = 12;
    const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
        Math.max(rect.left, viewportPadding),
        window.innerWidth - width - viewportPadding
    );

    historyContainer.style.top = `${rect.bottom + 12}px`;
    historyContainer.style.left = `${left}px`;
    historyContainer.style.width = `${width}px`;
}

function doSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;

    addToSearchHistory(query);
    const engine = searchEngines[currentEngineIndex];
    window.open(`${engine.url}${encodeURIComponent(query)}`, '_blank');
}

function handleSearch(e) {
    if (e.key === 'Enter') doSearch();
}

function addToSearchHistory(query) {
    searchHistory = searchHistory.filter(item => item !== query);
    searchHistory.unshift(query);
    if (searchHistory.length > MAX_HISTORY_ITEMS) {
        searchHistory = searchHistory.slice(0, MAX_HISTORY_ITEMS);
    }
    AppState.persistSearchHistory();
    showSearchHistory();
}

function getSortedSearchHistory(query) {
    const trimmedQuery = (query || '').trim().toLowerCase();
    const historyWithIndex = searchHistory.map((item, index) => ({ item, index }));

    if (!trimmedQuery) {
        return historyWithIndex;
    }

    const matched = [];
    const unmatched = [];

    historyWithIndex.forEach(entry => {
        if (isSearchHistoryMatch(entry.item, trimmedQuery)) {
            matched.push(entry);
        } else {
            unmatched.push(entry);
        }
    });

    return matched.concat(unmatched);
}

function isSearchHistoryMatch(item, normalizedQuery) {
    const normalizedItem = item.toLowerCase();
    if (normalizedItem.includes(normalizedQuery)) {
        return true;
    }

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

function showSearchHistory() {
    const historyContainer = ensureSearchHistoryMounted();
    const searchInput = document.getElementById('searchInput');
    if (!historyContainer) return;

    if (searchHistory.length === 0) {
        historyContainer.style.display = 'none';
        return;
    }

    const sortedHistory = getSortedSearchHistory(searchInput ? searchInput.value : '');
    historyContainer.style.display = 'block';
    updateSearchHistoryPosition();

    const historyList = document.createElement('div');
    historyList.className = 'history-list';

    sortedHistory.forEach(({ item, index }) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.addEventListener('click', () => selectHistoryItem(item));

        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-history';

        const text = document.createElement('span');
        text.textContent = item;

        const removeBtn = document.createElement('span');
        removeBtn.className = 'history-remove';
        const removeIcon = document.createElement('i');
        removeIcon.className = 'fa-solid fa-times';
        removeBtn.appendChild(removeIcon);
        removeBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            removeHistoryItem(index);
        });

        historyItem.appendChild(icon);
        historyItem.appendChild(text);
        historyItem.appendChild(removeBtn);
        historyList.appendChild(historyItem);
    });

    historyContainer.innerHTML = '';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'history-header';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'history-title';
    titleSpan.textContent = '搜索历史';

    const clearBtn = document.createElement('button');
    clearBtn.className = 'clear-history';
    clearBtn.textContent = '清空';
    clearBtn.addEventListener('click', function () { clearSearchHistory(); });

    headerDiv.appendChild(titleSpan);
    headerDiv.appendChild(clearBtn);
    historyContainer.appendChild(headerDiv);
    historyContainer.appendChild(historyList);

    updateSearchHistoryPosition();

    if (!isSearchHistoryListenerBound) {
        isSearchHistoryListenerBound = true;
        setTimeout(() => {
            document.addEventListener('click', closeSearchHistory);
        }, 100);
    }

    if (!isSearchHistoryPositionListenerBound) {
        isSearchHistoryPositionListenerBound = true;
        window.addEventListener('resize', updateSearchHistoryPosition);
        window.addEventListener('scroll', updateSearchHistoryPosition, true);
    }
}

function clearSearchHistory() {
    if (!confirm('确定要清空所有搜索历史吗？')) return;

    searchHistory = [];
    AppState.persistSearchHistory();
    showSearchHistory();
}

function closeSearchHistory(e) {
    const historyContainer = ensureSearchHistoryMounted();
    const searchInput = document.getElementById('searchInput');

    if (historyContainer && !historyContainer.contains(e.target) && e.target !== searchInput) {
        historyContainer.style.display = 'none';
        document.removeEventListener('click', closeSearchHistory);
        isSearchHistoryListenerBound = false;
    }
}

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

function removeHistoryItem(index) {
    searchHistory.splice(index, 1);
    AppState.persistSearchHistory();
    showSearchHistory();
    if (searchHistory.length === 0) {
        document.removeEventListener('click', closeSearchHistory);
        isSearchHistoryListenerBound = false;
    }
}

// 导出初始化函数供主逻辑调用
window.initSearchEngine = initSearchEngine;
