/**
 * 转义 HTML 字符串，防止 XSS 攻击
 * @param {string} str - 需要转义的原始字符串
 * @return {string} 转义后的 HTML 字符串
 */
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * 深拷贝一个对象或数组
 * @param {any} value - 需要深拷贝的值
 * @return {any} 拷贝后的新值
 */
function deepClone(value) {
    try {
        // 优先使用原生的 structuredClone 方法
        if (typeof structuredClone === 'function') {
            return structuredClone(value);
        }
        // 回退到 JSON 序列化/反序列化方法
        return JSON.parse(JSON.stringify(value));
    } catch (e) {
        return JSON.parse(JSON.stringify(value));
    }
}

/**
 * 将总秒数格式化为 HH:MM:SS 格式
 * @param {number} totalSeconds - 总秒数
 * @return {string} 格式化后的时间字符串
 */
function formatDuration(totalSeconds) {
    const safeSeconds = Math.max(0, totalSeconds || 0);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * 将总秒数格式化为可读的文字描述（如 X 小时 Y 分）
 * @param {number} totalSeconds - 总秒数
 * @return {string} 格式化后的描述字符串
 */
function formatDurationLabel(totalSeconds) {
    const safeSeconds = Math.max(0, totalSeconds || 0);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);

    if (hours > 0) return `${hours} 小时 ${minutes} 分`;
    return `${Math.max(0, minutes)} 分钟`;
}

/**
 * 安全地解析 JSON 字符串
 * @param {string} str - 待解析的 JSON 字符串
 * @param {any} fallback - 解析失败时的回退值
 * @return {any} 解析后的对象或回退值
 */
function safeParseJSON(str, fallback) {
    if (str === null || str === undefined) return fallback;
    try {
        return JSON.parse(str);
    } catch (e) {
        console.warn('JSON parse failed, using fallback:', e);
        return fallback;
    }
}

/**
 * 安全地解析整数
 * @param {string|number} str - 待解析的字符串或数字
 * @param {number} fallback - 解析失败时的回退值
 * @return {number} 解析后的整数或回退值
 */
function safeParseInt(str, fallback) {
    if (str === null || str === undefined) return fallback;
    var n = parseInt(str, 10);
    return isNaN(n) ? fallback : n;
}

/**
 * 获取 localStorage 中的项，并提供回退值
 * @param {string} key - 键名
 * @param {string|null} fallback - 回退值
 * @return {string|null} 存储的值或回退值
 */
function getStorageItem(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value;
    } catch (error) {
        console.warn(`Failed to read localStorage key "${key}":`, error);
        return fallback;
    }
}

/**
 * 设置 localStorage 中的项
 * @param {string} key - 键名
 * @param {string} value - 键值
 * @return {boolean} 是否保存成功
 */
function setStorageItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.warn(`Failed to write localStorage key "${key}":`, error);
        return false;
    }
}

/**
 * 校验应用程序链接数据格式是否正确
 * @param {any} data - 待校验的数据
 * @return {boolean} 是否通过校验
 */
function validateAppData(data) {
    if (!Array.isArray(data)) return false;
    return data.every(function (cat) {
        // 校验分类对象及其链接列表
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

/**
 * 校验倒计时数据格式是否正确
 * @param {any} data - 待校验的数据
 * @return {boolean} 是否通过校验
 */
function validateCountdownData(data) {
    if (!Array.isArray(data)) return false;
    return data.every(function (item) {
        // 校验倒计时项的名称和类型
        return item &&
            typeof item.name === 'string' &&
            typeof item.type === 'string';
    });
}

/**
 * 检查环境是否支持农历转换库 (lunar.js)
 * @return {boolean} 是否支持
 */
function hasLunarSupport() {
    return Boolean(
        window.Lunar &&
        typeof window.Lunar.fromDate === 'function' &&
        typeof window.Lunar.fromYmd === 'function'
    );
}

/**
 * 检查 Font Awesome 图标库是否已成功加载
 * @return {boolean} 是否加载成功
 */
function isFontAwesomeAvailable() {
    // 创建一个探测元素
    const probe = document.createElement('i');
    probe.className = 'fa-solid fa-star';
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    document.body.appendChild(probe);

    // 检查探测元素的字体系列
    const fontFamily = window.getComputedStyle(probe).fontFamily || '';
    probe.remove();
    return /Font Awesome/i.test(fontFamily);
}

/**
 * 动态加载外部 JavaScript 脚本
 * @param {string} url - 脚本链接
 * @return {Promise<void>} 加载结果的 Promise
 */
function loadScript(url) {
    return new Promise((resolve, reject) => {
        // 检查是否已经加载过该脚本
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

/**
 * 加载脚本时在按钮上显示加载动画
 * @param {HTMLElement} btn - 触发加载的按钮元素
 * @param {string} scriptUrl - 脚本链接
 * @param {string} checkSymbol - 检查脚本是否已加载的全局变量名
 * @return {Promise<void>}
 */
async function loadWithSpinner(btn, scriptUrl, checkSymbol) {
    // 如果变量已存在，说明已加载
    if (typeof window[checkSymbol] !== 'undefined') return;

    const originalIcon = btn.innerHTML;
    // 切换为加载图标
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    try {
        await loadScript(scriptUrl);
    } catch (e) {
        console.error(`Failed to load script: ${scriptUrl}`, e);
    } finally {
        // 恢复原始按钮内容
        btn.innerHTML = originalIcon;
    }
}

/**
 * 初始化模态框，点击遮罩层时自动关闭
 * @param {string} modalId - 模态框 ID
 * @param {Function} closeFn - 关闭回调函数
 */
function initModalCloseOnOverlayClick(modalId, closeFn) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    let isPointerDownOnOverlay = false;
    // 记录按下时是否在遮罩层上
    modal.addEventListener('pointerdown', (e) => {
        isPointerDownOnOverlay = (e.target === modal);
    });

    // 只有在按下和松开都在遮罩层上时才触发关闭，防止内部拖拽误触发
    modal.addEventListener('click', (e) => {
        if (isPointerDownOnOverlay && e.target === modal) {
            closeFn();
        }
        isPointerDownOnOverlay = false;
    });
}

/**
 * 全局共享的星期名称数组
 */
const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

