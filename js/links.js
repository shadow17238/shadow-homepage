/**
 * 链接卡片相关逻辑
 */
let currentRightClickedLink = null; // 当前右键点击的链接项信息

/**
 * 判断链接是否有效（非空且不是占位符）
 * @param {string} url - 待检查的 URL
 * @return {boolean}
 */
function isLinkEnabled(url) {
    return Boolean(url && url.trim() && url !== '#');
}

/**
 * 判断是否为自定义协议链接（如 tencent://, alipay:// 等）
 * @param {string} url - 待检查的 URL
 * @return {boolean}
 */
function isCustomProtocolLink(url) {
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(url || '') && !/^https?:\/\//i.test(url || '');
}

/**
 * 在新窗口或当前页面打开目标链接
 * @param {string} url - 目标 URL
 */
function openLinkTarget(url) {
    if (isCustomProtocolLink(url)) {
        // 自定义协议通常在当前窗口跳转以触发唤起应用
        window.location.href = url;
        return;
    }

    // 普通 HTTP(S) 链接在新窗口打开
    window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * 初始化右键自定义菜单
 */
function initContextMenu() {
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.id = 'customContextMenu';
    menu.innerHTML = `
        <div class="context-menu-item" id="ctxCopyLink">
            <i class="fa-solid fa-copy"></i> 复制链接
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" id="ctxEditItem">
            <i class="fa-solid fa-pen-to-square"></i> 编辑此项
        </div>
    `;
    document.body.appendChild(menu);

    // 全局点击关闭菜单
    document.addEventListener('click', () => {
        menu.style.display = 'none';
    });

    // 阻止菜单内部点击冒泡
    menu.onclick = (e) => e.stopPropagation();

    // 复制链接功能
    document.getElementById('ctxCopyLink').onclick = () => {
        if (currentRightClickedLink) {
            navigator.clipboard.writeText(currentRightClickedLink.url).then(() => {
                console.log('[Context Menu] Link copied');
            });
            menu.style.display = 'none';
        }
    };

    // 编辑此项功能
    document.getElementById('ctxEditItem').onclick = () => {
        if (currentRightClickedLink) {
            const { catIndex, linkIndex } = currentRightClickedLink;
            openEditModal(catIndex, linkIndex);
            menu.style.display = 'none';
        }
    };
}

/**
 * 处理链接卡片的右键点击事件
 * @param {MouseEvent} e - 事件对象
 * @param {number} catIndex - 分类索引
 * @param {number} linkIndex - 链接索引
 */
function handleLinkContextMenu(e, catIndex, linkIndex) {
    const enabled = isLinkEnabled(appData[catIndex].links[linkIndex].url);
    // 非编辑模式下，禁用的链接不响应右键
    if (!enabled && !isEditMode) return;

    e.preventDefault();
    const menu = document.getElementById('customContextMenu');
    const link = appData[catIndex].links[linkIndex];

    // 记录当前点击的项信息
    currentRightClickedLink = { ...link, catIndex, linkIndex };

    menu.style.display = 'flex';

    // 计算菜单位置，防止超出屏幕边界
    let x = e.clientX;
    let y = e.clientY;
    const menuWidth = 160;
    const menuHeight = 150;

    if (x + menuWidth > window.innerWidth) x -= menuWidth;
    if (y + menuHeight > window.innerHeight) y -= menuHeight;

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
}

/**
 * 渲染所有链接分类及其包含的链接卡片
 */
function renderLinks() {
    const container = document.getElementById('linkContainer');
    if (!container) return;
    container.innerHTML = '';

    // 如果没有数据，显示空状态提示
    if (!appData || appData.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        emptyDiv.textContent = '暂无链接数据，点击右上角齿轮图标进入编辑模式添加。';
        container.appendChild(emptyDiv);
        return;
    }

    // 遍历分类并创建对应的 DOM 结构
    appData.forEach((cat, catIndex) => {
        const groupDiv = document.createElement('div');
        // 加入入场动画及延迟效果
        groupDiv.className = 'category-group animate-in-bottom';
        groupDiv.style.setProperty('--delay', `${0.3 + catIndex * 0.05}s`);

        const title = document.createElement('div');
        title.className = 'category-title';
        title.innerText = cat.category.toUpperCase();
        groupDiv.appendChild(title);

        const linksWrapper = document.createElement('div');
        linksWrapper.className = 'links-wrapper';

        // 遍历该分类下的所有链接
        cat.links.forEach((link, linkIndex) => {
            const a = document.createElement('div'); // 使用 div 代替 a 标签以统一处理逻辑
            const enabled = isLinkEnabled(link.url);

            a.className = enabled ? 'link-card' : 'link-card link-card-disabled';
            a.textContent = link.name || (isEditMode ? '未设置' : '');

            // 绑定左键点击逻辑
            a.onclick = (e) => {
                if (isEditMode) {
                    // 编辑模式下点击打开编辑对话框
                    openEditModal(catIndex, linkIndex);
                } else if (enabled) {
                    // 正常模式下记录点击次数并跳转
                    incrementClickCount(link);
                    openLinkTarget(link.url);
                }
            };

            // 绑定右键点击逻辑
            a.oncontextmenu = (e) => handleLinkContextMenu(e, catIndex, linkIndex);

            linksWrapper.appendChild(a);
        });

        groupDiv.appendChild(linksWrapper);
        container.appendChild(groupDiv);
    });
}

/**
 * 增加点击次数统计并更新相关状态
 * @param {Object} link - 链接对象
 */
function incrementClickCount(link) {
    clickCount++;
    AppState.persistClickCount(); // 持久化总点击数
    trackLinkClick(link); // 追踪该特定链接的点击
    updateStatsDisplay(); // 更新 UI 上的统计展示
}

/**
 * 关闭编辑模态框
 */
function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

/**
 * 设置编辑模态框的副标题文本
 * @param {string} text - 副标题内容
 */
function setEditModalSubtitle(text) {
    const subtitle = document.getElementById('editModalSubtitle');
    if (subtitle) {
        subtitle.innerText = text;
    }
}

/**
 * 打开修改首页寄语（艺术字标题）的编辑框
 */
function editTitle() {
    if (!isEditMode) return;

    editType = 'title';
    document.getElementById('modalTitle').innerText = '修改首页寄语';
    setEditModalSubtitle('更新顶部寄语文案，让首页气质更贴近你的感觉。');
    document.getElementById('labelName').innerText = '寄语内容';
    document.getElementById('editName').value = document.getElementById('artText').innerText;
    document.getElementById('groupUrl').style.display = 'none';
    document.getElementById('editModal').style.display = 'flex';
}

/**
 * 打开修改具体链接项信息的编辑框
 * @param {number} catIndex - 分类索引
 * @param {number} linkIndex - 链接索引
 */
function openEditModal(catIndex, linkIndex) {
    editType = 'link';
    currentEditIndices = { catIndex, linkIndex };
    const item = appData[catIndex].links[linkIndex];

    document.getElementById('modalTitle').innerText = '自定义链接';
    setEditModalSubtitle('修改卡片名称与跳转目标，网址与应用协议都可以使用。');
    document.getElementById('labelName').innerText = '显示名称';
    document.getElementById('editName').value = item.name;
    document.getElementById('editUrl').value = item.url;
    document.querySelector('#groupUrl label').innerText = '网址 URL / 应用协议';
    document.getElementById('groupUrl').style.display = 'block';
    document.getElementById('editModal').style.display = 'flex';
}

/**
 * 保存编辑后的数据并持久化
 */
function saveData() {
    const newName = document.getElementById('editName').value;
    const newUrl = document.getElementById('editUrl').value;

    if (!newName) {
        alert('名称不能为空');
        return;
    }

    if (editType === 'title') {
        // 更新并保存首页寄语
        document.getElementById('artText').innerText = newName;
        AppStorage.setCustomArtText(newName);
    } else {
        // 更新并保存具体链接信息
        const { catIndex, linkIndex } = currentEditIndices;
        appData[catIndex].links[linkIndex].name = newName;
        appData[catIndex].links[linkIndex].url = newUrl;
        AppState.persistAppData();
        renderLinks(); // 重新渲染列表以反映更改
    }

    closeModal();
}

/**
 * 更新时钟显示（当前时间和日期）
 */
function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
    const dateStr = now.toLocaleDateString('zh-CN');
    const weekArr = [ '周日', '周一', '周二', '周三', '周四', '周五', '周六' ];
    const weekStr = weekArr[now.getDay()];

    document.getElementById('clockTime').innerText = timeStr;
    document.getElementById('clockDate').innerText = `${dateStr} ${weekStr}`;
}

/**
 * 初始化时钟面板的拖拽功能
 */
function initClockDrag() {
    const clockBox = document.getElementById('clock-box');
    if (!clockBox) return;

    let isDragging = false;
    let hasMovedDuringDrag = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    // 鼠标按下开始拖拽逻辑
    clockBox.addEventListener('mousedown', function(e) {
        if (!isEditMode) return; // 仅在编辑模式下允许拖拽

        isDragging = true;
        hasMovedDuringDrag = false;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragOffsetX = e.clientX - clockBox.offsetLeft;
        dragOffsetY = e.clientY - clockBox.offsetTop;
    });

    // 鼠标移动实时更新位置
    window.addEventListener('mousemove', function(e) {
        if (!isDragging) return;

        e.preventDefault();
        // 如果移动距离超过 3px，则判定为有效拖拽
        if (Math.abs(e.clientX - dragStartX) > 3 || Math.abs(e.clientY - dragStartY) > 3) {
            hasMovedDuringDrag = true;
        }
        const newLeft = e.clientX - dragOffsetX;
        const newTop = e.clientY - dragOffsetY;
        clockBox.style.left = newLeft + 'px';
        clockBox.style.top = newTop + 'px';
    });

    // 鼠标松开结束拖拽，并持久化位置数据
    window.addEventListener('mouseup', function() {
        if (!isDragging) return;

        isDragging = false;
        // 如果产生了明显位移，标记禁止后续触发的点击行为
        clockBox.dataset.suppressClick = hasMovedDuringDrag ? 'true' : 'false';
        
        const pos = {
            left: clockBox.style.left,
            top: clockBox.style.top
        };
        AppStorage.setClockPosition(pos);
    });

    // 从存储中加载先前保存的时钟位置
    const savedPos = AppStorage.getClockPosition();
    if (savedPos && savedPos.left && savedPos.top) {
        clockBox.style.left = savedPos.left;
        clockBox.style.top = savedPos.top;
    } else {
        clockBox.style.left = defaultClockPosition.left;
        clockBox.style.top = defaultClockPosition.top;
    }
}

// 确保 DOM 加载后初始化菜单
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContextMenu);
} else {
    initContextMenu();
}
