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
            <i class="fa-solid fa-copy"></i> 澶嶅埗閾炬帴
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" id="ctxEditItem">
            <i class="fa-solid fa-pen-to-square"></i> 缂栬緫姝ら」
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
        emptyDiv.textContent = '鏆傛棤閾炬帴鏁版嵁锛岀偣鍑诲彸涓婅榻胯疆鍥炬爣杩涘叆缂栬緫妯″紡娣诲姞銆?;
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
            a.textContent = link.name || (isEditMode ? '鏈缃? : '');

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
    document.getElementById('modalTitle').innerText = '淇敼棣栭〉瀵勮';
    setEditModalSubtitle('鏇存柊椤堕儴瀵勮鏂囨锛岃棣栭〉姘旇川鏇磋创杩戜綘鐨勬劅瑙夈€?);
    document.getElementById('labelName').innerText = '瀵勮鍐呭';
    document.getElementById('editName').value = document.getElementById('artText').innerText;
    document.getElementById('groupUrl').style.display = 'none';
    document.getElementById('editModal').style.display = 'flex';
}

function openEditModal(catIndex, linkIndex) {
    editType = 'link';
    currentEditIndices = { catIndex, linkIndex };
    const item = appData[catIndex].links[linkIndex];

    document.getElementById('modalTitle').innerText = '鑷畾涔夐摼鎺?;
    setEditModalSubtitle('淇敼鍗＄墖鍚嶇О涓庤烦杞洰鏍囷紝缃戝潃涓庡簲鐢ㄥ崗璁兘鍙互浣跨敤銆?);
    document.getElementById('labelName').innerText = '鏄剧ず鍚嶇О';
    document.getElementById('editName').value = item.name;
    document.getElementById('editUrl').value = item.url;
    document.querySelector('#groupUrl label').innerText = '缃戝潃 URL / 搴旂敤鍗忚';
    document.getElementById('groupUrl').style.display = 'block';
    document.getElementById('editModal').style.display = 'flex';
}

function saveData() {
    const newName = document.getElementById('editName').value;
    const newUrl = document.getElementById('editUrl').value;

    if (!newName) {
        alert('鍚嶇О涓嶈兘涓虹┖');
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
    const weekArr = ['鍛ㄦ棩', '鍛ㄤ竴', '鍛ㄤ簩', '鍛ㄤ笁', '鍛ㄥ洓', '鍛ㄤ簲', '鍛ㄥ叚'];
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
