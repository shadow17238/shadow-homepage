let currentCountdownEditIndex = -1;

function normalizeCountdownItem(item) {
    if (!item || typeof item !== 'object') return null;

    return {
        name: typeof item.name === 'string' ? item.name.trim() : '',
        type: item.type,
        dateStr: typeof item.dateStr === 'string' ? item.dateStr : '',
        lunarM: item.lunarM,
        lunarD: item.lunarD,
        pinned: Boolean(item.pinned)
    };
}

function saveCountdownData() {
    AppState.persistCountdowns();
}

function initCountdowns() {
    syncCountdownTypeAvailability();

    const saved = AppStorage.getCountdownData();
    if (saved) {
        countdownData = saved;
        if (!validateCountdownData(countdownData)) countdownData = null;
    } else {
        countdownData = JSON.parse(JSON.stringify(defaultCountdownData));
    }

    if (!Array.isArray(countdownData)) countdownData = [];

    countdownData = countdownData.map((item) => normalizeCountdownItem(item)).filter(Boolean);
    saveCountdownData();

    refreshCountdowns();
    setInterval(refreshCountdowns, 60000);
}

function validateLunarDate(month, day) {
    if (!hasLunarSupport()) return false;

    const lunarMonth = parseInt(month, 10);
    const lunarDay = parseInt(day, 10);

    if (!Number.isInteger(lunarMonth) || !Number.isInteger(lunarDay)) return false;
    if (lunarMonth < 1 || lunarMonth > 12) return false;
    if (lunarDay < 1 || lunarDay > 30) return false;

    try {
        const lunarYear = Lunar.fromDate(new Date()).getYear();
        Lunar.fromYmd(lunarYear, lunarMonth, lunarDay).getSolar();
        return true;
    } catch (error) {
        return false;
    }
}

function isCountdownItemValid(item) {
    if (!item || typeof item.name !== 'string' || !item.name.trim()) return false;

    if (item.type === 'lunar_bday') {
        return validateLunarDate(item.lunarM, item.lunarD);
    }

    if (item.type === 'normal' || item.type === 'solar_bday') {
        if (typeof item.dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.dateStr)) {
            return false;
        }
        return !Number.isNaN(new Date(item.dateStr).getTime());
    }

    return false;
}

function getDaysInfo(item) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let targetDate = new Date();
    let label = '';

    try {
        if (!isCountdownItemValid(item)) {
            return { days: 0, target: today, label, isExpired: true, isInvalid: true };
        }

        if (item.type === 'normal') {
            const parts = item.dateStr.split('-');
            targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
        } else if (item.type === 'solar_bday') {
            const bday = new Date(item.dateStr);
            targetDate.setFullYear(today.getFullYear(), bday.getMonth(), bday.getDate());
            if (targetDate < today) {
                targetDate.setFullYear(today.getFullYear() + 1);
            }
            label = '生日';
        } else if (item.type === 'lunar_bday') {
            if (!hasLunarSupport()) {
                return { days: 0, target: today, label: '农历生日', isExpired: false, isInvalid: true, isUnavailable: true };
            }

            const lunarYear = Lunar.fromDate(today).getYear();
            let solarDate = Lunar.fromYmd(lunarYear, parseInt(item.lunarM, 10), parseInt(item.lunarD, 10)).getSolar();
            targetDate = new Date(solarDate.getYear(), solarDate.getMonth() - 1, solarDate.getDay());

            if (targetDate < today) {
                solarDate = Lunar.fromYmd(lunarYear + 1, parseInt(item.lunarM, 10), parseInt(item.lunarD, 10)).getSolar();
                targetDate = new Date(solarDate.getYear(), solarDate.getMonth() - 1, solarDate.getDay());
            }
            label = '农历生日';
        }
    } catch (error) {
        return { days: 0, target: today, label, isExpired: true, isInvalid: true };
    }

    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
        days: diffDays,
        target: targetDate,
        label,
        isExpired: item.type === 'normal' && diffDays < 0,
        isInvalid: false
    };
}

function refreshCountdowns() {
    const wrapper = document.getElementById('countdown-wrapper');
    if (!countdownData || countdownData.length === 0) {
        wrapper.style.display = 'none';
        return;
    }

    const list = [];
    const newData = [];

    countdownData.forEach((item) => {
        const info = getDaysInfo(item);
        if (!info.isExpired) {
            newData.push(item);
        }

        if (!info.isExpired && !info.isInvalid) {
            list.push({ ...item, days: info.days, sortDate: info.target });
        }
    });

    if (newData.length !== countdownData.length) {
        countdownData = newData;
        saveCountdownData();
    }

    if (list.length === 0) {
        wrapper.style.display = 'none';
        return;
    }

    list.sort((a, b) => {
        if (Boolean(b.pinned) !== Boolean(a.pinned)) return Number(b.pinned) - Number(a.pinned);
        return a.days - b.days;
    });

    wrapper.style.display = 'block';
    wrapper.innerHTML = '';

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
    topDays.style.color = top.days <= 3 ? '#ff4d4f' : 'var(--accent-color)';
    topDays.textContent = `${top.days}天`;

    topDiv.appendChild(topSpan);
    topDiv.appendChild(topDays);
    wrapper.appendChild(topDiv);

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

function openCountdownModal() {
    if (!isEditMode) return;
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

function beginEditCountdown(index) {
    const item = countdownData[index];
    if (!item) return;

    currentCountdownEditIndex = index;
    document.getElementById('countdownModalTitle').textContent = '编辑倒数日';
    document.getElementById('cdAddBtn').textContent = '保存';
    document.getElementById('cdName').value = item.name;
    document.getElementById('cdType').value = item.type;
    toggleCdInput();

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

function toggleCdInput() {
    const type = document.getElementById('cdType').value;
    if (type === 'lunar_bday') {
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

function addCountdown() {
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

    if (currentCountdownEditIndex >= 0) {
        countdownData[currentCountdownEditIndex] = newItem;
    } else {
        countdownData.push(newItem);
    }

    saveCountdownData();
    resetCountdownForm();
    refreshCountdowns();
    openCountdownModal();
}

function delCountdown(index) {
    countdownData.splice(index, 1);
    saveCountdownData();

    if (currentCountdownEditIndex === index) {
        resetCountdownForm();
    } else if (currentCountdownEditIndex > index) {
        currentCountdownEditIndex--;
    }

    refreshCountdowns();
    openCountdownModal();
}

function togglePinCountdown(index) {
    if (!countdownData[index]) return;
    countdownData[index].pinned = !countdownData[index].pinned;
    saveCountdownData();
    refreshCountdowns();
    openCountdownModal();
}

function syncCountdownTypeAvailability() {
    const typeSelect = document.getElementById('cdType');
    if (!typeSelect) return;

    const lunarOption = typeSelect.querySelector('option[value="lunar_bday"]');
    if (!lunarOption) return;

    const supported = hasLunarSupport();
    lunarOption.disabled = !supported;
    lunarOption.textContent = supported ? '农历生日 (自动续期)' : '农历生日 (依赖不可用)';
}

function moveCountdown(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= countdownData.length) return;

    const temp = countdownData[index];
    countdownData[index] = countdownData[targetIndex];
    countdownData[targetIndex] = temp;

    if (currentCountdownEditIndex === index) {
        currentCountdownEditIndex = targetIndex;
    } else if (currentCountdownEditIndex === targetIndex) {
        currentCountdownEditIndex = index;
    }

    saveCountdownData();
    refreshCountdowns();
    openCountdownModal();
}

