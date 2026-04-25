/**
 * Weather Logic for Shadow's Homepage
 * Integrated with OpenWeatherMap API
 */

const WeatherConfig = {
    DEFAULT_API_KEY: 'bc47fd8b178e38e8488459bb5f0c4a5f',
    DEFAULT_CITY: 'Hangzhou,CN',
    API_BASE: 'https://api.openweathermap.org/data/2.5',
    CACHE_KEY: 'shadow_weather_cache',
    CITY_KEY: 'shadow_weather_city_v2',
    API_KEY_STORAGE: 'shadow_weather_apikey_v2',
    REFRESH_INTERVAL: 30 * 60 * 1000, // 30 minutes
    CACHE_TTL: 30 * 60 * 1000
};

const WEATHER_WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

let weatherData = null;
let weatherRefreshTimer = null;
let isWeatherPanelOpen = false;

const WeatherApp = {
    init() {
        console.log('[Weather] Initializing...');
        this.bindEvents();
        
        const cached = AppStorage.getJSON(WeatherConfig.CACHE_KEY, null);
        if (cached && (Date.now() - cached.updatedAt) < WeatherConfig.CACHE_TTL) {
            weatherData = cached;
            this.render();
        }
        
        this.refresh();
        
        if (weatherRefreshTimer) clearInterval(weatherRefreshTimer);
        weatherRefreshTimer = setInterval(() => this.refresh(), WeatherConfig.REFRESH_INTERVAL);
    },

    getApiKey() {
        return AppStorage.get(WeatherConfig.API_KEY_STORAGE, WeatherConfig.DEFAULT_API_KEY);
    },

    getCity() {
        return AppStorage.get(WeatherConfig.CITY_KEY, WeatherConfig.DEFAULT_CITY);
    },

    async refresh() {
        const city = this.getCity();
        const key = this.getApiKey();
        
        if (!key || !city) {
            console.warn('[Weather] API Key or City is missing.');
            this.renderEmpty();
            return;
        }

        try {
            const raw = await this.fetchData(city, key);
            if (raw) {
                weatherData = this.processData(raw);
                AppStorage.setJSON(WeatherConfig.CACHE_KEY, weatherData);
                this.render();
            }
        } catch (e) {
            console.error('[Weather] Refresh failed:', e);
            this.renderError();
        }
    },

    async fetchData(city, key) {
        // OpenWeatherMap 3-hour forecast also provides POP (Probability of Precipitation)
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

    processData(raw) {
        const { current, forecast } = raw;
        
        // Next 3 hours rain probability
        let rainProb = 0;
        if (forecast.list && forecast.list.length > 0) {
            // pop is a value between 0 and 1
            rainProb = Math.round((forecast.list[0].pop || 0) * 100);
        }

        // Process daily forecast (today and tomorrow)
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
                dailyMap[date].tempMax = Math.max(dailyMap[date].tempMax, item.main.temp_max);
                dailyMap[date].tempMin = Math.min(dailyMap[date].tempMin, item.main.temp_min);
                // Use afternoon weather for the icon
                const hour = parseInt(item.dt_txt.split(' ')[1]);
                if (hour >= 12 && hour <= 15) {
                    dailyMap[date].weatherId = item.weather[0].id;
                    dailyMap[date].description = item.weather[0].description;
                }
            }
        });

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

    formatWeekday(dateStr) {
        const d = new Date(dateStr.replace(/-/g, '/'));
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return '今日';
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        if (d.toDateString() === tomorrow.toDateString()) return '明日';
        return WEATHER_WEEKDAYS[d.getDay()];
    },

    getWeatherIcon(id) {
        if (id >= 200 && id < 300) return 'fa-cloud-bolt';
        if (id >= 300 && id < 400) return 'fa-cloud-rain';
        if (id >= 500 && id < 600) return 'fa-cloud-showers-heavy';
        if (id >= 600 && id < 700) return 'fa-snowflake';
        if (id >= 700 && id < 800) return 'fa-smog';
        if (id === 800) return 'fa-sun';
        if (id === 801) return 'fa-cloud-sun';
        if (id > 801) return 'fa-cloud';
        return 'fa-cloud';
    },

    render() {
        const widget = document.getElementById('weather-widget');
        const details = document.getElementById('weather-details');
        if (!widget || !details) return;

        if (!weatherData) {
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
            const btn = document.getElementById('weatherSettingsInnerBtn');
            if (btn) btn.onclick = (e) => { e.stopPropagation(); this.openSettings(); };
            return;
        }

        const d = weatherData;
        const icon = this.getWeatherIcon(d.weatherId);
        
        // Render Widget
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

        // Render Details
        let forecastHtml = d.daily.map(f => `
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

        const innerBtn = document.getElementById('weatherSettingsInnerBtn');
        if (innerBtn) innerBtn.onclick = (e) => {
            e.stopPropagation();
            this.openSettings();
        };
    },

    renderEmpty() {
        this.render(); // Let render handle the null data state
        const widget = document.getElementById('weather-widget');
        if (widget) {
            widget.innerHTML = `<i class="fa-solid fa-cloud-sun weather-icon"></i> <span>配置天气</span>`;
        }
    },

    renderError() {
        this.render(); // Let render handle the null data state
        const widget = document.getElementById('weather-widget');
        if (widget) {
            widget.innerHTML = `<i class="fa-solid fa-circle-exclamation weather-icon" style="color: #ff5252;"></i> <span>获取失败</span>`;
        }
    },

    bindEvents() {
        const container = document.getElementById('weather-widget-container');
        const widget = document.getElementById('weather-widget');
        const details = document.getElementById('weather-details');

        if (widget) {
            widget.onclick = (e) => {
                e.stopPropagation();
                isWeatherPanelOpen = !isWeatherPanelOpen;
                details.classList.toggle('active', isWeatherPanelOpen);
            };
        }

        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (isWeatherPanelOpen && !container.contains(e.target)) {
                isWeatherPanelOpen = false;
                details.classList.remove('active');
            }
        });

        // Settings Modal Events
        document.getElementById('weatherCloseBtn').onclick = () => this.closeSettings();
        document.getElementById('weatherCancelBtn').onclick = () => this.closeSettings();
        document.getElementById('weatherSaveBtn').onclick = () => this.saveSettings();
        
        const citySelect = document.getElementById('weatherCitySelect');
        const customGroup = document.getElementById('weatherCustomCityGroup');
        citySelect.onchange = () => {
            customGroup.style.display = citySelect.value === 'custom' ? 'block' : 'none';
        };
    },

    openSettings() {
        const modal = document.getElementById('weatherModal');
        const citySelect = document.getElementById('weatherCitySelect');
        const customInput = document.getElementById('weatherCityInput');
        const apiInput = document.getElementById('weatherApiInput');
        const customGroup = document.getElementById('weatherCustomCityGroup');

        const currentCity = this.getCity();
        const currentKey = this.getApiKey();

        apiInput.value = currentKey === WeatherConfig.DEFAULT_API_KEY ? '' : currentKey;

        // Try to match select value
        let matched = false;
        for (let i = 0; i < citySelect.options.length; i++) {
            if (citySelect.options[i].value === currentCity) {
                citySelect.selectedIndex = i;
                matched = true;
                break;
            }
        }

        if (!matched) {
            citySelect.value = 'custom';
            customInput.value = currentCity;
            customGroup.style.display = 'block';
        } else {
            customGroup.style.display = 'none';
        }

        modal.style.display = 'flex';
    },

    closeSettings() {
        document.getElementById('weatherModal').style.display = 'none';
    },

    saveSettings() {
        const citySelect = document.getElementById('weatherCitySelect');
        const customInput = document.getElementById('weatherCityInput');
        const apiInput = document.getElementById('weatherApiInput');

        let city = citySelect.value;
        if (city === 'custom') {
            city = customInput.value.trim();
        }

        let key = apiInput.value.trim();
        if (!key) key = WeatherConfig.DEFAULT_API_KEY;

        if (!city) {
            alert('请输入城市名称');
            return;
        }

        AppStorage.set(WeatherConfig.CITY_KEY, city);
        AppStorage.set(WeatherConfig.API_KEY_STORAGE, key);
        
        this.closeSettings();
        this.refresh();
    }
};
