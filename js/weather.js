/**
 * Shadow's Homepage 天气模块逻辑
 * 集成 OpenWeatherMap API 提供实时天气及预报
 */

const WeatherConfig = {
    // 默认 API Key (仅供演示或初次使用)
    DEFAULT_API_KEY: 'bc47fd8b178e38e8488459bb5f0c4a5f',
    // 默认城市 (杭州)
    DEFAULT_CITY: 'Hangzhou,CN',
    // OpenWeatherMap API 基础链接
    API_BASE: 'https://api.openweathermap.org/data/2.5',
    // 存储键名配置
    CACHE_KEY: 'shadow_weather_cache',
    CITY_KEY: 'shadow_weather_city_v2',
    API_KEY_STORAGE: 'shadow_weather_apikey_v2',
    // 刷新频率及缓存有效期（30分钟）
    REFRESH_INTERVAL: 30 * 60 * 1000,
    CACHE_TTL: 30 * 60 * 1000
};

let weatherData = null; // 当前天气数据对象
let weatherRefreshTimer = null; // 自动刷新定时器
let isWeatherPanelOpen = false; // 天气详情面板显示状态

const WeatherApp = {
    /**
     * 初始化天气应用模块
     */
    init() {
        console.log('[Weather] Initializing...');
        this.bindEvents();
        
        // 尝试从本地持久化存储加载天气缓存
        const cached = AppStorage.getJSON(WeatherConfig.CACHE_KEY, null);
        // 如果缓存存在且未过期，则先进行初步渲染
        if (cached && (Date.now() - cached.updatedAt) < WeatherConfig.CACHE_TTL) {
            weatherData = cached;
            this.render();
        }
        
        // 启动时立即刷新一次数据
        this.refresh();
        
        // 设置定时自动刷新任务
        if (weatherRefreshTimer) clearInterval(weatherRefreshTimer);
        weatherRefreshTimer = setInterval(() => this.refresh(), WeatherConfig.REFRESH_INTERVAL);
    },

    /**
     * 获取当前生效的 API Key
     * @return {string}
     */
    getApiKey() {
        return AppStorage.get(WeatherConfig.API_KEY_STORAGE, WeatherConfig.DEFAULT_API_KEY);
    },

    /**
     * 获取当前生效的查询城市
     * @return {string}
     */
    getCity() {
        return AppStorage.get(WeatherConfig.CITY_KEY, WeatherConfig.DEFAULT_CITY);
    },

    /**
     * 刷新天气数据，从网络获取最新状态
     */
    async refresh() {
        const city = this.getCity();
        const key = this.getApiKey();
        
        if (!key || !city) {
            console.warn('[Weather] API Key or City is missing.');
            this.renderEmpty();
            return;
        }

        try {
            // 调用接口并等待返回
            const raw = await this.fetchData(city, key);
            if (raw) {
                // 转换原始数据为应用内部所需的简化格式
                weatherData = this.processData(raw);
                // 写入缓存并重新渲染界面
                AppStorage.setJSON(WeatherConfig.CACHE_KEY, weatherData);
                this.render();
            }
        } catch (e) {
            console.error('[Weather] Refresh failed:', e);
            this.renderError();
        }
    },

    /**
     * 从 OpenWeatherMap 接口获取实时数据和预报数据
     * @param {string} city - 城市名称/代码
     * @param {string} key - API 密钥
     * @return {Promise<Object>}
     */
    async fetchData(city, key) {
        // 并行请求实时天气和 3 小时预报（预报包包含降雨概率 POP 字段）
        const [curRes, fctRes] = await Promise.all([
            fetch(`${WeatherConfig.API_BASE}/weather?q=${encodeURIComponent(city)}&units=metric&lang=zh_cn&appid=${key}`),
            fetch(`${WeatherConfig.API_BASE}/forecast?q=${encodeURIComponent(city)}&units=metric&lang=zh_cn&appid=${key}`)
        ]);

        if (!curRes.ok || !fctRes.ok) {
            throw new Error(`API Error: ${curRes.status} / ${fctRes.status}`);
        }

        return {
            current: await curRes.json(),
            forecast: await fctRes.json()
        };
    },

    /**
     * 加工原始 API 数据，提取核心信息
     * @param {Object} raw - 包含 current 和 forecast 的原始对象
     * @return {Object} 加工后的简明天气对象
     */
    processData(raw) {
        const { current, forecast } = raw;
        
        // 提取未来 3 小时内的降雨概率
        let rainProb = 0;
        if (forecast.list && forecast.list.length > 0) {
            // pop 字段为 0 到 1 之间的小数
            rainProb = Math.round((forecast.list[0].pop || 0) * 100);
        }

        // 处理后续几天的简易预报（主要是今天和明天）
        const dailyMap = {};
        forecast.list.forEach(item => {
            const date = item.dt_txt.split(' ')[0];
            if (!dailyMap[date]) {
                dailyMap[date] = {
                    date,
                    tempMax: item.main.temp_max,
                    tempMin: item.main.temp_min,
                    weatherId: item.weather[0].id,
                    description: item.weather[0].description
                };
            } else {
                // 在当天的 3 小时数据片段中寻找极值
                dailyMap[date].tempMax = Math.max(dailyMap[date].tempMax, item.main.temp_max);
                dailyMap[date].tempMin = Math.min(dailyMap[date].tempMin, item.main.temp_min);
                // 使用中午/下午时段的天气状态作为一天的代表图标
                const hour = parseInt(item.dt_txt.split(' ')[1]);
                if (hour >= 12 && hour <= 15) {
                    dailyMap[date].weatherId = item.weather[0].id;
                    dailyMap[date].description = item.weather[0].description;
                }
            }
        });

        // 整理出前两天的数据并格式化
        const daily = Object.values(dailyMap).slice(0, 2).map(d => ({
            ...d,
            tempMax: Math.round(d.tempMax),
            tempMin: Math.round(d.tempMin),
            weekday: this.formatWeekday(d.date)
        }));

        return {
            city: current.name,
            temp: Math.round(current.main.temp),
            description: current.weather[0].description,
            weatherId: current.weather[0].id,
            humidity: current.main.humidity,
            rainProb,
            daily,
            updatedAt: Date.now()
        };
    },

    /**
     * 将 YYYY-MM-DD 格式日期转换为易读的星期描述
     * @param {string} dateStr - 日期字符串
     * @return {string}
     */
    formatWeekday(dateStr) {
        const d = new Date(dateStr.replace(/-/g, '/'));
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return '今日';
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        if (d.toDateString() === tomorrow.toDateString()) return '明日';
        return WEEKDAY_NAMES[d.getDay()];
    },

    /**
     * 根据 OpenWeatherMap 的天气 ID 返回对应的图标类名
     * @param {number} id - 天气状态 ID
     * @return {string} Font Awesome 类名
     */
    getWeatherIcon(id) {
        if (id >= 200 && id < 300) return 'fa-cloud-bolt'; // 雷阵雨
        if (id >= 300 && id < 400) return 'fa-cloud-rain'; // 细雨
        if (id >= 500 && id < 600) return 'fa-cloud-showers-heavy'; // 强降雨
        if (id >= 600 && id < 700) return 'fa-snowflake'; // 雪
        if (id >= 700 && id < 800) return 'fa-smog'; // 雾/霾
        if (id === 800) return 'fa-sun'; // 晴朗
        if (id === 801) return 'fa-cloud-sun'; // 少云
        if (id > 801) return 'fa-cloud'; // 多云/阴
        return 'fa-cloud';
    },

    /**
     * 渲染主页顶部的小挂件 HTML
     * @param {HTMLElement} widget - 挂件 DOM 元素
     */
    renderWidget(widget) {
        const d = weatherData;
        const icon = this.getWeatherIcon(d.weatherId);
        widget.innerHTML = `
            <i class="fa-solid ${icon} weather-icon"></i>
            <div class="weather-info">
                <div class="weather-temp-row">
                    <span>${d.temp}°C</span>
                    <span class="weather-city-name">${d.city}</span>
                </div>
                <div class="weather-pop-info">
                    <i class="fa-solid fa-droplet"></i> ${d.rainProb}% 降雨
                </div>
            </div>
        `;
    },

    /**
     * 渲染空状态或引导配置详情面板
     * @param {HTMLElement} details - 详情面板 DOM 元素
     */
    renderEmptyDetails(details) {
        details.innerHTML = `
            <div class="weather-panel-header">
                <span class="weather-panel-title">天气设置</span>
            </div>
            <div style="padding: 20px 0; text-align: center;">
                <p style="font-size: 13px; opacity: 0.7; margin-bottom: 15px;">尚未配置天气或获取失败</p>
                <button class="btn btn-save" id="weatherSettingsInnerBtn" style="width: 100%; border-radius: 12px;">
                    <i class="fa-solid fa-gear"></i> 立即配置
                </button>
            </div>
        `;
    },

    /**
     * 渲染完整的天气详情面板
     * @param {HTMLElement} details - 详情面板 DOM 元素
     */
    renderDetailsPanel(details) {
        const d = weatherData;
        const forecastHtml = d.daily.map(f => `
            <div class="weather-forecast-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <span style="flex: 1;">${f.weekday}</span>
                <i class="fa-solid ${this.getWeatherIcon(f.weatherId)}" style="flex: 1; text-align: center; color: #ffeb3b;"></i>
                <span style="flex: 1; text-align: right; font-weight: 500;">${f.tempMax}° / ${f.tempMin}°</span>
            </div>
        `).join('');

        const rainWarning = d.rainProb > 30 ? 
            `<div class="weather-rain-warning" style="background: rgba(255, 82, 82, 0.1); padding: 10px; border-radius: 12px; margin-top: 10px; color: #ff5252;">
                <i class="fa-solid fa-umbrella"></i> 未来3小时可能有雨，出门记得带伞
            </div>` : 
            `<div style="font-size: 12px; opacity: 0.6; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 12px; margin-top: 10px;">
                <i class="fa-solid fa-check-circle" style="color: #4caf50;"></i> 未来3小时降雨概率较低
            </div>`;

        details.innerHTML = `
            <div class="weather-panel-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <span class="weather-panel-title" style="font-weight: bold; font-size: 16px;"><i class="fa-solid fa-location-dot"></i> ${d.city}</span>
                <button class="stats-close-btn" id="weatherSettingsInnerBtn" style="width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-gear" style="font-size: 14px;"></i>
                </button>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 18px; margin-bottom: 15px;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span style="font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #fff, #81d4fa); -webkit-background-clip: text; color: transparent;">${d.temp}°C</span>
                    <div style="text-align: right;">
                        <div style="font-weight: 600;">${d.description}</div>
                        <div style="font-size: 12px; opacity: 0.6;">湿度 ${d.humidity}%</div>
                    </div>
                </div>
            </div>
            ${rainWarning}
            <div style="margin-top: 20px;">
                <div style="font-size: 12px; opacity: 0.5; margin-bottom: 10px; font-weight: 600; letter-spacing: 1px;">PREDICTIONS</div>
                ${forecastHtml}
            </div>
            <div style="font-size: 10px; opacity: 0.3; margin-top: 15px; text-align: center;">
                数据来源 OpenWeatherMap • ${new Date(d.updatedAt).toLocaleTimeString()} 更新
            </div>
        `;
    },

    /**
     * 重新绑定详情面板内的设置入口按钮
     */
    bindSettingsBtn() {
        const btn = document.getElementById('weatherSettingsInnerBtn');
        if (btn) {
            btn.onclick = (e) => {
                e.stopPropagation();
                this.openSettings();
            };
        }
    },

    /**
     * 执行界面渲染主逻辑，根据数据状态分发到子模块
     */
    render() {
        console.log('[Weather] Rendering UI... Data:', weatherData ? 'Available' : 'Empty');
        const widget = document.getElementById('weather-widget');
        const details = document.getElementById('weather-details');
        
        if (!widget || !details) {
            console.error('[Weather] Critical: DOM elements missing!');
            return;
        }

        if (!weatherData) {
            this.renderEmptyDetails(details);
        } else {
            this.renderWidget(widget);
            this.renderDetailsPanel(details);
        }

        this.bindSettingsBtn();
    },

    /**
     * 渲染空状态（通常用于配置缺失时）
     */
    renderEmpty() {
        const widget = document.getElementById('weather-widget');
        if (widget) {
            widget.innerHTML = `<i class="fa-solid fa-cloud-sun weather-icon"></i> <span>配置天气</span>`;
        }
        this.render(); 
    },

    /**
     * 渲染错误状态（通常用于接口失败时）
     */
    renderError() {
        const widget = document.getElementById('weather-widget');
        if (widget) {
            widget.innerHTML = `<i class="fa-solid fa-circle-exclamation weather-icon" style="color: #ff5252;"></i> <span>获取失败</span>`;
        }
        this.render(); 
    },

    /**
     * 绑定天气模块相关的交互事件监听器
     */
    bindEvents() {
        const container = document.getElementById('weather-widget-container');
        const details = document.getElementById('weather-details');

        if (container) {
            // 使用事件委托：监听容器点击，判断是否点击了挂件或其子元素
            container.addEventListener('click', (e) => {
                const widget = e.target.closest('#weather-widget');
                if (widget) {
                    e.stopPropagation();
                    isWeatherPanelOpen = !isWeatherPanelOpen;
                    if (details) {
                        details.classList.toggle('active', isWeatherPanelOpen);
                        console.log('[Weather] Panel toggled via delegation:', isWeatherPanelOpen);
                    }
                }
            });
        }

        // 全局点击自动关闭面板（点击面板外部区域时触发）
        document.addEventListener('click', (e) => {
            if (isWeatherPanelOpen && container && !container.contains(e.target)) {
                isWeatherPanelOpen = false;
                if (details) details.classList.remove('active');
            }
        });

        // 天气设置模态框内部按钮事件
        const closeBtn = document.getElementById('weatherCloseBtn');
        const cancelBtn = document.getElementById('weatherCancelBtn');
        const saveBtn = document.getElementById('weatherSaveBtn');

        if (closeBtn) closeBtn.onclick = () => this.closeSettings();
        if (cancelBtn) cancelBtn.onclick = () => this.closeSettings();
        if (saveBtn) saveBtn.onclick = () => this.saveSettings();
        
        // 城市选择下拉框联动：选中“自定义”时显示输入框
        const citySelect = document.getElementById('weatherCitySelect');
        const customGroup = document.getElementById('weatherCustomCityGroup');
        if (citySelect && customGroup) {
            citySelect.onchange = () => {
                customGroup.style.display = citySelect.value === 'custom' ? 'block' : 'none';
            };
        }
    },

    /**
     * 打开并初始化天气设置模态框
     */
    openSettings() {
        const modal = document.getElementById('weatherModal');
        const citySelect = document.getElementById('weatherCitySelect');
        const customInput = document.getElementById('weatherCityInput');
        const apiInput = document.getElementById('weatherApiInput');
        const customGroup = document.getElementById('weatherCustomCityGroup');

        const currentCity = this.getCity();
        const currentKey = this.getApiKey();

        // 仅在用户使用了非默认 Key 时回显到输入框
        apiInput.value = currentKey === WeatherConfig.DEFAULT_API_KEY ? '' : currentKey;

        // 尝试匹配下拉框选项
        let matched = false;
        for (let i = 0; i < citySelect.options.length; i++) {
            if (citySelect.options[i].value === currentCity) {
                citySelect.selectedIndex = i;
                matched = true;
                break;
            }
        }

        // 如果没有预设匹配，则切换到自定义输入模式
        if (!matched) {
            citySelect.value = 'custom';
            customInput.value = currentCity;
            customGroup.style.display = 'block';
        } else {
            customGroup.style.display = 'none';
        }

        modal.style.display = 'flex';
    },

    /**
     * 关闭设置模态框
     */
    closeSettings() {
        document.getElementById('weatherModal').style.display = 'none';
    },

    /**
     * 校验并保存设置，然后触发重新加载
     */
    saveSettings() {
        const citySelect = document.getElementById('weatherCitySelect');
        const customInput = document.getElementById('weatherCityInput');
        const apiInput = document.getElementById('weatherApiInput');

        let city = citySelect.value;
        if (city === 'custom') {
            city = customInput.value.trim();
        }

        let key = apiInput.value.trim();
        // 如果为空，则自动回退到默认公开 Key
        if (!key) key = WeatherConfig.DEFAULT_API_KEY;

        if (!city) {
            alert('请输入城市名称');
            return;
        }

        // 持久化存储配置信息
        AppStorage.set(WeatherConfig.CITY_KEY, city);
        AppStorage.set(WeatherConfig.API_KEY_STORAGE, key);
        
        this.closeSettings();
        this.refresh(); // 立即按新配置获取一次天气
    }
};
