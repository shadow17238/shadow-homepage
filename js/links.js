// 閾炬帴鍗＄墖閫昏緫
let currentRightClickedLink = null;

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

// 鍙抽敭鑿滃崟閫昏緫
function initContextMenu() {
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.id = 'customContextMenu';
    menu.innerHTML = `
        <div class="context-menu-item" id="ctxCopyLink">
            <i class="fa-solid fa-copy"></i> \u590d\u5236\u94fe\u63a5
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" id="ctxEditItem">
            <i class="fa-solid fa-pen-to-square"></i> \u7f16\u8f91\u6b64\u9879
        </div>
    `;
    document.body.appendChild(menu);

    // 缁戝畾鍏ㄥ眬鐐瑰嚮鍏抽棴鑿滃崟
    document.addEventListener('click', () => {
        menu.style.display = 'none';
    });

    // 闃绘鑿滃崟鍐呯殑鐐瑰嚮绌块€?
    menu.onclick = (e) => e.stopPropagation();

    document.getElementById('ctxCopyLink').onclick = () => {
        if (currentRightClickedLink) {
            navigator.clipboard.writeText(currentRightClickedLink.url).then(() => {
                console.log('[Context Menu] Link copied');
            });
            menu.style.display = 'none';
        }
    };

    document.getElementById('ctxEditItem').onclick = () => {
        if (currentRightClickedLink) {
            const { catIndex, linkIndex } = currentRightClickedLink;
            openEditModal(catIndex, linkIndex);
            menu.style.display = 'none';
        }
    };
}

function handleLinkContextMenu(e, catIndex, linkIndex) {
    const enabled = isLinkEnabled(appData[catIndex].links[linkIndex].url);
    if (!enabled && !isEditMode) return;

    e.preventDefault();
    const menu = document.getElementById('customContextMenu');
    const link = appData[catIndex].links[linkIndex];

    currentRightClickedLink = { ...link, catIndex, linkIndex };

    menu.style.display = 'flex';

    // 闃叉鑿滃崟瓒呭嚭杈圭晫
    let x = e.clientX;
    let y = e.clientY;
    const menuWidth = 160;
    const menuHeight = 150;

    if (x + menuWidth > window.innerWidth) x -= menuWidth;
    if (y + menuHeight > window.innerHeight) y -= menuHeight;

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
}

function renderLinks() {
    const container = document.getElementById('linkContainer');
    if (!container) return;
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
        // 鍔犲叆鍏ュ満鍔ㄧ敾寤惰繜
        groupDiv.className = 'category-group animate-in-bottom';
        groupDiv.style.setProperty('--delay', `${0.3 + catIndex * 0.05}s`);

        const title = document.createElement('div');
        title.className = 'category-title';
        title.innerText = cat.category.toUpperCase();
        groupDiv.appendChild(title);

        const linksWrapper = document.createElement('div');
        linksWrapper.className = 'links-wrapper';

        cat.links.forEach((link, linkIndex) => {
            const a = document.createElement('div'); // 鏀逛负 div 浠ヤ究缁熶竴澶勭悊鐐瑰嚮
            const enabled = isLinkEnabled(link.url);

            a.className = enabled ? 'link-card' : 'link-card link-card-disabled';
            a.textContent = link.name || (isEditMode ? '\u672a\u8bbe\u7f6e' : '');

            // 缁戝畾宸﹂敭鐐瑰嚮
            a.onclick = (e) => {
                if (isEditMode) {
                    openEditModal(catIndex, linkIndex);
                } else if (enabled) {
                    incrementClickCount(link);
                    openLinkTarget(link.url);
                }
            };

            // 缁戝畾鍙抽敭鐐瑰嚮
            a.oncontextmenu = (e) => handleLinkContextMenu(e, catIndex, linkIndex);

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
    if (!clockBox) return;

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
    if (savedPos && savedPos.left && savedPos.top) {
        clockBox.style.left = savedPos.left;
        clockBox.style.top = savedPos.top;
    } else {
        clockBox.style.left = defaultClockPosition.left;
        clockBox.style.top = defaultClockPosition.top;
    }
}

// 鍒濆鍖?
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContextMenu);
} else {
    initContextMenu();
}
