
const HITOKOTO_API = 'https://international.v1.hitokoto.cn/';
const NASA_APOD_API = 'https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&thumbs=true';
const HITOKOTO_CACHE_KEY = 'shadow_hitokoto_cache';
const APOD_CACHE_KEY = 'shadow_apod_cache';
const HITOKOTO_CACHE_TTL = 30 * 60 * 1000;
const APOD_CACHE_TTL = 12 * 60 * 60 * 1000;
const HITOKOTO_FALLBACK = '纵容�?喜欢�?讨厌�?宠溺�?厌倦的<br>一个个慢慢暗淡';

function isFresh(data, ttl) {
    return Boolean(data && data.updatedAt && (Date.now() - data.updatedAt) < ttl);
}

function getCache(key) {
    return AppStorage.getJSON(key, null);
}

function setCache(key, value) {
    AppStorage.setJSON(key, Object.assign({}, value, { updatedAt: Date.now() }));
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
}

function renderHitokoto(data) {
    const audioText = document.getElementById('audioText');
    if (!audioText) return;
    if (!data || !data.hitokoto) {
        audioText.innerHTML = HITOKOTO_FALLBACK;
        audioText.title = '';
        return;
    }
    const from = data.from ? `—�?${data.from}` : '—�?一言';
    audioText.innerHTML = `${escapeHtml(data.hitokoto)}<br><span class="audio-text-source">${escapeHtml(from)}</span>`;
    audioText.title = data.from_who ? `${data.from} / ${data.from_who}` : from;
}

function formatApodDate(dateString) {
    if (!dateString) return 'NASA APOD';
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function truncate(value, length) {
    if (!value) return '';
    if (value.length <= length) return value;
    return `${value.slice(0, length - 1)}…`;
}

function renderApod(data) {
    const card = document.getElementById('apod-card');
    const title = document.getElementById('apodTitle');
    const desc = document.getElementById('apodDesc');
    const date = document.getElementById('apodDate');
    if (!card || !title || !desc || !date) return;

    if (!data) {
        title.textContent = '今日天文�?;
        desc.textContent = '暂时无法获取 NASA APOD';
        date.textContent = 'NASA APOD';
        card.style.removeProperty('--apod-image');
        card.classList.add('is-fallback');
        card.href = 'https://apod.nasa.gov/apod/';
        return;
    }

    title.textContent = truncate(data.title || '今日天文�?, 48);
    desc.textContent = truncate(data.explanation || '点击查看 NASA 今日天文图�?, 88);
    date.textContent = formatApodDate(data.date);
    card.href = data.url || data.hdurl || 'https://apod.nasa.gov/apod/';
    card.classList.remove('is-fallback');
    const imageUrl = data.media_type === 'image' ? (data.url || data.hdurl) : (data.thumbnail_url || '');
    if (imageUrl) card.style.setProperty('--apod-image', `url("${imageUrl}")`);
    else {
        card.style.removeProperty('--apod-image');
        card.classList.add('is-fallback');
    }
}

const ApiCards = {
    async loadHitokoto(force = false) {
        const cached = getCache(HITOKOTO_CACHE_KEY);
        if (!force && isFresh(cached, HITOKOTO_CACHE_TTL)) {
            renderHitokoto(cached);
            return;
        }
        try {
            const response = await fetch(HITOKOTO_API, { cache: 'no-store' });
            if (!response.ok) throw new Error(`Hitokoto ${response.status}`);
            const payload = await response.json();
            const data = { hitokoto: payload.hitokoto, from: payload.from, from_who: payload.from_who };
            setCache(HITOKOTO_CACHE_KEY, data);
            renderHitokoto(data);
        } catch (error) {
            console.error('[Hitokoto]', error);
            renderHitokoto(cached);
        }
    },

    async loadApod() {
        const cached = getCache(APOD_CACHE_KEY);
        if (isFresh(cached, APOD_CACHE_TTL)) {
            renderApod(cached);
            return;
        }
        try {
            const response = await fetch(NASA_APOD_API, { cache: 'no-store' });
            if (!response.ok) throw new Error(`NASA APOD ${response.status}`);
            const payload = await response.json();
            const data = { title: payload.title, explanation: payload.explanation, date: payload.date, url: payload.url, hdurl: payload.hdurl, media_type: payload.media_type, thumbnail_url: payload.thumbnail_url };
            setCache(APOD_CACHE_KEY, data);
            renderApod(data);
        } catch (error) {
            console.error('[NASA APOD]', error);
            renderApod(cached);
        }
    },

    init() {
        this.loadHitokoto();
        this.loadApod();
    },

    refreshHitokoto() { this.loadHitokoto(true); },
    refreshApod() { this.loadApod(); }
};
