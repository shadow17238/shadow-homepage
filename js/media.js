function drawVisualizer() {
    animationId = requestAnimationFrame(drawVisualizer);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;

    ctx.clearRect(0, 0, width, height);

    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
    let totalVolume = 0;
    for (let i = 0; i < 80; i++) totalVolume += dataArray[i];

    const textField = document.getElementById('audioText');
    if (textField) {
        let opacity = 1 - (Math.max(0, totalVolume - 500) / 3000);
        if (opacity < 0) opacity = 0;
        textField.style.opacity = opacity;
    }

    const bars = 60;
    const barWidth = 4;
    const gap = 4;

    ctx.fillStyle = accentColor;
    ctx.strokeStyle = accentColor;

    for (let i = 0; i < bars; i++) {
        let value = dataArray[i];
        let barHeight = (value / 255) * 60;

        if (barHeight > 2) {
            ctx.globalAlpha = 0.6;
            ctx.fillRect(centerX + i * (barWidth + gap), height / 2 + 20 - barHeight, barWidth, barHeight);
            ctx.fillRect(centerX - (i + 1) * (barWidth + gap), height / 2 + 20 - barHeight, barWidth, barHeight);

            ctx.globalAlpha = 0.2;
            ctx.fillRect(centerX + i * (barWidth + gap), height / 2 + 20, barWidth, barHeight * 0.5);
            ctx.fillRect(centerX - (i + 1) * (barWidth + gap), height / 2 + 20, barWidth, barHeight * 0.5);
        }
    }

    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const baseLineY = height / 2 + 20;

    for (let i = bars; i >= 0; i--) {
        let value = dataArray[i];
        let h = (value / 255) * 60 + 5;
        let x = centerX - i * (barWidth + gap) - (barWidth / 2);
        let y = baseLineY - h;
        if (i === bars) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }

    for (let i = 0; i < bars; i++) {
        let value = dataArray[i];
        let h = (value / 255) * 60 + 5;
        let x = centerX + i * (barWidth + gap) + (barWidth / 2);
        let y = baseLineY - h;
        ctx.lineTo(x, y);
    }

    ctx.stroke();
}

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

    const textField = document.getElementById('audioText');
    if (textField) textField.style.opacity = '1';
}

const cameraWin = document.getElementById('camera-window');
const cameraHeader = document.getElementById('camera-header');
const recordBtn = document.getElementById('recordBtn');
const timerDisplay = document.getElementById('record-timer');

function startRecording() {
    if (!cameraStream) return;

    recordedChunks = [];
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

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = exportVideo;
    mediaRecorder.start();
    isRecording = true;

    recordBtn.classList.add('recording');
    timerDisplay.style.display = 'block';
    startTimer();
}

function stopRecording() {
    if (mediaRecorder) {
        mediaRecorder.stop();
    }
    isRecording = false;
    recordBtn.classList.remove('recording');
    timerDisplay.style.display = 'none';
    stopTimer();
}

function exportVideo() {
    const mimeType = mediaRecorder && mediaRecorder.mimeType ? mediaRecorder.mimeType : 'video/webm';
    const blob = new Blob(recordedChunks, {
        type: mimeType
    });

    const now = new Date();
    const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const fileName = `Camera_${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}-${now.getMinutes()}.${extension}`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
}

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

function stopTimer() {
    clearInterval(recordTimerInterval);
    timerDisplay.innerText = '00:00';
}

function closeCamera() {
    const videoEl = document.getElementById('camera-feed');
    const btn = document.getElementById('cameraBtn');

    if (isRecording) {
        stopRecording();
    }

    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    videoEl.srcObject = null;
    cameraWin.style.display = 'none';
    btn.classList.remove('active');
}

function toggleCameraMin() {
    cameraWin.classList.toggle('minimized');
}
