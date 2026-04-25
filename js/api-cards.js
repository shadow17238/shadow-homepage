const HITOKOTO_API = 'https://international.v1.hitokoto.cn/';
const NASA_APOD_API = 'https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&thumbs=true';
const HITOKOTO_CACHE_KEY = 'shadow_hitokoto_cache';
const APOD_CACHE_KEY = 'shadow_apod_cache';
const HITOKOTO_CACHE_TTL = 30 * 60 * 1000;
const APOD_CACHE_TTL = 12 * 60 * 60 * 1000;
const HITOKOTO_FALLBACK = '\u7eb5\u5bb9\u7684 \u559c\u6b22\u7684 \u8ba8\u538c\u7684 \u5ba0\u6eba\u7684 \u538c\u5026\u7684<br>\u4e00\u4e2a\u4e2a\u6162\u6162\u6697\u6de1';

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

    const from = data.from ? `\u2014 ${data.from}` : '\u2014 \u4e00\u8a00';
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
    return `${value.slice(0, length - 1)}\u2026`;
}

function renderApod(data) {
    const card = document.getElementById('apod-card');
    const title = document.getElementById('apodTitle');
    const desc = document.getElementById('apodDesc');
    const date = document.getElementById('apodDate');
    if (!card || !title || !desc || !date) return;

    if (!data) {
        title.textContent = '\u4eca\u65e5\u5929\u6587\u56fe';
        desc.textContent = '\u6682\u65f6\u65e0\u6cd5\u83b7\u53d6 NASA APOD';
        date.textContent = 'NASA APOD';
        card.style.removeProperty('--apod-image');
        card.classList.add('is-fallback');
        card.href = 'https://apod.nasa.gov/apod/';
        return;
    }

    title.textContent = truncate(data.title || '\u4eca\u65e5\u5929\u6587\u56fe', 48);
    desc.textContent = truncate(data.explanation || '\u70b9\u51fb\u67e5\u770b NASA \u4eca\u65e5\u5929\u6587\u56fe\u3002', 88);
    date.textContent = formatApodDate(data.date);
    card.href = data.url || data.hdurl || 'https://apod.nasa.gov/apod/';
    card.classList.remove('is-fallback');

    const imageUrl = data.media_type === 'image' ? (data.url || data.hdurl) : (data.thumbnail_url || '');
    if (imageUrl) {
        card.style.setProperty('--apod-image', `url("${imageUrl}")`);
    } else {
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
            const data = {
                title: payload.title,
                explanation: payload.explanation,
                date: payload.date,
                url: payload.url,
                hdurl: payload.hdurl,
                media_type: payload.media_type,
                thumbnail_url: payload.thumbnail_url
            };
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

    refreshHitokoto() {
        this.loadHitokoto(true);
    },

    refreshApod() {
        this.loadApod();
    }
};
