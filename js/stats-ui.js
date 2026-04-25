function closeStatsModal() {
    const modal = document.getElementById('statsModal');
    if (modal) modal.style.display = 'none';
}

function setStatsRange(range) {
    if (!['today', 'week', 'month'].includes(range)) return;
    currentStatsRange = range;

    document.querySelectorAll('#statsRangeSwitcher .stats-range-btn').forEach((button) => {
        button.classList.toggle('active', button.getAttribute('data-range') === range);
    });

    renderStatsModal();
}

function openStatsModal() {
    setStatsRange(currentStatsRange);
    const modal = document.getElementById('statsModal');
    if (modal) modal.style.display = 'flex';
}
function renderStatsModal() {
    const summary = getSummaryForRange(currentStatsRange);
    const topSiteEl = document.getElementById('statsTopSite');
    const topSiteMetaEl = document.getElementById('statsTopSiteMeta');
    const todayBucket = ensureDailyBucket(getTodayKey());

    document.getElementById('statsSubtitle').textContent = summary.config.subtitle;
    document.getElementById('statsTopSiteLabel').textContent = summary.config.topSiteLabel;
    document.getElementById('statsClicksLabel').textContent = summary.config.clicksLabel;
    document.getElementById('statsOnlineLabel').textContent = summary.config.onlineLabel;
    document.getElementById('statsMonthClicks').textContent = summary.totalClicks;
    document.getElementById('statsMonthOnline').textContent = formatDuration(summary.totalOnline);
    document.getElementById('statsPeakClickDay').textContent = summary.peakClickDay.clicks > 0
        ? `${formatShortDate(summary.peakClickDay.dateKey)} · ${summary.peakClickDay.clicks} 次`
        : '暂无';
    document.getElementById('statsPeakOnlineDay').textContent = summary.peakOnlineDay.onlineTime > 0
        ? `${formatShortDate(summary.peakOnlineDay.dateKey)} · ${formatDurationLabel(summary.peakOnlineDay.onlineTime)}`
        : '暂无';
    document.getElementById('statsTrendState').textContent = summary.trendState;
    document.querySelector('#statsRankingList').setAttribute('data-title', summary.config.rankingLabel);

    const rankingTitle = document.querySelector('#statsRankingList').closest('.stats-panel').querySelector('.stats-panel-title');
    if (rankingTitle) rankingTitle.textContent = summary.config.rankingLabel;

    if (summary.topSite) {
        topSiteEl.textContent = summary.topSite.name;
        topSiteMetaEl.textContent = `${summary.config.title} ${summary.topSite.recentClicks} 次点击`;
    } else {
        topSiteEl.textContent = '暂无数据';
        topSiteMetaEl.textContent = '快去点击常用网页吧';
    }

    renderRankingList(summary.ranking, summary.config.title);
    renderHourlyDistribution(
        document.getElementById('statsTopClickDays'),
        '今日 24 小时点击分布',
        todayBucket.hourlyClicks,
        '次',
        'rgba(24, 144, 255, 0.18)',
        'linear-gradient(180deg, rgba(24, 144, 255, 0.95), rgba(54, 207, 201, 0.82))',
        function (value) { return `${value} 次`; }
    );
    renderHourlyDistribution(
        document.getElementById('statsTopOnlineDays'),
        '今日 24 小时在线分布',
        todayBucket.hourlyOnline.map((seconds) => Math.round(seconds / 60)),
        '分钟',
        'rgba(124, 77, 255, 0.18)',
        'linear-gradient(180deg, rgba(124, 77, 255, 0.95), rgba(255, 133, 192, 0.82))',
        function (value) { return `${value} 分钟`; }
    );
    renderTrendChart(
        document.getElementById('clickTrendChart'),
        summary.dailySeries.map((item) => item.clicks),
        summary.dailySeries.map((item) => item.dateKey),
        '次',
        '#36cfc9',
        '#1890ff',
        {
            title: `${summary.config.title}点击趋势`,
            valueFormatter(value, dateKey) {
                return `${formatShortDate(dateKey)} · ${value} 次点击`;
            }
        }
    );
    renderTrendChart(
        document.getElementById('onlineTrendChart'),
        summary.dailySeries.map((item) => Math.round(item.onlineTime / 60)),
        summary.dailySeries.map((item) => item.dateKey),
        '分钟',
        '#ff85c0',
        '#7c4dff',
        {
            title: `${summary.config.title}在线时长`,
            valueFormatter(value, dateKey) {
                return `${formatShortDate(dateKey)} · ${value} 分钟在线`;
            }
        }
    );
}

function renderHourlyDistribution(container, title, values, unit, baseColor, fillStyle, valueFormatter) {
    if (!container) return;

    const safeValues = Array.isArray(values) ? values.slice(0, 24).map((value) => Math.max(0, Number(value) || 0)) : createEmptyHourlySeries();
    const maxValue = Math.max(...safeValues, 0);
    const activeHours = safeValues.filter((value) => value > 0).length;
    const peakHour = safeValues.findIndex((value) => value === maxValue);
    const currentHour = getCurrentHourIndex();

    if (maxValue <= 0) {
        container.innerHTML = `
            <div class="stats-distribution-header">
                <div class="stats-distribution-header-copy">
                    <span>${title}</span>
                    <span class="stats-distribution-peak">最活跃时段：暂无</span>
                </div>
                <span class="stats-distribution-tag">暂无数据</span>
            </div>
            <div class="stats-empty stats-empty-compact">今天还没有形成分布曲线</div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="stats-distribution-header">
            <div class="stats-distribution-header-copy">
                <span>${title}</span>
                <span class="stats-distribution-peak">最活跃时段：${formatHourLabel(peakHour)}</span>
            </div>
            <span class="stats-distribution-tag">活跃 ${activeHours} 小时</span>
        </div>
        <div class="stats-distribution-bars">
            ${safeValues.map((value, hour) => {
                const height = maxValue > 0 ? Math.max(10, Math.round((value / maxValue) * 100)) : 10;
                const label = `${String(hour).padStart(2, '0')}:00`;
                const detail = `${formatHourLabel(hour)} · ${valueFormatter(value)}`;
                const classes = [
                    'stats-distribution-col',
                    hour === peakHour ? 'is-peak' : '',
                    hour === currentHour ? 'is-current' : ''
                ].filter(Boolean).join(' ');
                return `
                    <div class="${classes}" tabindex="0" data-tooltip="${detail}">
                        <div class="stats-distribution-value">${valueFormatter(value)}</div>
                        <div class="stats-distribution-bar-wrap">
                            <div class="stats-distribution-bar" style="height:${height}%; background:${value > 0 ? fillStyle : baseColor};"></div>
                        </div>
                        <div class="stats-distribution-hour">${label}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderRankingList(ranking, title) {
    const container = document.getElementById('statsRankingList');
    if (!container) return;

    if (!ranking.length) {
        container.innerHTML = `<div class="stats-empty">${title}还没有点击数据</div>`;
        return;
    }

    container.innerHTML = ranking.slice(0, 10).map((item, index) => {
        const safeName = escapeHTML(item.name || '未命名网页');
        const safeUrl = escapeHTML(item.url || '#');
        const lastClickedText = item.lastClickedAt
            ? new Date(item.lastClickedAt).toLocaleString('zh-CN')
            : '暂无记录';
        const hotClass = index < 3 ? ` ranking-item-top ranking-item-top-${index + 1}` : '';

        return `
            <div class="ranking-item${hotClass}">
                <div class="ranking-index">${index + 1}</div>
                <div class="ranking-info">
                    <div class="ranking-name">${safeName}</div>
                    <div class="ranking-url">${safeUrl}</div>
                </div>
                <div class="ranking-metrics">
                    <div class="ranking-clicks">${item.recentClicks} 次</div>
                    <div class="ranking-last">${lastClickedText}</div>
                </div>
            </div>
        `;
    }).join('');
}

function ensureChartTooltip(svg, title) {
    const chartCard = svg.closest('.chart-card');
    if (!chartCard) return null;

    let tooltip = chartCard.querySelector('.chart-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'chart-tooltip';
        tooltip.innerHTML = '<div class="chart-tooltip-title"></div><div class="chart-tooltip-value"></div>';
        chartCard.appendChild(tooltip);
    }

    const titleEl = tooltip.querySelector('.chart-tooltip-title');
    if (titleEl) titleEl.textContent = title || '趋势详情';
    return tooltip;
}

function hideChartTooltip(svg) {
    const chartCard = svg.closest('.chart-card');
    const tooltip = chartCard ? chartCard.querySelector('.chart-tooltip') : null;
    if (tooltip) tooltip.classList.remove('visible');
}

function bindChartTooltip(svg, tooltip, formatter) {
    if (!tooltip) return;

    const valueEl = tooltip.querySelector('.chart-tooltip-value');
    const pointGroups = svg.querySelectorAll('.chart-point-group');

    pointGroups.forEach((group) => {
        const x = Number(group.getAttribute('data-x'));
        const y = Number(group.getAttribute('data-y'));
        const value = Number(group.getAttribute('data-value'));
        const label = group.getAttribute('data-label') || '';

        function showTooltip() {
            if (valueEl) {
                valueEl.textContent = formatter ? formatter(value, label) : `${label} · ${value}`;
            }

            const leftPercent = Math.max(8, Math.min((x / 640) * 100, 92));
            const topPercent = Math.max(12, Math.min((y / 260) * 100 - 6, 78));
            tooltip.style.left = `${leftPercent}%`;
            tooltip.style.top = `${topPercent}%`;
            tooltip.classList.add('visible');
        }

        group.addEventListener('mouseenter', showTooltip);
        group.addEventListener('focus', showTooltip);
        group.addEventListener('blur', function () { hideChartTooltip(svg); });
    });

    svg.onmouseleave = function () { hideChartTooltip(svg); };
}

function renderTrendChart(svg, values, labels, unit, startColor, endColor, options = {}) {
    if (!svg) return;

    const width = 640;
    const height = 260;
    const padding = { top: 24, right: 22, bottom: 42, left: 48 };
    const maxValue = Math.max(...values, 0);
    const safeMax = maxValue === 0 ? 1 : maxValue;
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const stepX = values.length > 1 ? innerWidth / (values.length - 1) : innerWidth / 2;

    const points = values.map((value, index) => {
        const x = values.length > 1 ? padding.left + stepX * index : padding.left + innerWidth / 2;
        const y = padding.top + innerHeight - (value / safeMax) * innerHeight;
        return { x, y, value, label: labels[index] };
    });

    // 生成平滑曲线路径的辅助函数 (贝塞尔曲线)
    const getSmoothPath = (pts) => {
        if (pts.length < 2) return pts.length === 1 ? `M ${pts[0].x},${pts[0].y}` : "";
        let path = `M ${pts[0].x},${pts[0].y}`;
        const smoothing = 0.15; // 平滑系数

        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i === 0 ? i : i - 1];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = pts[i + 2 >= pts.length ? pts.length - 1 : i + 2];

            const cp1x = p1.x + (p2.x - p0.x) * smoothing;
            const cp1y = p1.y + (p2.y - p0.y) * smoothing;
            const cp2x = p2.x - (p3.x - p1.x) * smoothing;
            const cp2y = p2.y - (p3.y - p1.y) * smoothing;

            path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
        }
        return path;
    };

    const smoothLinePath = getSmoothPath(points);
    const baselineY = padding.top + innerHeight;
    const areaPath = points.length > 0 ?
        `${smoothLinePath} L ${points[points.length-1].x},${baselineY} L ${points[0].x},${baselineY} Z` : "";

    const grid = Array.from({ length: 4 }, (_, index) => {
        const ratio = index / 3;
        const value = Math.round(safeMax * (1 - ratio));
        const y = padding.top + innerHeight * ratio;

        return `
            <line x1="${padding.left}" y1="${y}" x2="${padding.left + innerWidth}" y2="${y}" class="chart-grid-line"></line>
            <text x="${padding.left - 10}" y="${y + 4}" class="chart-axis-label chart-axis-left">${value}${unit}</text>
        `;
    }).join('');

    const xLabels = points.filter((_, index) => {
        if (points.length <= 6) return true;
        if (index === 0 || index === points.length - 1) return true;
        return index % Math.ceil(points.length / 5) === 0;
    }).map((point) => `
        <text x="${point.x}" y="${height - 14}" class="chart-axis-label chart-axis-bottom">${point.label.slice(5)}</text>
    `).join('');

    const circles = points.map((point) => `
        <g class="chart-point-group" tabindex="0" data-x="${point.x}" data-y="${point.y}" data-value="${point.value}" data-label="${point.label}">
            <circle cx="${point.x}" cy="${point.y}" r="4.5" class="chart-point" style="fill:${endColor};"></circle>
            <title>${point.label}：${point.value}${unit}</title>
        </g>
    `).join('');

    svg.innerHTML = `
        <defs>
            <linearGradient id="${svg.id}-gradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="${startColor}"></stop>
                <stop offset="100%" stop-color="${endColor}"></stop>
            </linearGradient>
            <linearGradient id="${svg.id}-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="${endColor}" stop-opacity="0.33"></stop>
                <stop offset="100%" stop-color="${endColor}" stop-opacity="0.02"></stop>
            </linearGradient>
            <filter id="${svg.id}-glow">
                <feGaussianBlur stdDeviation="4" result="blur"></feGaussianBlur>
                <feMerge>
                    <feMergeNode in="blur"></feMergeNode>
                    <feMergeNode in="SourceGraphic"></feMergeNode>
                </feMerge>
            </filter>
        </defs>
        ${grid}
        <path d="${areaPath}" fill="url(#${svg.id}-area)"></path>
        <path d="${smoothLinePath}" class="chart-trend-line" stroke="url(#${svg.id}-gradient)" fill="none" filter="url(#${svg.id}-glow)"></path>
        ${circles}
        ${xLabels}
    `;

    const tooltip = ensureChartTooltip(svg, options.title);
    bindChartTooltip(svg, tooltip, options.valueFormatter);
}


