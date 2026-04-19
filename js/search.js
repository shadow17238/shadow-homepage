let isSearchHistoryListenerBound = false;

function doSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;

    addToSearchHistory(query);
    window.open(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, '_blank');
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
    const historyContainer = document.getElementById('searchHistoryContainer');
    const searchInput = document.getElementById('searchInput');
    if (!historyContainer) return;

    if (searchHistory.length === 0) {
        historyContainer.style.display = 'none';
        return;
    }

    const sortedHistory = getSortedSearchHistory(searchInput ? searchInput.value : '');
    historyContainer.style.display = 'block';

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

    if (!isSearchHistoryListenerBound) {
        isSearchHistoryListenerBound = true;
        setTimeout(() => {
            document.addEventListener('click', closeSearchHistory);
        }, 100);
    }
}

function clearSearchHistory() {
    if (!confirm('确定要清空所有搜索历史吗？')) return;

    searchHistory = [];
    AppState.persistSearchHistory();
    showSearchHistory();
}

function closeSearchHistory(e) {
    const historyContainer = document.getElementById('searchHistoryContainer');
    const searchInput = document.getElementById('searchInput');

    if (historyContainer && !historyContainer.contains(e.target) && e.target !== searchInput) {
        historyContainer.style.display = 'none';
        document.removeEventListener('click', closeSearchHistory);
        isSearchHistoryListenerBound = false;
    }
}

function selectHistoryItem(item) {
    document.getElementById('searchInput').value = item;
    const historyContainer = document.getElementById('searchHistoryContainer');
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

