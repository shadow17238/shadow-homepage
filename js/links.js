function isLinkEnabled(url) {
    return Boolean(url && url.trim() && url !== '#');
}

function isCustomProtocolLink(url) {
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(url || '') && !/^https?:\/\//i.test(url || '');
}

function openLinkTarget(url) {
    if (isCustomProtocolLink(url)) {
        window.location.href = url;
        return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
}

function renderLinks() {
    const container = document.getElementById('linkContainer');
    container.innerHTML = '';

    if (!appData || appData.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        emptyDiv.textContent = '\u6682\u65e0\u94fe\u63a5\u6570\u636e\uff0c\u70b9\u51fb\u53f3\u4e0a\u89d2\u9f7f\u8f6e\u56fe\u6807\u8fdb\u5165\u7f16\u8f91\u6a21\u5f0f\u6dfb\u52a0\u3002';
        container.appendChild(emptyDiv);
        return;
    }

    appData.forEach((cat, catIndex) => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'category-group';

        const title = document.createElement('div');
        title.className = 'category-title';
        title.innerText = cat.category;
        groupDiv.appendChild(title);

        const linksWrapper = document.createElement('div');
        linksWrapper.className = 'links-wrapper';

        cat.links.forEach((link, linkIndex) => {
            const a = document.createElement('a');
            const enabled = isLinkEnabled(link.url);
            const isCustomProtocol = enabled && isCustomProtocolLink(link.url);
            a.className = enabled ? 'link-card' : 'link-card link-card-disabled';
            a.title = enabled ? link.url : '\u94fe\u63a5\u672a\u8bbe\u7f6e';
            a.href = enabled ? link.url : '#';
            a.setAttribute('aria-disabled', enabled ? 'false' : 'true');

            if (enabled && !isCustomProtocol) {
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
            }

            a.addEventListener('click', function (e) {
                if (isEditMode) {
                    e.preventDefault();
                    openEditModal(catIndex, linkIndex);
                } else if (!enabled) {
                    e.preventDefault();
                } else {
                    e.preventDefault();
                    incrementClickCount(link);
                    openLinkTarget(link.url);
                }
            });

            a.innerText = link.name;
            linksWrapper.appendChild(a);
        });

        groupDiv.appendChild(linksWrapper);
        container.appendChild(groupDiv);
    });
}

function incrementClickCount(link) {
    clickCount++;
    AppState.persistClickCount();
    trackLinkClick(link);
    updateStatsDisplay();
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

function setEditModalSubtitle(text) {
    const subtitle = document.getElementById('editModalSubtitle');
    if (subtitle) {
        subtitle.innerText = text;
    }
}

function editTitle() {
    if (!isEditMode) return;

    editType = 'title';
    document.getElementById('modalTitle').innerText = '\u4fee\u6539\u9996\u9875\u5bc4\u8bed';
    setEditModalSubtitle('\u66f4\u65b0\u9876\u90e8\u5bc4\u8bed\u6587\u6848\uff0c\u8ba9\u9996\u9875\u6c14\u8d28\u66f4\u8d34\u8fd1\u4f60\u7684\u611f\u89c9\u3002');
    document.getElementById('labelName').innerText = '\u5bc4\u8bed\u5185\u5bb9';
    document.getElementById('editName').value = document.getElementById('artText').innerText;
    document.getElementById('groupUrl').style.display = 'none';
    document.getElementById('editModal').style.display = 'flex';
}

function editSubtitle() {
    if (!isEditMode) return;

    editType = 'subtitle';
    document.getElementById('modalTitle').innerText = '\u4fee\u6539\u5f8b\u52a8\u5bc4\u8bed';
    setEditModalSubtitle('\u8c03\u6574\u97f3\u5f8b\u533a\u57df\u7684\u5c55\u793a\u6587\u6848\uff0c\u652f\u6301\u7b80\u5355 HTML \u6362\u884c\u3002');
    document.getElementById('labelName').innerText = '\u5185\u5bb9\uff08\u652f\u6301 HTML \u6807\u7b7e\uff0c\u5982 br\uff09';
    document.getElementById('editName').value = document.getElementById('audioText').innerHTML;
    document.getElementById('groupUrl').style.display = 'none';
    document.getElementById('editModal').style.display = 'flex';
}

function openEditModal(catIndex, linkIndex) {
    editType = 'link';
    currentEditIndices = { catIndex, linkIndex };
    const item = appData[catIndex].links[linkIndex];

    document.getElementById('modalTitle').innerText = '\u81ea\u5b9a\u4e49\u94fe\u63a5';
    setEditModalSubtitle('\u4fee\u6539\u5361\u7247\u540d\u79f0\u4e0e\u8df3\u8f6c\u76ee\u6807\uff0c\u7f51\u5740\u4e0e\u5e94\u7528\u534f\u8bae\u90fd\u53ef\u4ee5\u4f7f\u7528\u3002');
    document.getElementById('labelName').innerText = '\u663e\u793a\u540d\u79f0';
    document.getElementById('editName').value = item.name;
    document.getElementById('editUrl').value = item.url;
    document.querySelector('#groupUrl label').innerText = '\u7f51\u5740 URL / \u5e94\u7528\u534f\u8bae';
    document.getElementById('groupUrl').style.display = 'block';
    document.getElementById('editModal').style.display = 'flex';
}

function saveData() {
    const newName = document.getElementById('editName').value;
    const newUrl = document.getElementById('editUrl').value;

    if (!newName) {
        alert('\u540d\u79f0\u4e0d\u80fd\u4e3a\u7a7a');
        return;
    }

    if (editType === 'title') {
        document.getElementById('artText').innerText = newName;
        AppStorage.setCustomArtText(newName);
    } else if (editType === 'subtitle') {
        document.getElementById('audioText').innerHTML = sanitizeHTML(newName);
        AppStorage.setCustomAudioText(newName);
    } else {
        const { catIndex, linkIndex } = currentEditIndices;
        appData[catIndex].links[linkIndex].name = newName;
        appData[catIndex].links[linkIndex].url = newUrl;
        AppState.persistAppData();
        renderLinks();
    }

    closeModal();
}

function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
    const dateStr = now.toLocaleDateString('zh-CN');
    const weekArr = [
        '\u5468\u65e5',
        '\u5468\u4e00',
        '\u5468\u4e8c',
        '\u5468\u4e09',
        '\u5468\u56db',
        '\u5468\u4e94',
        '\u5468\u516d'
    ];
    const weekStr = weekArr[now.getDay()];

    document.getElementById('clockTime').innerText = timeStr;
    document.getElementById('clockDate').innerText = `${dateStr} ${weekStr}`;
}

function initClockDrag() {
    const clockBox = document.getElementById('clock-box');
    let isDragging = false;
    let hasMovedDuringDrag = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    clockBox.addEventListener('mousedown', function(e) {
        if (!isEditMode) return;

        isDragging = true;
        hasMovedDuringDrag = false;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragOffsetX = e.clientX - clockBox.offsetLeft;
        dragOffsetY = e.clientY - clockBox.offsetTop;
    });

    window.addEventListener('mousemove', function(e) {
        if (!isDragging) return;

        e.preventDefault();
        if (Math.abs(e.clientX - dragStartX) > 3 || Math.abs(e.clientY - dragStartY) > 3) {
            hasMovedDuringDrag = true;
        }
        const newLeft = e.clientX - dragOffsetX;
        const newTop = e.clientY - dragOffsetY;
        clockBox.style.left = newLeft + 'px';
        clockBox.style.top = newTop + 'px';
    });

    window.addEventListener('mouseup', function() {
        if (!isDragging) return;

        isDragging = false;
        clockBox.dataset.suppressClick = hasMovedDuringDrag ? 'true' : 'false';
        const pos = {
            left: clockBox.style.left,
            top: clockBox.style.top
        };
        AppStorage.setClockPosition(pos);
    });

    const savedPos = AppStorage.getClockPosition();
    if (savedPos) {
        const pos = savedPos;
        if (pos && pos.left && pos.top) {
            clockBox.style.left = pos.left;
            clockBox.style.top = pos.top;
        } else {
            clockBox.style.left = defaultClockPosition.left;
            clockBox.style.top = defaultClockPosition.top;
        }
    } else {
        clockBox.style.left = defaultClockPosition.left;
        clockBox.style.top = defaultClockPosition.top;
    }
}
