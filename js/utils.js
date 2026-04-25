function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function sanitizeHTML(html) {
    const allowedTags = ['BR', 'B', 'I', 'EM', 'STRONG', 'SPAN'];
    const allowedAttrs = ['class', 'style'];
    const temp = document.createElement('div');
    temp.innerHTML = html;

    function walk(node) {
        const children = Array.from(node.childNodes);
        children.forEach(function (child) {
            if (child.nodeType === Node.ELEMENT_NODE) {
                if (!allowedTags.includes(child.tagName)) {
                    const text = document.createTextNode(child.textContent);
                    node.replaceChild(text, child);
                } else {
                    Array.from(child.attributes).forEach(function (attr) {
                        if (!allowedAttrs.includes(attr.name)) {
                            child.removeAttribute(attr.name);
                        }
                        if ((attr.name === 'href' || attr.name === 'src') &&
                            attr.value.trim().toLowerCase().startsWith('javascript:')) {
                            child.removeAttribute(attr.name);
                        }
                    });
                    walk(child);
                }
            }
        });
    }

    walk(temp);
    return temp.innerHTML;
}

function safeParseJSON(str, fallback) {
    if (str === null || str === undefined) return fallback;
    try {
        return JSON.parse(str);
    } catch (e) {
        console.warn('JSON parse failed, using fallback:', e);
        return fallback;
    }
}

function safeParseInt(str, fallback) {
    if (str === null || str === undefined) return fallback;
    var n = parseInt(str, 10);
    return isNaN(n) ? fallback : n;
}

function getStorageItem(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value;
    } catch (error) {
        console.warn(`Failed to read localStorage key "${key}":`, error);
        return fallback;
    }
}

function setStorageItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.warn(`Failed to write localStorage key "${key}":`, error);
        return false;
    }
}

function validateAppData(data) {
    if (!Array.isArray(data)) return false;
    return data.every(function (cat) {
        return cat &&
            typeof cat.category === 'string' &&
            Array.isArray(cat.links) &&
            cat.links.every(function (link) {
                return link &&
                    typeof link.name === 'string' &&
                    typeof link.url === 'string';
            });
    });
}

function validateCountdownData(data) {
    if (!Array.isArray(data)) return false;
    return data.every(function (item) {
        return item &&
            typeof item.name === 'string' &&
            typeof item.type === 'string';
    });
}

function hasLunarSupport() {
    return Boolean(
        window.Lunar &&
        typeof window.Lunar.fromDate === 'function' &&
        typeof window.Lunar.fromYmd === 'function'
    );
}

function isFontAwesomeAvailable() {
    const probe = document.createElement('i');
    probe.className = 'fa-solid fa-star';
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    document.body.appendChild(probe);

    const fontFamily = window.getComputedStyle(probe).fontFamily || '';
    probe.remove();
    return /Font Awesome/i.test(fontFamily);
}

function loadScript(url) {
    return new Promise((resolve, reject) => {
        const scripts = document.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
            if (scripts[i].src.includes(url)) {
                resolve();
                return;
            }
        }

        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });
}
