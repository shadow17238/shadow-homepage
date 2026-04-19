function isLinkEnabled(url) {
    return Boolean(url && url.trim() && url !== '#');
}

function renderLinks() {
    const container = document.getElementById('linkContainer');
    container.innerHTML = '';

    if (!appData || appData.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        emptyDiv.textContent = '暂无链接数据，点击右上角齿轮图标进入编辑模式添加。';
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
            a.className = enabled ? 'link-card' : 'link-card link-card-disabled';
            a.title = enabled ? link.url : '链接未设置';
            a.href = enabled ? link.url : '#';
            a.setAttribute('aria-disabled', enabled ? 'false' : 'true');
            if (enabled) {
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
                    incrementClickCount(link);
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

function editTitle() {
    if (!isEditMode) return;

    editType = 'title';
    document.getElementById('modalTitle').innerText = '修改首页寄语';
    document.getElementById('labelName').innerText = '寄语内容';
    document.getElementById('editName').value = document.getElementById('artText').innerText;
    document.getElementById('groupUrl').style.display = 'none';
    document.getElementById('editModal').style.display = 'flex';
}

function editSubtitle() {
    if (!isEditMode) return;

    editType = 'subtitle';
    document.getElementById('modalTitle').innerText = '修改律动寄语';
    document.getElementById('labelName').innerText = '内容（支持 HTML 标签，如 br）';
    document.getElementById('editName').value = document.getElementById('audioText').innerHTML;
    document.getElementById('groupUrl').style.display = 'none';
    document.getElementById('editModal').style.display = 'flex';
}

function openEditModal(catIndex, linkIndex) {
    editType = 'link';
    currentEditIndices = { catIndex, linkIndex };
    const item = appData[catIndex].links[linkIndex];

    document.getElementById('modalTitle').innerText = '自定义链接';
    document.getElementById('labelName').innerText = '显示名称';
    document.getElementById('editName').value = item.name;
    document.getElementById('editUrl').value = item.url;
    document.getElementById('groupUrl').style.display = 'block';
    document.getElementById('editModal').style.display = 'flex';
}

function saveData() {
    const newName = document.getElementById('editName').value;
    const newUrl = document.getElementById('editUrl').value;

    if (!newName) {
        alert('名称不能为空');
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
    const weekArr = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekStr = weekArr[now.getDay()];

    document.getElementById('clockTime').innerText = timeStr;
    document.getElementById('clockDate').innerText = `${dateStr} ${weekStr}`;
}

function initClockDrag() {
    const clockBox = document.getElementById('clock-box');
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    clockBox.addEventListener('mousedown', function(e) {
        if (!isEditMode) return;

        isDragging = true;
        dragOffsetX = e.clientX - clockBox.offsetLeft;
        dragOffsetY = e.clientY - clockBox.offsetTop;
    });

    window.addEventListener('mousemove', function(e) {
        if (!isDragging) return;

        e.preventDefault();
        const newLeft = e.clientX - dragOffsetX;
        const newTop = e.clientY - dragOffsetY;
        clockBox.style.left = newLeft + 'px';
        clockBox.style.top = newTop + 'px';
    });

    window.addEventListener('mouseup', function() {
        if (!isDragging) return;

        isDragging = false;
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

