/**
 * 初始化交互式背景动画
 * 在 Canvas 上绘制跟随鼠标的粒子网络系统
 */
function initInteractiveBackground() {
    const canvas = document.getElementById('interactive-bg');
    const ctx = canvas.getContext('2d');

    /**
     * 根据窗口大小调整画布尺寸
     */
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 形变因子，用于实现粒子的呼吸/波动效果
    let deformationFactor = 0;
    let deformationSpeed = 0.002;

    /**
     * 粒子点类
     */
    class Point {
        /**
         * @param {number} index - 粒子索引
         * @param {number} total - 粒子总数
         */
        constructor(index, total) {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.size = Math.random() * 4 + 2;
            this.targetX = this.x;
            this.targetY = this.y;
            this.speed = Math.random() * 0.03 + 0.01;
            this.index = index;
            this.total = total;
            this.isSeparated = false; // 是否处于受惊散开状态
            this.separationTime = 0;
            this.separationDuration = Math.random() * 5000 + 3000;
        }

        /**
         * 更新粒子位置
         * @param {number} mouseX - 鼠标 X 坐标
         * @param {number} mouseY - 鼠标 Y 坐标
         * @param {number} mouseSpeed - 鼠标移动速度
         * @param {boolean} isMouseMoving - 鼠标是否正在移动
         * @param {boolean} isMouseOutside - 鼠标是否在窗口外
         */
        update(mouseX, mouseY, mouseSpeed, isMouseMoving, isMouseOutside) {
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const targetRadius = 100;

            if (isMouseOutside) {
                // 鼠标离开时，粒子随机漫游
                if (Math.random() < 0.005) {
                    this.targetX = Math.random() * canvas.width;
                    this.targetY = Math.random() * canvas.height;
                }
            } else if (isMouseMoving) {
                // 鼠标移动时，有概率触发“受惊”散开效果
                if (!this.isSeparated && Math.random() < 0.02) {
                    this.isSeparated = true;
                    this.separationTime = 0;

                    if (mouseSpeed > 50) {
                        // 快速移动时，粒子向四周边缘飞散
                        const direction = Math.random();
                        if (direction < 0.25) {
                            this.targetX = Math.random() * canvas.width;
                            this.targetY = 0 - this.size;
                        } else if (direction < 0.5) {
                            this.targetX = canvas.width + this.size;
                            this.targetY = Math.random() * canvas.height;
                        } else if (direction < 0.75) {
                            this.targetX = Math.random() * canvas.width;
                            this.targetY = canvas.height + this.size;
                        } else {
                            this.targetX = 0 - this.size;
                            this.targetY = Math.random() * canvas.height;
                        }
                    } else {
                        // 慢速移动时，粒子在周围散开
                        const angle = Math.random() * Math.PI * 2;
                        const separationDistance = Math.random() * 150 + 50;
                        this.targetX = mouseX + Math.cos(angle) * separationDistance;
                        this.targetY = mouseY + Math.sin(angle) * separationDistance;
                    }
                }
            } else if (!this.isSeparated) {
                // 鼠标静止时，粒子形成环绕圆环
                const angle = (this.index / this.total) * Math.PI * 2;
                const radius = targetRadius * (1 + 0.05 * Math.sin(deformationFactor + this.index * 0.1));
                this.targetX = mouseX + Math.cos(angle) * radius;
                this.targetY = mouseY + Math.sin(angle) * radius;
            }

            // 散开状态计时，结束后归位
            if (this.isSeparated && !isMouseOutside) {
                this.separationTime += 16;
                if (this.separationTime > this.separationDuration) {
                    const angle = (this.index / this.total) * Math.PI * 2;
                    const radius = targetRadius * (1 + 0.05 * Math.sin(deformationFactor + this.index * 0.1));
                    this.targetX = mouseX + Math.cos(angle) * radius;
                    this.targetY = mouseY + Math.sin(angle) * radius;
                    this.isSeparated = false;
                }
            }

            // 根据状态调整平滑移动速度
            let moveSpeed = this.speed;
            if (isMouseOutside) {
                moveSpeed = this.speed * 0.5;
            } else if (mouseSpeed > 50) {
                moveSpeed = this.speed * 0.5;
            } else if (mouseSpeed > 10) {
                moveSpeed = this.speed * 0.8;
            }

            // 平滑插值更新坐标
            this.x += (this.targetX - this.x) * moveSpeed;
            this.y += (this.targetY - this.y) * moveSpeed;
        }

        /**
         * 绘制单个粒子（使用预绘制的渐变模板）
         */
        draw() {
            const size = this.size * 2;
            ctx.drawImage(dotCanvas, this.x - this.size, this.y - this.size, size, size);
        }
    }

    const points = [];
    const numPoints = 50;
    for (let i = 0; i < numPoints; i++) {
        points.push(new Point(i, numPoints));
    }

    // 预绘制粒子径向渐变模板到离屏 Canvas，避免每帧每粒子重复创建 gradient 对象
    const dotSize = 6; // 最大粒子半径
    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = dotSize * 2;
    dotCanvas.height = dotSize * 2;
    const dotCtx = dotCanvas.getContext('2d');
    const dotGradient = dotCtx.createRadialGradient(dotSize, dotSize, 0, dotSize, dotSize, dotSize);
    dotGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    dotGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    dotCtx.fillStyle = dotGradient;
    dotCtx.beginPath();
    dotCtx.arc(dotSize, dotSize, dotSize, 0, Math.PI * 2);
    dotCtx.fill();

    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;
    let lastMouseX = mouseX;
    let lastMouseY = mouseY;
    let mouseSpeed = 0;
    let isMouseMoving = false;
    let mouseMoveTimer = null;
    let isMouseOutside = false;

    // 鼠标移动监听
    document.addEventListener('mousemove', (e) => {
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        mouseX = e.clientX;
        mouseY = e.clientY;

        const dx = mouseX - lastMouseX;
        const dy = mouseY - lastMouseY;
        mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        isMouseMoving = true;
        isMouseOutside = false;

        // 设置移动停止计时器
        clearTimeout(mouseMoveTimer);
        mouseMoveTimer = setTimeout(() => {
            isMouseMoving = false;
            mouseSpeed = 0;
        }, 300);
    });

    // 鼠标离开监听
    document.addEventListener('mouseleave', () => {
        isMouseOutside = true;
        mouseSpeed = 0;
        isMouseMoving = false;
        clearTimeout(mouseMoveTimer);
    });

    /**
     * 动画主循环
     */
    function animate() {
        if (!isPageVisible) {
            requestAnimationFrame(animate);
            return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 更新波动因子
        deformationFactor += deformationSpeed;
        if (deformationFactor > Math.PI * 2) {
            deformationFactor = 0;
        }

        // 更新并绘制所有点
        points.forEach(point => {
            point.update(mouseX, mouseY, mouseSpeed, isMouseMoving, isMouseOutside);
            point.draw();
        });

        // 绘制点之间的连接线（邻接矩阵）
        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                const dx = points[i].x - points[j].x;
                const dy = points[i].y - points[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // 距离小于阈值时绘制连线，透明度随距离增加而降低
                if (distance < 120) {
                    const opacity = 0.6 * (1 - distance / 120);
                    // 使用纯色替代 createLinearGradient，减少每帧对象分配
                    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(points[i].x, points[i].y);
                    ctx.lineTo(points[j].x, points[j].y);
                    ctx.stroke();
                }
            }
        }

        // 绘制鼠标中心光晕
        if (!isMouseOutside) {
            const centerGradient = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 10);
            centerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            centerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = centerGradient;
            ctx.beginPath();
            ctx.arc(mouseX, mouseY, 10, 0, Math.PI * 2);
            ctx.fill();
        }

        requestAnimationFrame(animate);
    }

    animate();
}
