/**
 * 倒计时（倒数日）模块逻辑
 */
let currentCountdownEditIndex = -1; // 当前正在编辑的倒计时项索引

/**
 * 规范化倒计时数据项，确保对象结构完整
 * @param {Object} item - 原始数据项对象
 * @return {Object|null} 规范化后的项或 null
 */
function normalizeCountdownItem(item) {
    if (!item || typeof item !== 'object') return null;

    return {
        name: typeof item.name === 'string' ? item.name.trim() : '',
        type: item.type, // 可选值: 'normal' (普通), 'solar_bday' (公历生日), 'lunar_bday' (农历生日)
        dateStr: typeof item.dateStr === 'string' ? item.dateStr : '',
        lunarM: item.lunarM,
        lunarD: item.lunarD,
        pinned: Boolean(item.pinned)
    };
}

/**
 * 将倒计时数据持久化到本地存储
 */
function saveCountdownData() {
    AppState.persistCountdowns();
}

/**
 * 初始化倒计时组件，从存储加载数据并启动定时刷新
 */
function initCountdowns() {
    syncCountdownTypeAvailability(); // 检查农历功能可用性

    // 尝试从存储中加载已有的倒数日数据
    const saved = AppStorage.getCountdownData();
    if (saved) {
        countdownData = saved;
        if (!validateCountdownData(countdownData)) countdownData = null;
    } else {
        // 如果没有任何存储数据，则应用默认的预设倒计时
        countdownData = deepClone(defaultCountdownData);
    }

    if (!Array.isArray(countdownData)) countdownData = [];

    // 对所有数据项进行规范化处理并过滤无效项
    countdownData = countdownData.map((item) => normalizeCountdownItem(item)).filter(Boolean);
    saveCountdownData();

    // 首次渲染展示
    refreshCountdowns();
    // 每分钟自动执行一次刷新，以更新剩余天数
    setInterval(refreshCountdowns, 60000);
}

/**
 * 校验农历日期（月、日）是否合法
 * @param {number|string} month - 农历月份
 * @param {number|string} day - 农历日期
 * @return {boolean}
 */
function validateLunarDate(month, day) {
    if (!hasLunarSupport()) return false;

    const lunarMonth = parseInt(month, 10);
    const lunarDay = parseInt(day, 10);

    if (!Number.isInteger(lunarMonth) || !Number.isInteger(lunarDay)) return false;
    if (lunarMonth < 1 || lunarMonth > 12) return false;
    if (lunarDay < 1 || lunarDay > 30) return false;

    try {
        // 尝试通过 lunar 库转换日期，如果抛出异常则说明该日期无效
        const lunarYear = Lunar.fromDate(new Date()).getYear();
        Lunar.fromYmd(lunarYear, lunarMonth, lunarDay).getSolar();
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * 校验一个倒计时配置项是否完整且合法
 * @param {Object} item - 待校验的项
 * @return {boolean}
 */
function isCountdownItemValid(item) {
    if (!item || typeof item.name !== 'string' || !item.name.trim()) return false;

    // 农历生日校验逻辑
    if (item.type === 'lunar_bday') {
        return validateLunarDate(item.lunarM, item.lunarD);
    }

    // 普通固定日期或公历生日校验逻辑
    if (item.type === 'normal' || item.type === 'solar_bday') {
        if (typeof item.dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.dateStr)) {
            return false;
        }
        return !Number.isNaN(new Date(item.dateStr).getTime());
    }

    return false;
}

/**
 * 计算给定倒计时项距离目标日期的详细天数信息
 * @param {Object} item - 倒计时项
 * @return {Object} 包含剩余天数、目标日期及状态的对象
 */
function getDaysInfo(item) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 抹除具体时分秒，仅以日期为准对比
    let targetDate = new Date();
    let label = '';

    try {
        if (!isCountdownItemValid(item)) {
            return { days: 0, target: today, label, isExpired: true, isInvalid: true };
        }

        // 普通固定目标日期
        if (item.type === 'normal') {
            const parts = item.dateStr.split('-');
            targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
        } 
        // 每年重复出现的公历生日
        else if (item.type === 'solar_bday') {
            const bday = new Date(item.dateStr);
            targetDate.setFullYear(today.getFullYear(), bday.getMonth(), bday.getDate());
            // 如果今年的生日已经过去，则计算明年的日期
            if (targetDate < today) {
                targetDate.setFullYear(today.getFullYear() + 1);
            }
            label = '生日';
        } 
        // 每年重复出现的农历生日
        else if (item.type === 'lunar_bday') {
            if (!hasLunarSupport()) {
                return { days: 0, target: today, label: '农历生日', isExpired: false, isInvalid: true, isUnavailable: true };
            }

            const lunarYear = Lunar.fromDate(today).getYear();
            let solarDate = Lunar.fromYmd(lunarYear, parseInt(item.lunarM, 10), parseInt(item.lunarD, 10)).getSolar();
            targetDate = new Date(solarDate.getYear(), solarDate.getMonth() - 1, solarDate.getDay());

            // 如果今年的农历生日已过，则计算下一个农历年的对应公历日期
            if (targetDate < today) {
                solarDate = Lunar.fromYmd(lunarYear + 1, parseInt(item.lunarM, 10), parseInt(item.lunarD, 10)).getSolar();
                targetDate = new Date(solarDate.getYear(), solarDate.getMonth() - 1, solarDate.getDay());
            }
            label = '农历生日';
        }
    } catch (error) {
        return { days: 0, target: today, label, isExpired: true, isInvalid: true };
    }

    // 计算两者之间的天数差距
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
        days: diffDays,
        target: targetDate,
        label,
        isExpired: item.type === 'normal' && diffDays < 0, // 仅普通固定日期支持过期检测
        isInvalid: false
    };
}

/**
 * 刷新页面侧边栏显示的倒数日列表
 */
function refreshCountdowns() {
    const wrapper = document.getElementById('countdown-wrapper');
    if (!countdownData || countdownData.length === 0) {
        wrapper.style.display = 'none';
        return;
    }

    const list = [];
    const newData = [];

    // 计算每个项的剩余天数并处理过期项
    countdownData.forEach((item) => {
        const info = getDaysInfo(item);
        // 如果项已经过期（针对普通日期），则在刷新时自动从列表中移除
        if (!info.isExpired) {
            newData.push(item);
        }

        if (!info.isExpired && !info.isInvalid) {
            list.push({ ...item, days: info.days, sortDate: info.target });
        }
    });

    // 如果产生了自动移除，则更新本地存储
    if (newData.length !== countdownData.length) {
        countdownData = newData;
        saveCountdownData();
    }

    if (list.length === 0) {
        wrapper.style.display = 'none';
        return;
    }

    // 列表排序：置顶项排在最前，其余按天数从小到大升序排列
    list.sort((a, b) => {
        if (Boolean(b.pinned) !== Boolean(a.pinned)) return Number(b.pinned) - Number(a.pinned);
        return a.days - b.days;
    });

    wrapper.style.display = 'block';
    wrapper.innerHTML = '';

    // 渲染最近的一条倒数日（重点展示）
    const top = list[0];
    const topDiv = document.createElement('div');
    topDiv.className = 'cd-top-item';

    const topSpan = document.createElement('span');
    topSpan.textContent = `${top.name} `;

    if (top.pinned) {
        const topPin = document.createElement('span');
        topPin.className = 'cd-top-pin';
        topPin.textContent = '置顶';
        topSpan.appendChild(topPin);
    }

    const topLabel = document.createElement('span');
    topLabel.className = 'cd-top-label';
    topLabel.textContent = top.days === 0 ? '就是今天!' : '还有';
    topSpan.appendChild(topLabel);

    const topDays = document.createElement('span');
    topDays.className = 'cd-top-days';
    // 临近 3 天内显示红色强调色
    topDays.style.color = top.days <= 3 ? '#ff4d4f' : 'var(--accent-color)';
    topDays.textContent = `${top.days}天`;

    topDiv.appendChild(topSpan);
    topDiv.appendChild(topDays);
    wrapper.appendChild(topDiv);

    // 渲染其余的普通倒数日项
    for (let i = 1; i < list.length; i++) {
        const div = document.createElement('div');
        div.className = 'cd-normal-item';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = list[i].name;
        if (list[i].pinned) {
            const pin = document.createElement('span');
            pin.className = 'cd-top-pin';
            pin.textContent = '置顶';
            nameSpan.appendChild(document.createTextNode(' '));
            nameSpan.appendChild(pin);
        }

        const daysSpan = document.createElement('span');
        daysSpan.className = 'cd-days-small';
        daysSpan.textContent = `${list[i].days} 天`;

        div.appendChild(nameSpan);
        div.appendChild(daysSpan);
        wrapper.appendChild(div);
    }
}

/**
 * 打开倒数日编辑管理模态框
 */
function openCountdownModal() {
    if (!isEditMode) return; // 只有在首页开启编辑模式时才允许进入管理界面
    syncCountdownTypeAvailability();

    const listDiv = document.getElementById('cd-list-edit');
    listDiv.innerHTML = '';

    if (countdownData.length === 0) {
        const emptyHint = document.createElement('div');
        emptyHint.style.textAlign = 'center';
        emptyHint.style.color = '#999';
        emptyHint.style.padding = '20px';
        emptyHint.textContent = '暂无倒数日，请在下方添加。';
        listDiv.appendChild(emptyHint);
    }

    // 渲染管理列表中的每一个可操作项
    countdownData.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'countdown-edit-item';

        const meta = document.createElement('div');
        meta.className = 'countdown-edit-meta';

        const title = document.createElement('span');
        title.textContent = `${index + 1}. ${item.name}`;
        meta.appendChild(title);

        if (item.pinned) {
            const pinBadge = document.createElement('span');
            pinBadge.className = 'countdown-pin-badge';
            pinBadge.textContent = '置顶';
            meta.appendChild(pinBadge);
        }

        const typeSpan = document.createElement('span');
        typeSpan.className = 'countdown-edit-type';
        typeSpan.textContent = `(${item.type})`;
        meta.appendChild(typeSpan);

        const actions = document.createElement('div');
        actions.className = 'countdown-edit-actions';

        // 按钮组：置顶、上移、下移、编辑、删除
        const pinBtn = document.createElement('button');
        pinBtn.type = 'button';
        pinBtn.className = `countdown-inline-btn countdown-inline-btn-pin${item.pinned ? ' is-active' : ''}`;
        pinBtn.title = item.pinned ? '取消置顶' : '置顶';
        pinBtn.innerHTML = '<i class="fa-solid fa-thumbtack"></i>';
        pinBtn.addEventListener('click', function () { togglePinCountdown(index); });

        const upBtn = document.createElement('button');
        upBtn.type = 'button';
        upBtn.className = 'countdown-inline-btn';
        upBtn.title = '上移';
        upBtn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
        upBtn.disabled = index === 0;
        upBtn.addEventListener('click', function () { moveCountdown(index, -1); });

        const downBtn = document.createElement('button');
        downBtn.type = 'button';
        downBtn.className = 'countdown-inline-btn';
        downBtn.title = '下移';
        downBtn.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';
        downBtn.disabled = index === countdownData.length - 1;
        downBtn.addEventListener('click', function () { moveCountdown(index, 1); });

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'countdown-inline-btn countdown-inline-btn-edit';
        editBtn.title = '编辑';
        editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
        editBtn.addEventListener('click', function () { beginEditCountdown(index); });

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'countdown-inline-btn countdown-inline-btn-delete';
        delBtn.title = '删除';
        delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
        delBtn.addEventListener('click', function () { delCountdown(index); });

        actions.appendChild(pinBtn);
        actions.appendChild(upBtn);
        actions.appendChild(downBtn);
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        div.appendChild(meta);
        div.appendChild(actions);
        listDiv.appendChild(div);
    });

    document.getElementById('countdownModal').style.display = 'flex';
}

/**
 * 进入编辑状态，将指定项的数据回填到表单中
 * @param {number} index - 数据项索引
 */
function beginEditCountdown(index) {
    const item = countdownData[index];
    if (!item) return;

    currentCountdownEditIndex = index;
    document.getElementById('countdownModalTitle').textContent = '编辑倒数日';
    document.getElementById('cdAddBtn').textContent = '保存';
    document.getElementById('cdName').value = item.name;
    document.getElementById('cdType').value = item.type;
    toggleCdInput(); // 更新输入控件显隐状态

    if (item.type === 'lunar_bday') {
        document.getElementById('lunarMonth').value = item.lunarM || '';
        document.getElementById('lunarDay').value = item.lunarD || '';
        document.getElementById('cdDateInput').value = '';
    } else {
        document.getElementById('cdDateInput').value = item.dateStr || '';
        document.getElementById('lunarMonth').value = '';
        document.getElementById('lunarDay').value = '';
    }
}

/**
 * 重置倒数日管理表单到初始状态（新增模式）
 */
function resetCountdownForm() {
    currentCountdownEditIndex = -1;
    document.getElementById('countdownModalTitle').textContent = '管理倒数日';
    document.getElementById('cdAddBtn').textContent = '添加';
    document.getElementById('cdName').value = '';
    document.getElementById('cdType').value = 'normal';
    document.getElementById('cdDateInput').value = '';
    document.getElementById('lunarMonth').value = '';
    document.getElementById('lunarDay').value = '';
    syncCountdownTypeAvailability();
    toggleCdInput();
}

/**
 * 根据选择的倒数日类型切换对应的日期输入组件
 */
function toggleCdInput() {
    const type = document.getElementById('cdType').value;
    if (type === 'lunar_bday') {
        // 如果环境不支持农历功能，强制切回普通日期模式
        if (!hasLunarSupport()) {
            document.getElementById('cdType').value = 'normal';
            document.getElementById('cdDateInput').style.display = 'block';
            document.getElementById('lunarInputParams').style.display = 'none';
            return;
        }

        document.getElementById('cdDateInput').style.display = 'none';
        document.getElementById('lunarInputParams').style.display = 'flex';
    } else {
        document.getElementById('cdDateInput').style.display = 'block';
        document.getElementById('lunarInputParams').style.display = 'none';
    }
}

/**
 * 执行添加或保存操作
 */
function addCountdown() {
    // 校验总数限制（不计编辑中）
    if (currentCountdownEditIndex < 0 && countdownData.length >= 30) {
        alert('最多添加 30 个倒数日');
        return;
    }

    const name = document.getElementById('cdName').value.trim();
    const type = document.getElementById('cdType').value;
    const newItem = {
        name,
        type,
        pinned: currentCountdownEditIndex >= 0 ? Boolean(countdownData[currentCountdownEditIndex].pinned) : false
    };

    if (!name) {
        alert('请输入名称');
        return;
    }

    // 处理农历生日逻辑校验
    if (type === 'lunar_bday') {
        if (!hasLunarSupport()) {
            alert('当前无法使用农历生日功能，请稍后重试或补齐农历依赖。');
            return;
        }

        const month = document.getElementById('lunarMonth').value;
        const day = document.getElementById('lunarDay').value;
        if (!month || !day) {
            alert('请输入农历月日');
            return;
        }
        if (!validateLunarDate(month, day)) {
            alert('请输入有效的农历月日');
            return;
        }
        newItem.lunarM = month;
        newItem.lunarD = day;
        newItem.dateStr = '';
    } else {
        const dateVal = document.getElementById('cdDateInput').value;
        if (!dateVal) {
            alert('请选择日期');
            return;
        }
        newItem.dateStr = dateVal;
    }

    // 根据索引判断是新增插入还是覆盖原有项
    if (currentCountdownEditIndex >= 0) {
        countdownData[currentCountdownEditIndex] = newItem;
    } else {
        countdownData.push(newItem);
    }

    saveCountdownData();
    resetCountdownForm();
    refreshCountdowns();
    openCountdownModal(); // 重新加载列表 UI
}

/**
 * 删除指定的倒数日项
 * @param {number} index - 数据索引
 */
function delCountdown(index) {
    countdownData.splice(index, 1);
    saveCountdownData();

    // 更新当前编辑索引的状态，防止越界或指向错误
    if (currentCountdownEditIndex === index) {
        resetCountdownForm();
    } else if (currentCountdownEditIndex > index) {
        currentCountdownEditIndex--;
    }

    refreshCountdowns();
    openCountdownModal();
}

/**
 * 切换指定项的置顶状态
 * @param {number} index - 数据索引
 */
function togglePinCountdown(index) {
    if (!countdownData[index]) return;
    countdownData[index].pinned = !countdownData[index].pinned;
    saveCountdownData();
    refreshCountdowns();
    openCountdownModal();
}

/**
 * 同步农历选项在下拉框中的可用性和文案提示
 */
function syncCountdownTypeAvailability() {
    const typeSelect = document.getElementById('cdType');
    if (!typeSelect) return;

    const lunarOption = typeSelect.querySelector('option[value="lunar_bday"]');
    if (!lunarOption) return;

    const supported = hasLunarSupport();
    lunarOption.disabled = !supported;
    lunarOption.textContent = supported ? '农历生日 (自动续期)' : '农历生日 (依赖不可用)';
}

/**
 * 移动数据项的位置（交换索引）
 * @param {number} index - 原始索引
 * @param {number} direction - 移动步长（-1 或 1）
 */
function moveCountdown(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= countdownData.length) return;

    // 交换数组中的位置
    const temp = countdownData[index];
    countdownData[index] = countdownData[targetIndex];
    countdownData[targetIndex] = temp;

    // 如果正好在编辑该项，同步更新编辑索引
    if (currentCountdownEditIndex === index) {
        currentCountdownEditIndex = targetIndex;
    } else if (currentCountdownEditIndex === targetIndex) {
        currentCountdownEditIndex = index;
    }

    saveCountdownData();
    refreshCountdowns();
    openCountdownModal();
}
