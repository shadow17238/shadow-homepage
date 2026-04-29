/**
 * 绘制音频可视化动画
 * 通过 Web Audio API 获取频率数据并渲染到 Canvas 上
 */
function drawVisualizer() {
    // 递归调用以实现持续动画
    animationId = requestAnimationFrame(drawVisualizer);

    // 页面不可见时跳过渲染，节省 CPU
    if (!isPageVisible) return;

    // 获取当前频率数据
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 获取当前主题的强调色
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
    
    // 计算总音量，用于控制文字透明度呼吸效果
    let totalVolume = 0;
    for (let i = 0; i < 80; i++) totalVolume += dataArray[i];

    // 根据音量调整文字透明度
    const textField = document.getElementById('audioText');
    if (textField) {
        let opacity = 1 - (Math.max(0, totalVolume - 500) / 3000);
        if (opacity < 0) opacity = 0;
        textField.style.opacity = opacity;
    }

    // 绘制跳动的频谱条
    const bars = 60;
    const barWidth = 4;
    const gap = 4;

    ctx.fillStyle = accentColor;
    ctx.strokeStyle = accentColor;

    for (let i = 0; i < bars; i++) {
        let value = dataArray[i];
        let barHeight = (value / 255) * 60;

        if (barHeight > 2) {
            // 绘制上方实体条
            ctx.globalAlpha = 0.6;
            ctx.fillRect(centerX + i * (barWidth + gap), height / 2 + 20 - barHeight, barWidth, barHeight);
            ctx.fillRect(centerX - (i + 1) * (barWidth + gap), height / 2 + 20 - barHeight, barWidth, barHeight);

            // 绘制下方倒影条
            ctx.globalAlpha = 0.2;
            ctx.fillRect(centerX + i * (barWidth + gap), height / 2 + 20, barWidth, barHeight * 0.5);
            ctx.fillRect(centerX - (i + 1) * (barWidth + gap), height / 2 + 20, barWidth, barHeight * 0.5);
        }
    }

    // 绘制顶部的平滑包络线
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const baseLineY = height / 2 + 20;

    // 绘制左侧曲线
    for (let i = bars; i >= 0; i--) {
        let value = dataArray[i];
        let h = (value / 255) * 60 + 5;
        let x = centerX - i * (barWidth + gap) - (barWidth / 2);
        let y = baseLineY - h;
        if (i === bars) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }

    // 绘制右侧曲线
    for (let i = 0; i < bars; i++) {
        let value = dataArray[i];
        let h = (value / 255) * 60 + 5;
        let x = centerX + i * (barWidth + gap) + (barWidth / 2);
        let y = baseLineY - h;
        ctx.lineTo(x, y);
    }

    ctx.stroke();
}

/**
 * 绘制静态水平线
 * 在可视化关闭时显示，保持界面美观
 */
function drawStaticLine() {
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;

    const y = height / 2 + 20;
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    // 恢复文字透明度
    const textField = document.getElementById('audioText');
    if (textField) textField.style.opacity = '1';
}

// 懒初始化摄像头窗口相关的 DOM 元素，避免脚本解析阶段依赖 DOM 就绪
let cameraWin, cameraHeader, recordBtn, timerDisplay;
function cacheMediaDOM() {
    if (cameraWin) return;
    cameraWin = document.getElementById('camera-window');
    cameraHeader = document.getElementById('camera-header');
    recordBtn = document.getElementById('recordBtn');
    timerDisplay = document.getElementById('record-timer');
}

/**
 * 开始录制摄像头视频
 */
function startRecording() {
    cacheMediaDOM();
    if (!cameraStream) return;

    recordedChunks = [];
    // 优先尝试录制为 MP4，否则回退到 WebM
    let options = { mimeType: 'video/webm;codecs=vp9' };
    if (MediaRecorder.isTypeSupported('video/mp4')) {
        options = { mimeType: 'video/mp4' };
    }

    try {
        mediaRecorder = new MediaRecorder(cameraStream, options);
    } catch (e) {
        console.warn('当前设置不支持，尝试默认设置');
        mediaRecorder = new MediaRecorder(cameraStream);
    }

    // 监听数据块可用事件
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    // 录制停止时执行导出
    mediaRecorder.onstop = exportVideo;
    mediaRecorder.start();
    isRecording = true;

    // 更新 UI 状态
    recordBtn.classList.add('recording');
    timerDisplay.style.display = 'block';
    startTimer();
}

/**
 * 停止录制
 */
function stopRecording() {
    cacheMediaDOM();
    if (mediaRecorder) {
        mediaRecorder.stop();
    }
    isRecording = false;
    recordBtn.classList.remove('recording');
    timerDisplay.style.display = 'none';
    stopTimer();
}

/**
 * 导出录制的视频文件
 */
function exportVideo() {
    const mimeType = mediaRecorder && mediaRecorder.mimeType ? mediaRecorder.mimeType : 'video/webm';
    const blob = new Blob(recordedChunks, {
        type: mimeType
    });

    const now = new Date();
    const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const fileName = `Camera_${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}-${now.getMinutes()}.${extension}`;

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    // 清理资源
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
}

/**
 * 启动录制计时器
 */
function startTimer() {
    let seconds = 0;
    timerDisplay.innerText = '00:00';
    recordTimerInterval = setInterval(() => {
        seconds++;
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        timerDisplay.innerText = `${m}:${s}`;
    }, 1000);
}

/**
 * 停止计时器
 */
function stopTimer() {
    clearInterval(recordTimerInterval);
    timerDisplay.innerText = '00:00';
}

/**
 * 关闭摄像头并重置状态
 */
function closeCamera() {
    cacheMediaDOM();
    const videoEl = document.getElementById('camera-feed');
    const btn = document.getElementById('cameraBtn');

    if (isRecording) {
        stopRecording();
    }

    // 停止所有媒体轨道（关闭物理摄像头）
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    videoEl.srcObject = null;
    cameraWin.style.display = 'none';
    btn.classList.remove('active');
}

/**
 * 切换摄像头窗口最小化状态
 */
function toggleCameraMin() {
    cacheMediaDOM();
    if (cameraWin) cameraWin.classList.toggle('minimized');
}
