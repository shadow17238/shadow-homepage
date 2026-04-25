/**
 * 导出全量数据备份
 * 将链接、倒数日、设置及统计数据封装为 JSON 文件下载
 */
function exportData() {
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    const fileName = `shadow_homepage_full_backup_${month}_${day}_${hour}_${minute}.json`;

    // 构造备份对象
    const fullData = {
        version: 2.0,
        appData: appData,
        countdownData: countdownData,
        clockPosition: AppStorage.getClockPosition(),
        customTitle: document.getElementById('artText').innerText,
        stats: {
            clickCount: clickCount,
            onlineTime: onlineTime,
            analytics: analyticsData
        }
    };

    const dataStr = JSON.stringify(fullData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // 模拟点击下载
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // 记录备份时间
    AppStorage.setLastBackup(now.getTime());
}

/**
 * 触发导入文件选择框
 */
function triggerImport() {
    document.getElementById('importInput').click();
}

/**
 * 处理导入文件
 * 支持新版全量备份和旧版链接备份的识别与恢复
 * @param {HTMLInputElement} inputElement - 文件输入框元素
 */
function importData(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    // 格式校验
    if (!file.name.endsWith('.json')) {
        alert('请选择 .json 格式的备份文件。');
        inputElement.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onerror = function() {
        alert('文件读取失败，请确认文件未损坏后重试。');
        inputElement.value = '';
    };

    reader.onload = function(e) {
        let json;
        try {
            json = JSON.parse(e.target.result);
        } catch (err) {
            alert('文件内容不是有效的 JSON 格式，无法导入。\n详情：' + err.message);
            inputElement.value = '';
            return;
        }

        try {
            // 情况 A：处理旧版纯数组格式备份
            if (Array.isArray(json)) {
                if (!validateAppData(json)) {
                    alert('旧版备份文件中的链接数据格式异常，无法导入。');
                    inputElement.value = '';
                    return;
                }
                if (confirm('检测到这是旧版备份文件（只包含链接），是否仅导入链接？')) {
                    appData = json;
                    AppState.persistAppData();
                    renderLinks();
                    alert('链接数据已恢复。');
                }
            } 
            // 情况 B：处理新版对象格式备份
            else if (json && (json.version || json.appData)) {
                // 1. 导入链接数据
                if (json.appData) {
                    if (!validateAppData(json.appData)) {
                        alert('备份文件中的链接数据格式异常，已跳过链接导入。');
                    } else {
                        appData = json.appData;
                        AppState.persistAppData();
                        renderLinks();
                    }
                }

                // 2. 导入倒数日数据
                if (json.countdownData) {
                    if (!validateCountdownData(json.countdownData)) {
                        alert('备份文件中的倒数日数据格式异常，已跳过倒数日导入。');
                    } else {
                        countdownData = json.countdownData;
                        AppState.persistCountdowns();
                        refreshCountdowns();
                    }
                }

                // 3. 恢复时钟位置
                if (json.clockPosition && json.clockPosition.left && json.clockPosition.top) {
                    const pos = json.clockPosition;
                    const clockBox = document.getElementById('clock-box');
                    clockBox.style.left = pos.left;
                    clockBox.style.top = pos.top;
                    AppStorage.setClockPosition(pos);
                }

                // 4. 恢复自定义寄语
                if (json.customTitle && typeof json.customTitle === 'string') {
                    document.getElementById('artText').innerText = json.customTitle;
                    AppStorage.setCustomArtText(json.customTitle);
                }

                // 5. 恢复统计数据（需用户二次确认）
                if (json.stats && confirm('检测到备份文件中包含统计数据（点击次数、在线时长和统计明细），是否导入这些数据？')) {
                    if (typeof json.stats.clickCount === 'number' && json.stats.clickCount >= 0) {
                        clickCount = json.stats.clickCount;
                        AppState.persistClickCount();
                    }
                    if (typeof json.stats.onlineTime === 'number' && json.stats.onlineTime >= 0) {
                        onlineTime = json.stats.onlineTime;
                        AppState.persistOnlineTime();
                    }
                    if (json.stats.analytics && typeof json.stats.analytics === 'object') {
                        analyticsData = json.stats.analytics;
                        flushAnalyticsData();
                    }
                    updateStatsDisplay();
                }

                alert('数据导入完成。');
            } else {
                alert('无法识别的备份文件格式。\n请确认使用的是本项目导出的备份文件。');
            }
        } catch (err) {
            alert('导入过程中发生错误：' + err.message);
            console.error('Import error:', err);
        }

        // 重置 input 以允许再次选择相同文件
        inputElement.value = '';
    };

    reader.readAsText(file);
}
